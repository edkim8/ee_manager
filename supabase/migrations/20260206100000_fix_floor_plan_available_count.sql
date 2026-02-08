-- Migration: Fix Floor Plan Available Units Count
-- Date: 2026-02-06
-- Description: Fix available_units count to match view_leasing_pipeline status

CREATE OR REPLACE VIEW public.view_floor_plan_pricing_summary AS
WITH pipeline_counts AS (
    SELECT
        u.floor_plan_id,
        COUNT(*) FILTER (WHERE vlp.status = 'Available') as available_count
    FROM public.units u
    LEFT JOIN public.view_leasing_pipeline vlp ON u.id = vlp.unit_id
    WHERE u.floor_plan_id IS NOT NULL
    GROUP BY u.floor_plan_id
)
SELECT
    fp.id as floor_plan_id,
    fp.property_code,
    fp.code as floor_plan_code,
    fp.marketing_name as floor_plan_name,
    COUNT(u.id) as total_units,
    COALESCE(pc.available_count, 0) as available_units,
    COALESCE(AVG(vupa.calculated_market_rent), 0) as avg_market_rent,
    COALESCE(AVG(vupa.calculated_offered_rent), 0) as avg_offered_rent,
    COALESCE(AVG(vupa.calculated_offered_rent) - AVG(vupa.calculated_market_rent), 0) as rent_discrepancy
FROM public.floor_plans fp
LEFT JOIN public.units u ON fp.id = u.floor_plan_id
LEFT JOIN pipeline_counts pc ON fp.id = pc.floor_plan_id
LEFT JOIN public.view_unit_pricing_analysis vupa ON u.id = vupa.unit_id
GROUP BY fp.id, fp.property_code, fp.code, fp.marketing_name, pc.available_count;

-- Grant access
GRANT SELECT ON public.view_floor_plan_pricing_summary TO authenticated;
