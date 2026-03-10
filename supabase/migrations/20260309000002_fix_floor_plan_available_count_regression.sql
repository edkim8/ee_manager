-- Fix: Restore pipeline-based available_units count in view_floor_plan_pricing_summary.
--
-- Root cause: Migration 20260303000001_add_base_rent_to_floor_plan_pricing_summary.sql
-- accidentally reverted from the pipeline-based count (20260216000001) back to the simple
-- units.availability_status filter. The two sources disagree:
--   - units.availability_status = 'Available'   -- stale; only updated by solver writes
--   - view_leasing_pipeline.status = 'Available' -- live; reflects current tenancy state
--
-- The pipeline count matches what the floor plans pricing page shows in its Available Units
-- table (which also queries view_leasing_pipeline). This migration makes the button badge
-- ("24 Avail / 24 Units") consistent with the table below.
--
-- base_rent (added by 20260303000001) is preserved.

CREATE OR REPLACE VIEW public.view_floor_plan_pricing_summary AS
WITH pipeline_counts AS (
    SELECT
        u.floor_plan_id,
        COUNT(*) FILTER (WHERE vlp.status = 'Available') AS available_count
    FROM public.units u
    LEFT JOIN public.view_leasing_pipeline vlp ON u.id = vlp.unit_id
    WHERE u.floor_plan_id IS NOT NULL
    GROUP BY u.floor_plan_id
)
SELECT
    fp.id                                                                            AS floor_plan_id,
    fp.property_code,
    fp.code                                                                          AS floor_plan_code,
    fp.marketing_name                                                                AS floor_plan_name,
    COUNT(u.id)                                                                      AS total_units,
    COALESCE(pc.available_count, 0)                                                  AS available_units,
    COALESCE(AVG(vupa.calculated_market_rent), 0)                                   AS avg_market_rent,
    COALESCE(AVG(vupa.calculated_offered_rent), 0)                                  AS avg_offered_rent,
    COALESCE(AVG(vupa.calculated_offered_rent) - AVG(vupa.calculated_market_rent), 0) AS rent_discrepancy,
    fp.market_base_rent                                                              AS base_rent
FROM public.floor_plans fp
LEFT JOIN public.units u            ON fp.id = u.floor_plan_id
LEFT JOIN pipeline_counts pc        ON fp.id = pc.floor_plan_id
LEFT JOIN public.view_unit_pricing_analysis vupa ON u.id = vupa.unit_id
GROUP BY fp.id, fp.property_code, fp.code, fp.marketing_name, fp.market_base_rent, pc.available_count;

GRANT SELECT ON public.view_floor_plan_pricing_summary TO authenticated, service_role;
