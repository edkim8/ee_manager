-- Add b_b (bedroom x bathroom) column to view_table_availabilities
-- Format: "3x2", "1x1", "2x1.5", etc.

DROP VIEW IF EXISTS public.view_table_availabilities CASCADE;

CREATE OR REPLACE VIEW public.view_table_availabilities AS
SELECT
  a.unit_id,
  a.property_code,
  a.unit_name,
  a.status,
  a.leasing_agent,
  a.available_date,
  a.ready_date,
  a.move_out_date,
  a.move_in_date,
  a.amenities,
  a.rent_offered,
  -- Unit & Floor Plan details
  fp.area_sqft AS sf,
  fp.primary_image_url AS floor_plan_image_url,
  u.floor_plan_id,
  fp.marketing_name AS floor_plan_name,

  -- NEW: Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,

  -- Building details
  b.name AS building_name,
  b.id AS building_id,
  -- Status logic
  t.status AS future_status,
  CASE
    WHEN t.status = ANY (ARRAY['Future'::tenancy_status, 'Current'::tenancy_status]) THEN 'Leased'
    WHEN t.status = 'Applicant'::tenancy_status THEN 'Applied'
    ELSE 'Available'
  END AS operational_status,
  -- Metrics calculation (Adjusted for Positive Math)
  COALESCE(a.available_date - a.move_out_date, 0) AS turnover_days,
  CASE
    WHEN a.move_in_date IS NOT NULL THEN (a.move_in_date - a.move_out_date)
    ELSE (a.move_out_date - CURRENT_DATE) -- Positive = Days until move-out
  END AS vacant_days
FROM
  availabilities a
LEFT JOIN units u ON a.unit_id = u.id
LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN buildings b ON u.building_id = b.id
LEFT JOIN tenancies t ON a.future_tenancy_id = t.id
WHERE a.is_active = true;

-- Ensure view_availabilities_metrics is also updated
CREATE OR REPLACE VIEW public.view_availabilities_metrics AS
SELECT * FROM public.view_table_availabilities;

-- Add comment
COMMENT ON VIEW view_table_availabilities IS 'Availabilities view with vacancy metrics and b_b (bedroom x bathroom) format.';

-- Grant permissions
GRANT SELECT ON public.view_table_availabilities TO authenticated, anon, service_role;
GRANT SELECT ON public.view_availabilities_metrics TO authenticated, anon, service_role;
