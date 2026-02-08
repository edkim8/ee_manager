-- =====================================================
-- Concession Analysis View
-- =====================================================
-- Date: 2026-02-07
-- Purpose: Calculate C%/A% concession percentages for availabilities
--
-- Formulas (amortized over 12 months):
-- - C% = Amenity-based concessions as percentage of market rent
-- - A% = Total concessions (amenities + upfront + free rent) as percentage of market rent
--
-- C% = (amenity_net_monthly / rent_market) * 100
-- A% = ((amenity_net_monthly + upfront_monthly + free_rent_monthly) / rent_market) * 100
--
-- Where:
-- - amenity_net_monthly = sum of premiums/discounts (already monthly)
-- - upfront_monthly = concession_upfront_amount / 12
-- - free_rent_monthly = rent_market * (concession_free_rent_days / 365)
-- =====================================================

CREATE OR REPLACE VIEW view_concession_analysis AS
SELECT
  a.unit_id,
  a.property_code,
  a.status,
  a.rent_market,
  a.rent_offered,
  a.concession_upfront_amount,
  a.concession_free_rent_days,

  -- Calculate amenity-based concession (monthly)
  COALESCE(calculate_amenity_concession(a.unit_id), 0) AS amenity_concession_monthly,

  -- Calculate upfront concession amortized monthly
  COALESCE(a.concession_upfront_amount / 12.0, 0) AS upfront_concession_monthly,

  -- Calculate free rent value amortized monthly
  CASE
    WHEN a.rent_market IS NOT NULL AND a.rent_market > 0 THEN
      COALESCE(a.rent_market * (a.concession_free_rent_days / 365.0), 0)
    ELSE 0
  END AS free_rent_concession_monthly,

  -- Calculate C% (amenity concessions only)
  CASE
    WHEN a.rent_market IS NOT NULL AND a.rent_market > 0 THEN
      ROUND(
        (COALESCE(calculate_amenity_concession(a.unit_id), 0) / a.rent_market) * 100,
        2
      )
    ELSE 0
  END AS concession_amenity_pct,

  -- Calculate A% (total concessions)
  CASE
    WHEN a.rent_market IS NOT NULL AND a.rent_market > 0 THEN
      ROUND(
        (
          COALESCE(calculate_amenity_concession(a.unit_id), 0) +
          COALESCE(a.concession_upfront_amount / 12.0, 0) +
          COALESCE(a.rent_market * (a.concession_free_rent_days / 365.0), 0)
        ) / a.rent_market * 100,
        2
      )
    ELSE 0
  END AS concession_total_pct,

  -- Formatted C%/A% string
  CASE
    WHEN a.rent_market IS NOT NULL AND a.rent_market > 0 THEN
      ROUND((COALESCE(calculate_amenity_concession(a.unit_id), 0) / a.rent_market) * 100, 1)::TEXT || '%/' ||
      ROUND(
        (
          COALESCE(calculate_amenity_concession(a.unit_id), 0) +
          COALESCE(a.concession_upfront_amount / 12.0, 0) +
          COALESCE(a.rent_market * (a.concession_free_rent_days / 365.0), 0)
        ) / a.rent_market * 100,
        1
      )::TEXT || '%'
    ELSE '0%/0%'
  END AS concession_display,

  a.future_tenancy_id,
  a.is_active,
  a.created_at,
  a.updated_at

FROM availabilities a
WHERE a.is_active = true;

COMMENT ON VIEW view_concession_analysis IS 'Calculates C%/A% concession percentages for available units';

-- Grant access
GRANT SELECT ON view_concession_analysis TO authenticated;
GRANT SELECT ON view_concession_analysis TO service_role;
