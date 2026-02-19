-- Add Pricing and Concession Fields to view_leasing_pipeline
-- Date: 2026-02-15
--
-- New Fields Added:
-- 1. turnover_days - Days between move-out and available date
-- 2. temp_amenities_total - Sum of temporary amenities (premiums + discounts)
-- 3. concession_upfront_amount - Upfront dollar concession
-- 4. concession_upfront_monthly - Upfront concession amortized monthly (÷12)
-- 5. concession_amenity_monthly - Monthly amenity-based concessions
-- 6. concession_amenity_pct - C% (amenity concessions as % of market rent)
-- 7. concession_total_pct - A% (total concessions as % of market rent)
-- 8. pricing_notes - Aggregated notes/comments from unit_amenities
-- 9. pricing_comment - Latest price override comment

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
  -- Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  fp.market_base_rent,
  -- Vacancy metrics
  CASE
    WHEN a.status = 'Available'::text THEN COALESCE(a.available_date - CURRENT_DATE, 0)
    ELSE 0
  END AS vacant_days,
  -- NEW: Turnover days (time between move-out and available date)
  COALESCE(a.available_date - a.move_out_date, 0) AS turnover_days,
  -- Lease information
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,
  -- Application information
  app.application_date,
  app.screening_result,

  -- ===== NEW PRICING FIELDS =====
  -- Temporary amenities (sum of premiums + discounts)
  COALESCE(vupa.temp_amenities_total, 0) AS temp_amenities_total,

  -- Concession tracking
  a.concession_upfront_amount,
  a.concession_free_rent_days,

  -- Concession calculations from view_concession_analysis
  COALESCE(vca.upfront_concession_monthly, 0) AS concession_upfront_monthly,
  COALESCE(vca.amenity_concession_monthly, 0) AS concession_amenity_monthly,
  COALESCE(vca.free_rent_concession_monthly, 0) AS concession_free_rent_monthly,
  COALESCE(vca.concession_amenity_pct, 0) AS concession_amenity_pct,
  COALESCE(vca.concession_total_pct, 0) AS concession_total_pct,
  COALESCE(vca.concession_display, '0%/0%') AS concession_display_calc,

  -- Pricing notes/comments from unit_amenities
  (
    SELECT STRING_AGG(
      CASE
        WHEN ua.comment IS NOT NULL AND ua.comment != '' THEN ua.comment
        ELSE NULL
      END,
      ' | '
    )
    FROM unit_amenities ua
    WHERE ua.unit_id = a.unit_id
      AND ua.active = true
      AND ua.comment IS NOT NULL
      AND ua.comment != ''
  ) AS pricing_notes,

  -- Latest price override comment (most recent)
  (
    SELECT ua.comment
    FROM unit_amenities ua
    WHERE ua.unit_id = a.unit_id
      AND ua.active = true
      AND ua.comment IS NOT NULL
      AND ua.comment != ''
    ORDER BY ua.updated_at DESC
    LIMIT 1
  ) AS pricing_comment

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
  -- NEW: Join pricing analysis view for temp amenities
  LEFT JOIN view_unit_pricing_analysis vupa ON a.unit_id = vupa.unit_id
  -- NEW: Join concession analysis view for concession calculations
  LEFT JOIN view_concession_analysis vca ON a.unit_id = vca.unit_id
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
  -- Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  fp.market_base_rent,
  0 AS vacant_days,
  -- NEW: Turnover days (0 for tenancy records)
  0 AS turnover_days,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,
  app.application_date,
  app.screening_result,

  -- ===== NEW PRICING FIELDS (for tenancy records) =====
  COALESCE(vupa.temp_amenities_total, 0) AS temp_amenities_total,

  -- Concession tracking from lease table
  COALESCE(l.concession_upfront_amount, 0) AS concession_upfront_amount,
  COALESCE(l.concession_free_rent_days, 0) AS concession_free_rent_days,

  -- Concession calculations (use lease rent_amount as market rent for approximation)
  COALESCE(l.concession_upfront_amount / 12.0, 0) AS concession_upfront_monthly,
  COALESCE(calculate_amenity_concession(t.unit_id), 0) AS concession_amenity_monthly,
  CASE
    WHEN l.rent_amount IS NOT NULL AND l.rent_amount > 0 THEN
      COALESCE(l.rent_amount * (l.concession_free_rent_days / 365.0), 0)
    ELSE 0
  END AS concession_free_rent_monthly,

  -- Concession percentages (using lease rent as base)
  CASE
    WHEN l.rent_amount IS NOT NULL AND l.rent_amount > 0 THEN
      ROUND(
        (COALESCE(calculate_amenity_concession(t.unit_id), 0) / l.rent_amount) * 100,
        2
      )
    ELSE 0
  END AS concession_amenity_pct,

  CASE
    WHEN l.rent_amount IS NOT NULL AND l.rent_amount > 0 THEN
      ROUND(
        (
          COALESCE(calculate_amenity_concession(t.unit_id), 0) +
          COALESCE(l.concession_upfront_amount / 12.0, 0) +
          COALESCE(l.rent_amount * (l.concession_free_rent_days / 365.0), 0)
        ) / l.rent_amount * 100,
        2
      )
    ELSE 0
  END AS concession_total_pct,

  -- Concession display string
  CASE
    WHEN l.rent_amount IS NOT NULL AND l.rent_amount > 0 THEN
      ROUND((COALESCE(calculate_amenity_concession(t.unit_id), 0) / l.rent_amount) * 100, 1)::TEXT || '%/' ||
      ROUND(
        (
          COALESCE(calculate_amenity_concession(t.unit_id), 0) +
          COALESCE(l.concession_upfront_amount / 12.0, 0) +
          COALESCE(l.rent_amount * (l.concession_free_rent_days / 365.0), 0)
        ) / l.rent_amount * 100,
        1
      )::TEXT || '%'
    ELSE '0%/0%'
  END AS concession_display_calc,

  -- Pricing notes/comments from unit_amenities
  (
    SELECT STRING_AGG(
      CASE
        WHEN ua.comment IS NOT NULL AND ua.comment != '' THEN ua.comment
        ELSE NULL
      END,
      ' | '
    )
    FROM unit_amenities ua
    WHERE ua.unit_id = t.unit_id
      AND ua.active = true
      AND ua.comment IS NOT NULL
      AND ua.comment != ''
  ) AS pricing_notes,

  -- Latest price override comment
  (
    SELECT ua.comment
    FROM unit_amenities ua
    WHERE ua.unit_id = t.unit_id
      AND ua.active = true
      AND ua.comment IS NOT NULL
      AND ua.comment != ''
    ORDER BY ua.updated_at DESC
    LIMIT 1
  ) AS pricing_comment

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
  -- NEW: Join pricing analysis view
  LEFT JOIN view_unit_pricing_analysis vupa ON t.unit_id = vupa.unit_id
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

-- Add comprehensive comment
COMMENT ON VIEW view_leasing_pipeline IS 'Hybrid leasing pipeline with full pricing, concession tracking, and turnover metrics. Includes b_b, temporary amenities, concession calculations (C%/A%), and pricing notes from overrides.';

-- Grant permissions
GRANT SELECT ON public.view_leasing_pipeline TO authenticated, anon, service_role;
