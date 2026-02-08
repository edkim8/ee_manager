-- Migration: Floor Plan Pricing Summary View
-- Date: 2026-02-06
-- Description: Aggregates unit-level pricing analysis to the floor plan level.

CREATE OR REPLACE VIEW public.view_floor_plan_pricing_summary AS
SELECT
    fp.id as floor_plan_id,
    fp.property_code,
    fp.code as floor_plan_code,
    fp.marketing_name as floor_plan_name,
    COUNT(u.id) as total_units,
    COUNT(u.id) FILTER (WHERE u.availability_status = 'Available') as available_units,
    COALESCE(AVG(vupa.calculated_market_rent), 0) as avg_market_rent,
    COALESCE(AVG(vupa.calculated_offered_rent), 0) as avg_offered_rent,
    COALESCE(AVG(vupa.calculated_offered_rent) - AVG(vupa.calculated_market_rent), 0) as rent_discrepancy
FROM public.floor_plans fp
LEFT JOIN public.units u ON fp.id = u.floor_plan_id
LEFT JOIN public.view_unit_pricing_analysis vupa ON u.id = vupa.unit_id
GROUP BY fp.id, fp.property_code, fp.code, fp.marketing_name;

-- Grant access
GRANT SELECT ON public.view_floor_plan_pricing_summary TO authenticated;
