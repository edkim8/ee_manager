-- Migration: Fix Amenities Pricing - Case Insensitive + Premium/Discount Separation
-- Date: 2026-02-06
-- Purpose: Make amenity type comparisons case-insensitive and separate premium/discount
-- Formula: Base Rent + Fixed = Market Rent | Market Rent + Premium + Discount = Offered Rent

CREATE OR REPLACE VIEW public.view_unit_pricing_analysis AS
WITH amenity_sums AS (
    SELECT
        ua.unit_id,
        -- Case-insensitive type matching using LOWER()
        COALESCE(SUM(CASE WHEN LOWER(a.type) = 'fixed' THEN a.amount ELSE 0 END), 0) as total_fixed_amenities,
        COALESCE(SUM(CASE WHEN LOWER(a.type) = 'premium' THEN a.amount ELSE 0 END), 0) as total_premium_amenities,
        COALESCE(SUM(CASE WHEN LOWER(a.type) = 'discount' THEN a.amount ELSE 0 END), 0) as total_discount_amenities
    FROM public.unit_amenities ua
    JOIN public.amenities a ON ua.amenity_id = a.id
    WHERE ua.active = true AND a.active = true
    GROUP BY ua.unit_id
)
SELECT
    u.id as unit_id,
    u.unit_name,
    u.property_code,
    u.floor_plan_id,

    -- Base components
    COALESCE(fp.market_base_rent, 0) as base_rent,
    COALESCE(asm.total_fixed_amenities, 0) as fixed_amenities_total,

    -- Market Rent = Base + Fixed
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0)) as calculated_market_rent,

    -- Premium and Discount components
    COALESCE(asm.total_premium_amenities, 0) as premium_amenities_total,
    COALESCE(asm.total_discount_amenities, 0) as discount_amenities_total,

    -- Offered Rent = Market + Premium + Discount (discount is typically negative)
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0) + COALESCE(asm.total_premium_amenities, 0) + COALESCE(asm.total_discount_amenities, 0)) as calculated_offered_rent
FROM public.units u
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN amenity_sums asm ON u.id = asm.unit_id;

GRANT SELECT ON public.view_unit_pricing_analysis TO authenticated;
