-- Migration: Refactor Vacancy Metrics to Positive Numbers
-- Date: 2026-02-01
-- Description: 
--   Reverses the math for vacant_days and turnover_days to generate 
--   positive numbers for future events (e.g., "vacant in 10 days").

DROP VIEW IF EXISTS public.view_table_availabilities;

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
  fp.area_sqft as sf,
  fp.primary_image_url as floor_plan_image_url, -- New: Image for the layout
  u.floor_plan_id,
  fp.marketing_name as floor_plan_name,
  -- Building details
  b.name AS building_name,
  b.id AS building_id,
  -- Status logic
  t.status as future_status,
  CASE
    WHEN t.status = ANY (ARRAY['Future'::tenancy_status, 'Current'::tenancy_status]) THEN 'Leased'
    WHEN t.status = 'Applicant'::tenancy_status THEN 'Applied'
    ELSE 'Available'
  END AS operational_status,
  -- Metrics calculation (Adjusted for Positive Math)
  COALESCE(a.available_date - a.move_out_date, 0) as turnover_days,
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

-- Grant permissions
GRANT SELECT ON public.view_table_availabilities TO authenticated, anon, service_role;
GRANT SELECT ON public.view_availabilities_metrics TO authenticated, anon, service_role;
