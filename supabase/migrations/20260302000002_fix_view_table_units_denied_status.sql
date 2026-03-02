-- Migration: Also exclude legacy 'Denied' tenancies from view_table_units
-- Date: 2026-03-02
-- Description:
--   One SB unit surfaced 'Denied' as its tenancy_status. This was a legacy
--   status written before the solver adopted 'Canceled' as the unified term
--   for both canceled and denied applications. The fix is identical to the
--   Canceled fix in 20260302000001: add 'Denied' to the NOT IN exclusion list
--   so the view falls back to the unit's physical occupant tenancy (or 'Past').

CREATE OR REPLACE VIEW public.view_table_units AS
WITH
  latest_tenancies AS (
    SELECT DISTINCT ON (tenancies.unit_id)
      tenancies.id,
      tenancies.unit_id,
      tenancies.status,
      tenancies.move_in_date,
      tenancies.move_out_date
    FROM tenancies
    WHERE tenancies.status NOT IN ('Canceled'::tenancy_status, 'Denied'::tenancy_status)
    ORDER BY
      tenancies.unit_id,
      tenancies.created_at DESC
  ),
  primary_residents AS (
    SELECT DISTINCT ON (residents.tenancy_id)
      residents.tenancy_id,
      residents.id AS resident_id,
      residents.name
    FROM residents
    ORDER BY
      residents.tenancy_id,
      CASE
        WHEN residents.role = 'Primary'::household_role THEN 0
        ELSE 1
      END,
      residents.created_at
  )
SELECT
  u.id,
  u.unit_name,
  u.property_code,
  u.floor_number,
  u.usage_type,
  u.availability_status,
  u.primary_image_url,
  u.description,
  u.created_at,
  u.updated_at,
  b.name AS building_name,
  b.id AS building_id,
  b.street_address AS building_address,
  fp.marketing_name AS floor_plan_marketing_name,
  fp.code AS floor_plan_code,
  fp.id AS floor_plan_id,
  fp.area_sqft AS sf,
  fp.primary_image_url AS floor_plan_image_url,

  -- Bedroom x Bathroom concatenation (e.g. "2x1", "3x2", "1x1.5")
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,

  COALESCE(lt.status, 'Past'::tenancy_status) AS tenancy_status,
  lt.move_in_date,
  lt.move_out_date,
  pr.name AS resident_name,
  pr.resident_id
FROM units u
  LEFT JOIN buildings b ON u.building_id = b.id
  LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
  LEFT JOIN latest_tenancies lt ON lt.unit_id = u.id
  LEFT JOIN primary_residents pr ON pr.tenancy_id = lt.id;

COMMENT ON VIEW view_table_units IS 'Comprehensive unit view with building, floor plan, tenancy, and resident information. Includes b_b (bedroom x bathroom) format.';

ALTER VIEW public.view_table_units SET (security_invoker = true);

GRANT SELECT ON view_table_units TO authenticated;
