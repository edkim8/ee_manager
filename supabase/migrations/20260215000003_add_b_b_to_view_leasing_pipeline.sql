-- Add b_b (bedroom x bathroom) column to view_leasing_pipeline
-- Format: "3x2", "1x1", "2x1.5", etc.

DROP VIEW IF EXISTS public.view_leasing_pipeline CASCADE;

CREATE OR REPLACE VIEW public.view_leasing_pipeline AS
SELECT
  'availability'::text AS record_type,
  a.id AS availability_id,
  a.unit_id,
  a.property_code,
  a.unit_name,
  a.status,
  a.available_date,
  a.rent_offered,
  a.amenities,
  a.future_tenancy_id,
  a.move_in_date,
  a.move_out_date,
  a.leasing_agent,
  a.is_active,
  r.name AS resident_name,
  r.email AS resident_email,
  r.phone AS resident_phone,
  u.building_id,
  b.name AS building_name,
  u.floor_plan_id,
  fp.marketing_name AS floor_plan_name,
  fp.code AS floor_plan_code,
  fp.area_sqft AS sf,
  fp.bedroom_count,
  fp.bathroom_count,
  -- NEW: Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  fp.market_base_rent,
  CASE
    WHEN a.status = 'Available'::text THEN COALESCE(a.available_date - CURRENT_DATE, 0)
    ELSE 0
  END AS vacant_days,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,
  app.application_date,
  app.screening_result
FROM
  availabilities a
  LEFT JOIN units u ON a.unit_id = u.id
  LEFT JOIN buildings b ON u.building_id = b.id
  LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
  LEFT JOIN tenancies t ON a.future_tenancy_id = t.id
  LEFT JOIN residents r ON t.id = r.tenancy_id AND r.role = 'Primary'::household_role
  LEFT JOIN leases l ON t.id = l.tenancy_id AND l.is_active = true
  LEFT JOIN applications app ON app.unit_id = a.unit_id
    AND app.property_code = a.property_code
    AND app.applicant_name = r.name
WHERE
  a.is_active = true

UNION ALL

SELECT
  'tenancy'::text AS record_type,
  NULL::uuid AS availability_id,
  t.unit_id,
  t.property_code,
  u.unit_name,
  CASE
    WHEN t.status = 'Future'::tenancy_status THEN 'Leased'::text
    WHEN t.status = 'Applicant'::tenancy_status THEN 'Applied'::text
    ELSE NULL::text
  END AS status,
  NULL::date AS available_date,
  NULL::numeric AS rent_offered,
  NULL::jsonb AS amenities,
  t.id AS future_tenancy_id,
  t.move_in_date,
  t.move_out_date,
  NULL::text AS leasing_agent,
  true AS is_active,
  r.name AS resident_name,
  r.email AS resident_email,
  r.phone AS resident_phone,
  u.building_id,
  b.name AS building_name,
  u.floor_plan_id,
  fp.marketing_name AS floor_plan_name,
  fp.code AS floor_plan_code,
  fp.area_sqft AS sf,
  fp.bedroom_count,
  fp.bathroom_count,
  -- NEW: Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  fp.market_base_rent,
  0 AS vacant_days,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,
  app.application_date,
  app.screening_result
FROM
  tenancies t
  JOIN units u ON t.unit_id = u.id
  LEFT JOIN buildings b ON u.building_id = b.id
  LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
  LEFT JOIN residents r ON t.id = r.tenancy_id AND r.role = 'Primary'::household_role
  LEFT JOIN leases l ON t.id = l.tenancy_id AND l.is_active = true
  LEFT JOIN applications app ON app.unit_id = t.unit_id
    AND app.property_code = t.property_code
    AND app.applicant_name = r.name
WHERE
  (
    t.status = ANY (
      ARRAY[
        'Future'::tenancy_status,
        'Applicant'::tenancy_status
      ]
    )
  )
  AND NOT (
    EXISTS (
      SELECT 1
      FROM availabilities a
      WHERE a.unit_id = t.unit_id
        AND a.is_active = true
    )
  );

-- Add comment
COMMENT ON VIEW view_leasing_pipeline IS 'Hybrid leasing pipeline combining availabilities and future/applicant tenancies with b_b (bedroom x bathroom) format.';

-- Grant permissions
GRANT SELECT ON public.view_leasing_pipeline TO authenticated, anon, service_role;
