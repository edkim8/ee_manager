-- Migration: Amenities Pricing Views
-- Date: 2026-02-05
-- Description: Creates views for calculating Market Rent and Offered Rent based on Fixed vs Temporary amenities.

CREATE OR REPLACE VIEW public.view_unit_pricing_analysis AS
WITH amenity_sums AS (
    SELECT
        ua.unit_id,
        COALESCE(SUM(CASE WHEN a.type = 'fixed' THEN a.amount ELSE 0 END), 0) as total_fixed_amenities,
        COALESCE(SUM(CASE WHEN a.type != 'fixed' THEN a.amount ELSE 0 END), 0) as total_temp_amenities
    FROM public.unit_amenities ua
    JOIN public.amenities a ON ua.amenity_id = a.id
    WHERE ua.active = true AND a.active = true
    GROUP BY ua.unit_id
)
SELECT
    u.id as unit_id,
    u.unit_name,
    u.property_code,
    -- Assuming floor_plans table has base_rent. 
    -- If it doesn't exist, we fallback to a placeholder or join if possible.
    -- Based on legacy: Market Rent = Base Rent + Fixed Amenities
    -- For now we use availabilities.rent_market as a reference if base_rent is not directly available on unit
    COALESCE(fp.market_base_rent, 0) as base_rent,
    COALESCE(asm.total_fixed_amenities, 0) as fixed_amenities_total,
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0)) as calculated_market_rent,
    COALESCE(asm.total_temp_amenities, 0) as temp_amenities_total,
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0) + COALESCE(asm.total_temp_amenities, 0)) as calculated_offered_rent
FROM public.units u
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN amenity_sums asm ON u.id = asm.unit_id;

-- Grant access
GRANT SELECT ON public.view_unit_pricing_analysis TO authenticated;
