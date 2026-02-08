-- Amenities System Verification Script
-- Date: 2026-02-06
-- Purpose: Verify amenities data and pricing calculations

-- =====================================================
-- 1. CHECK AMENITIES LIBRARY DATA
-- =====================================================
-- Verify amenities exist and have correct types (lowercase)
SELECT
    property_code,
    type,
    COUNT(*) as count,
    SUM(amount) as total_pricing,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM amenities
WHERE active = true
GROUP BY property_code, type
ORDER BY property_code, type;

-- Expected: Should see 'fixed', 'premium', 'discount' (all lowercase)
-- Any capitalized types ('Fixed', 'Premium') indicate data needs cleanup

-- =====================================================
-- 2. CHECK UNIT_AMENITIES LINKAGE
-- =====================================================
-- Verify unit amenities are linked correctly
SELECT
    COUNT(*) as total_links,
    COUNT(*) FILTER (WHERE active = true) as active_links,
    COUNT(*) FILTER (WHERE active = false) as inactive_links,
    COUNT(DISTINCT unit_id) as units_with_amenities
FROM unit_amenities;

-- Expected: Should have active links from Solver sync

-- =====================================================
-- 3. VERIFY PRICING VIEW WORKS
-- =====================================================
-- Test case-insensitive pricing calculation
SELECT
    unit_name,
    property_code,
    base_rent,
    fixed_amenities_total,
    calculated_market_rent,
    premium_amenities_total,
    discount_amenities_total,
    calculated_offered_rent
FROM view_unit_pricing_analysis
WHERE property_code = 'RS' -- Change to your property code
LIMIT 10;

-- Verify Formula:
-- calculated_market_rent = base_rent + fixed_amenities_total
-- calculated_offered_rent = calculated_market_rent + premium_amenities_total + discount_amenities_total

-- =====================================================
-- 4. COMPARE YARDI vs CALCULATED RENT
-- =====================================================
-- Compare Yardi's rent_offered with our calculated value
SELECT
    a.unit_name,
    a.property_code,
    a.rent_offered as yardi_offered_rent,
    v.calculated_offered_rent,
    (a.rent_offered - v.calculated_offered_rent) as difference,
    CASE
        WHEN ABS(a.rent_offered - v.calculated_offered_rent) <= 10 THEN '✅ Match'
        WHEN ABS(a.rent_offered - v.calculated_offered_rent) <= 50 THEN '⚠️ Close'
        ELSE '❌ Mismatch'
    END as status
FROM availabilities a
JOIN view_unit_pricing_analysis v ON a.unit_id = v.unit_id
WHERE a.property_code = 'RS' -- Change to your property code
  AND a.is_active = true
ORDER BY ABS(a.rent_offered - v.calculated_offered_rent) DESC
LIMIT 20;

-- Expected: Most differences should be within $10-50
-- Large differences indicate:
--   - Missing base_rent in floor_plans
--   - Missing amenities in library
--   - Incorrect amenity amounts

-- =====================================================
-- 5. IDENTIFY MISSING BASE RENT
-- =====================================================
-- Find floor plans missing market_base_rent
SELECT
    fp.property_code,
    fp.code as floor_plan_code,
    fp.marketing_name,
    fp.market_base_rent,
    COUNT(u.id) as units_affected
FROM floor_plans fp
LEFT JOIN units u ON fp.id = u.floor_plan_id
WHERE fp.market_base_rent IS NULL OR fp.market_base_rent = 0
GROUP BY fp.id, fp.property_code, fp.code, fp.marketing_name, fp.market_base_rent
ORDER BY units_affected DESC;

-- If this returns rows, those floor plans need base_rent populated

-- =====================================================
-- 6. AMENITIES BREAKDOWN BY UNIT
-- =====================================================
-- Detailed amenities breakdown for a specific unit
-- Replace 'RS 1001' with your test unit
SELECT
    u.unit_name,
    a.yardi_amenity as amenity_name,
    a.type,
    a.amount,
    ua.active,
    ua.comment
FROM units u
JOIN unit_amenities ua ON u.id = ua.unit_id
JOIN amenities a ON ua.amenity_id = a.id
WHERE u.unit_name = 'RS 1001' -- Change to your test unit
  AND u.property_code = 'RS' -- Change to your property
ORDER BY a.type, a.yardi_amenity;

-- This shows all amenities (active and inactive) for the unit
-- Verify:
--   - Fixed amenities are present
--   - Premium/Discount amounts are correct
--   - Active flags are accurate

-- =====================================================
-- 7. CHECK FOR TYPE CASE ISSUES
-- =====================================================
-- Find any amenities with capitalized types (need cleanup)
SELECT
    property_code,
    type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT yardi_amenity, ', ') as sample_amenities
FROM amenities
WHERE type NOT IN ('fixed', 'premium', 'discount')
GROUP BY property_code, type;

-- Expected: No results (all types should be lowercase)
-- If results found, run UPDATE to fix:
-- UPDATE amenities SET type = LOWER(type) WHERE type != LOWER(type);

-- =====================================================
-- 8. FLOOR PLAN PRICING SUMMARY
-- =====================================================
-- Aggregate pricing by floor plan
SELECT
    property_code,
    floor_plan_name,
    total_units,
    available_units,
    ROUND(avg_market_rent::numeric, 2) as avg_market_rent,
    ROUND(avg_offered_rent::numeric, 2) as avg_offered_rent,
    ROUND(rent_discrepancy::numeric, 2) as avg_discount
FROM view_floor_plan_pricing_summary
WHERE property_code = 'RS' -- Change to your property
ORDER BY floor_plan_name;

-- Verify:
--   - avg_market_rent = base + fixed
--   - avg_offered_rent = market + premium + discount
--   - rent_discrepancy shows average pricing adjustments

-- =====================================================
-- 9. SUMMARY STATISTICS
-- =====================================================
-- Overall system health check
SELECT
    'Amenities Library' as metric,
    COUNT(*) as count
FROM amenities WHERE active = true
UNION ALL
SELECT
    'Unit Amenity Links (Active)',
    COUNT(*)
FROM unit_amenities WHERE active = true
UNION ALL
SELECT
    'Units with Amenities',
    COUNT(DISTINCT unit_id)
FROM unit_amenities WHERE active = true
UNION ALL
SELECT
    'Floor Plans with Base Rent',
    COUNT(*)
FROM floor_plans WHERE market_base_rent IS NOT NULL AND market_base_rent > 0
UNION ALL
SELECT
    'Availabilities',
    COUNT(*)
FROM availabilities WHERE is_active = true;
