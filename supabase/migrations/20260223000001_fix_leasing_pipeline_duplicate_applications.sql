-- Fix duplicate rows in view_leasing_pipeline caused by multiple application records per unit
-- Date: 2026-02-23
-- Root cause: LEFT JOIN applications (no deduplication) multiplied rows when a unit
--             had 2+ application records. RS/1039 appeared twice in Availabilities Table
--             with Vue duplicate key warnings.
-- Fix: Replace both LEFT JOIN applications with LEFT JOIN LATERAL (... LIMIT 1) app ON true

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
  COALESCE(a.move_in_date, t.move_in_date) AS move_in_date,
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
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count::INTEGER, 'x', fp.bathroom_count::INTEGER)
    ELSE NULL
  END AS b_b,
  vupa.base_rent,
  vupa.fixed_amenities_total,
  vupa.calculated_market_rent,
  CASE
    WHEN a.status = 'Available'::text THEN COALESCE(a.available_date - CURRENT_DATE, 0)
    ELSE 0
  END AS vacant_days,
  COALESCE(a.available_date - a.move_out_date, 0) AS turnover_days,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,

  -- ===== PRICING FIELDS =====
  COALESCE(vupa.temp_amenities_total, 0) AS temp_amenities_total,
  COALESCE(vupa.calculated_offered_rent, 0) AS calculated_offered_rent,
  CASE
    WHEN ABS(COALESCE(a.rent_offered, 0) - COALESCE(vupa.calculated_offered_rent, 0)) > 0.01 THEN
      ARRAY[CONCAT('Yardi Rent ($', a.rent_offered::TEXT, ') does not match internal calculation ($', vupa.calculated_offered_rent::TEXT, ')')]
    ELSE ARRAY[]::TEXT[]
  END AS sync_alerts,
  a.concession_upfront_amount,
  a.concession_free_rent_days,
  COALESCE(vca.upfront_concession_monthly, 0) AS concession_upfront_monthly,
  COALESCE(vca.amenity_concession_monthly, 0) AS concession_amenity_monthly,
  COALESCE(vca.free_rent_concession_monthly, 0) AS concession_free_rent_monthly,
  COALESCE(vca.concession_amenity_pct, 0) AS concession_amenity_pct,
  COALESCE(vca.concession_total_pct, 0) AS concession_total_pct,
  COALESCE(vca.concession_display, '0%/0%') AS concession_display_calc,

  -- Screening & Application (one row per unit — most recent application)
  COALESCE(app.application_date, NULL) AS application_date,
  COALESCE(app.screening_result, a.screening_result, 'Pending') AS screening_result,

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
  -- FIXED: Use LATERAL + LIMIT 1 to prevent row multiplication when unit has multiple applications
  LEFT JOIN LATERAL (
    SELECT application_date, screening_result, agent
    FROM applications
    WHERE property_code = a.property_code
      AND (
        unit_id = a.unit_id
        OR (r.name IS NOT NULL AND UPPER(TRIM(applicant_name)) = UPPER(TRIM(r.name)))
      )
    ORDER BY application_date DESC NULLS LAST
    LIMIT 1
  ) app ON true
  LEFT JOIN view_unit_pricing_analysis vupa ON a.unit_id = vupa.unit_id
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
  COALESCE(hist_a.available_date, lat_a.available_date) AS available_date,
  COALESCE(hist_a.rent_offered, lat_a.rent_offered) AS rent_offered,
  COALESCE(hist_a.amenities, lat_a.amenities) AS amenities,
  t.id AS future_tenancy_id,
  t.move_in_date,
  t.move_out_date,
  COALESCE(hist_a.leasing_agent, app.agent, lat_a.leasing_agent) AS leasing_agent,
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
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count::INTEGER, 'x', fp.bathroom_count::INTEGER)
    ELSE NULL
  END AS b_b,
  vupa.base_rent,
  vupa.fixed_amenities_total,
  vupa.calculated_market_rent,
  0 AS vacant_days,
  0 AS turnover_days,
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,

  -- ===== PRICING FIELDS (for tenancy records) =====
  COALESCE(vupa.temp_amenities_total, 0) AS temp_amenities_total,
  COALESCE(vupa.calculated_offered_rent, 0) AS calculated_offered_rent,
  CASE
    WHEN ABS(COALESCE(l.rent_amount, 0) - COALESCE(vupa.calculated_offered_rent, 0)) > 0.01 THEN
      ARRAY[CONCAT('Lease Rent ($', l.rent_amount::TEXT, ') does not match internal calculation ($', vupa.calculated_offered_rent::TEXT, ')')]
    ELSE ARRAY[]::TEXT[]
  END AS sync_alerts,
  COALESCE(l.concession_upfront_amount, 0) AS concession_upfront_amount,
  COALESCE(l.concession_free_rent_days, 0) AS concession_free_rent_days,
  COALESCE(l.concession_upfront_amount / 12.0, 0) AS concession_upfront_monthly,
  COALESCE(calculate_amenity_concession(t.unit_id), 0) AS concession_amenity_monthly,
  CASE
    WHEN l.rent_amount IS NOT NULL AND l.rent_amount > 0 THEN
      COALESCE(l.rent_amount * (l.concession_free_rent_days / 365.0), 0)
    ELSE 0
  END AS concession_free_rent_monthly,
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

  -- Screening & Application (one row per unit — most recent application)
  app.application_date,
  COALESCE(app.screening_result, hist_a.screening_result, 'Pending') AS screening_result,

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
  LEFT JOIN availabilities hist_a ON hist_a.future_tenancy_id = t.id
  LEFT JOIN LATERAL (
    SELECT *
    FROM availabilities
    WHERE unit_id = t.unit_id
    ORDER BY created_at DESC
    LIMIT 1
  ) lat_a ON true
  -- FIXED: Use LATERAL + LIMIT 1 to prevent row multiplication when unit has multiple applications
  LEFT JOIN LATERAL (
    SELECT application_date, screening_result, agent
    FROM applications
    WHERE property_code = t.property_code
      AND (
        unit_id = t.unit_id
        OR (r.name IS NOT NULL AND UPPER(TRIM(applicant_name)) = UPPER(TRIM(r.name)))
      )
    ORDER BY application_date DESC NULLS LAST
    LIMIT 1
  ) app ON true
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

COMMENT ON VIEW view_leasing_pipeline IS 'Hybrid leasing pipeline with full pricing, concession tracking (C%/A%), turnover metrics, and b_b format. Self-contained with all joins. Applications JOIN uses LATERAL+LIMIT 1 to prevent row duplication.';

GRANT SELECT ON public.view_leasing_pipeline TO authenticated, anon, service_role;
