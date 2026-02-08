-- =====================================================
-- Concession Transfer Trigger
-- =====================================================
-- Date: 2026-02-07
-- Purpose: Automatically transfer concession data from availabilities to leases
--          when a lease is created for a unit
--
-- Flow:
-- 1. Unit is Available → Staff enters concessions in availability record
-- 2. Unit is Applied → Concessions stay in availability
-- 3. Unit is Leased → Lease record created (from Yardi sync)
-- 4. TRIGGER: Copy concessions from availability to lease automatically
-- =====================================================

-- Function to copy concessions from availability to lease
CREATE OR REPLACE FUNCTION copy_concessions_to_lease()
RETURNS TRIGGER AS $$
DECLARE
  v_unit_id UUID;
  v_concession_upfront NUMERIC;
  v_concession_free_days INTEGER;
BEGIN
  -- Get the unit_id from the tenancy
  SELECT unit_id INTO v_unit_id
  FROM tenancies
  WHERE id = NEW.tenancy_id;

  -- If we found a unit, get concessions from availability
  IF v_unit_id IS NOT NULL THEN
    SELECT
      concession_upfront_amount,
      concession_free_rent_days
    INTO
      v_concession_upfront,
      v_concession_free_days
    FROM availabilities
    WHERE unit_id = v_unit_id
      AND is_active = true;

    -- If concessions found, copy them to the lease (only if lease doesn't have them)
    IF v_concession_upfront IS NOT NULL OR v_concession_free_days IS NOT NULL THEN
      IF NEW.concession_upfront_amount IS NULL THEN
        NEW.concession_upfront_amount := COALESCE(v_concession_upfront, 0);
      END IF;

      IF NEW.concession_free_rent_days IS NULL THEN
        NEW.concession_free_rent_days := COALESCE(v_concession_free_days, 0);
      END IF;

      -- Log for debugging
      RAISE NOTICE 'Copied concessions to lease: unit_id=%, upfront=%, free_days=%',
        v_unit_id, NEW.concession_upfront_amount, NEW.concession_free_rent_days;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on lease insert
CREATE TRIGGER trigger_copy_concessions_to_lease
  BEFORE INSERT ON leases
  FOR EACH ROW
  EXECUTE FUNCTION copy_concessions_to_lease();

COMMENT ON FUNCTION copy_concessions_to_lease IS 'Automatically copies concession data from availability to lease when lease is created';
COMMENT ON TRIGGER trigger_copy_concessions_to_lease ON leases IS 'Transfers concessions from availability → lease on insert';

-- =====================================================
-- Manual Backfill Function (Optional)
-- =====================================================
-- Use this to copy concessions from availabilities to existing leases

CREATE OR REPLACE FUNCTION backfill_lease_concessions()
RETURNS TABLE(
  lease_id TEXT,
  unit_id TEXT,
  upfront_amount NUMERIC,
  free_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE leases l
  SET
    concession_upfront_amount = COALESCE(a.concession_upfront_amount, 0),
    concession_free_rent_days = COALESCE(a.concession_free_rent_days, 0)
  FROM tenancies t
  JOIN availabilities a ON t.unit_id = a.unit_id AND a.is_active = true
  WHERE l.tenancy_id = t.id
    AND l.is_active = true
    AND (a.concession_upfront_amount > 0 OR a.concession_free_rent_days > 0)
    AND (l.concession_upfront_amount IS NULL OR l.concession_upfront_amount = 0)
  RETURNING
    l.id::TEXT,
    t.unit_id::TEXT,
    l.concession_upfront_amount,
    l.concession_free_rent_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_lease_concessions IS 'One-time function to backfill concessions from availabilities to existing leases';

-- Usage: SELECT * FROM backfill_lease_concessions();
