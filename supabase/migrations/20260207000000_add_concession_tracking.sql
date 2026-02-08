-- =====================================================
-- Add Concession Tracking to Availabilities and Leases
-- =====================================================
-- Date: 2026-02-07
-- Purpose: Track upfront concessions and free rent periods for future and signed leases
--
-- Fields Added:
-- - concession_upfront_amount: Dollar amount of upfront concessions (e.g., $500 off first month)
-- - concession_free_rent_days: Number of days of free rent applied
--
-- This enables calculation of:
-- - C% (Amenity-based concessions amortized over 12 months)
-- - A% (Total concessions including upfront + free rent, amortized over 12 months)
-- =====================================================

-- Add concession fields to availabilities table (for future leases)
ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS concession_upfront_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS concession_free_rent_days INTEGER DEFAULT 0;

COMMENT ON COLUMN availabilities.concession_upfront_amount IS 'Upfront dollar concession applied to this lease (e.g., $500 off first month)';
COMMENT ON COLUMN availabilities.concession_free_rent_days IS 'Number of days of free rent applied to this lease';

-- Add concession fields to leases table (for signed leases)
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS concession_upfront_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS concession_free_rent_days INTEGER DEFAULT 0;

COMMENT ON COLUMN leases.concession_upfront_amount IS 'Upfront dollar concession applied to this lease (e.g., $500 off first month)';
COMMENT ON COLUMN leases.concession_free_rent_days IS 'Number of days of free rent applied to this lease';

-- Create helper function to calculate amenity-based concession amount
-- This sums up all amenity premiums and discounts from unit_amenities
CREATE OR REPLACE FUNCTION calculate_amenity_concession(p_unit_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_premium NUMERIC;
  v_total_discount NUMERIC;
  v_net_concession NUMERIC;
BEGIN
  -- Sum premiums (positive amounts)
  SELECT COALESCE(SUM(
    CASE
      WHEN LOWER(a.type) = 'premium' THEN a.amount
      WHEN LOWER(a.type) = 'fixed' THEN a.amount
      ELSE 0
    END
  ), 0)
  INTO v_total_premium
  FROM unit_amenities ua
  JOIN amenities a ON ua.amenity_id = a.id
  WHERE ua.unit_id = p_unit_id
    AND ua.active = true;

  -- Sum discounts (negative amounts)
  SELECT COALESCE(SUM(
    CASE
      WHEN LOWER(a.type) = 'discount' THEN a.amount
      ELSE 0
    END
  ), 0)
  INTO v_total_discount
  FROM unit_amenities ua
  JOIN amenities a ON ua.amenity_id = a.id
  WHERE ua.unit_id = p_unit_id
    AND ua.active = true;

  -- Net concession (premiums are positive, discounts are negative)
  v_net_concession := v_total_premium + v_total_discount;

  RETURN v_net_concession;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_amenity_concession IS 'Calculates net monthly amenity concession (premiums + discounts) for a unit';
