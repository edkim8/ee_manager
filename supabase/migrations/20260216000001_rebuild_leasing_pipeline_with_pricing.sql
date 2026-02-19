-- Rebuild view_leasing_pipeline with all pricing fields
-- Date: 2026-02-16
-- This migration consolidates all changes into proper dependency order

-- =====================================================
-- STEP 1: Drop existing views to handle schema changes
-- =====================================================
-- We drop these explicitly because PostgreSQL does not allow 
-- renaming columns via CREATE OR REPLACE VIEW.

DROP VIEW IF EXISTS public.view_leasing_pipeline CASCADE;
DROP VIEW IF EXISTS public.view_table_availabilities CASCADE;
DROP VIEW IF EXISTS public.view_availabilities_metrics CASCADE;
DROP VIEW IF EXISTS public.view_concession_analysis CASCADE;
DROP VIEW IF EXISTS public.view_unit_pricing_analysis CASCADE;

-- =====================================================
-- STEP 2: INTERNAL CORE LOGIC - DEPENDENCY VIEWS
-- =====================================================

-- [INTERNAL] view_unit_pricing_analysis
-- Used by: Pricing Engine (Solver), view_leasing_pipeline, view_table_availabilities
-- Purpose: Primary calculation of Base Rent + Fixed Amenities + Temp Amenities
CREATE OR REPLACE VIEW public.view_unit_pricing_analysis AS
WITH amenity_sums AS (
    SELECT
        ua.unit_id,
        COALESCE(SUM(CASE WHEN LOWER(a.type) = 'fixed' THEN a.amount ELSE 0 END), 0) as total_fixed_amenities,
        COALESCE(SUM(CASE WHEN LOWER(a.type) != 'fixed' THEN a.amount ELSE 0 END), 0) as total_temp_amenities
    FROM public.unit_amenities ua
    JOIN public.amenities a ON ua.amenity_id = a.id
    WHERE ua.active = true AND a.active = true
    GROUP BY ua.unit_id
)
SELECT
    u.id as unit_id,
    u.unit_name,
    u.property_code,
    COALESCE(fp.market_base_rent, 0) as base_rent,
    COALESCE(asm.total_fixed_amenities, 0) as fixed_amenities_total,
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0)) as calculated_market_rent,
    COALESCE(asm.total_temp_amenities, 0) as temp_amenities_total,
    (COALESCE(fp.market_base_rent, 0) + COALESCE(asm.total_fixed_amenities, 0) + COALESCE(asm.total_temp_amenities, 0)) as calculated_offered_rent
FROM public.units u
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN amenity_sums asm ON u.id = asm.unit_id;

GRANT SELECT ON public.view_unit_pricing_analysis TO authenticated, service_role;

-- Ensure calculate_amenity_concession function exists
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

-- [INTERNAL] view_concession_analysis
-- Used by: view_leasing_pipeline, view_table_availabilities
-- Purpose: Complex logic for C%/A% concessions based on market_base_rent baseline
CREATE OR REPLACE VIEW view_concession_analysis AS
SELECT
  a.unit_id,
  a.property_code,
  a.status,
  vupa.calculated_market_rent AS market_base_rent,
  a.rent_offered,
  a.concession_upfront_amount,
  a.concession_free_rent_days,

  -- Calculate amenity-based concession (monthly)
  -- This represents the "Pricing Delta" between True Market and Yardi Offered
  COALESCE(vupa.calculated_market_rent - a.rent_offered, 0) AS amenity_concession_monthly,

  -- Calculate upfront concession amortized monthly
  COALESCE(a.concession_upfront_amount / 12.0, 0) AS upfront_concession_monthly,

  -- Calculate free rent value amortized monthly (using True Market Rent)
  CASE
    WHEN vupa.calculated_market_rent > 0 THEN
      COALESCE(vupa.calculated_market_rent * (a.concession_free_rent_days / 365.0), 0)
    ELSE 0
  END AS free_rent_concession_monthly,

  -- Calculate C% (amenity concessions / delta only)
  CASE
    WHEN vupa.calculated_market_rent > 0 THEN
      ROUND(
        (COALESCE(vupa.calculated_market_rent - a.rent_offered, 0) / vupa.calculated_market_rent) * 100,
        2
      )
    ELSE 0
  END AS concession_amenity_pct,

  -- Calculate A% (total concessions)
  CASE
    WHEN vupa.calculated_market_rent > 0 THEN
      ROUND(
        (
          COALESCE(vupa.calculated_market_rent - a.rent_offered, 0) +
          COALESCE(a.concession_upfront_amount / 12.0, 0) +
          COALESCE(vupa.calculated_market_rent * (a.concession_free_rent_days / 365.0), 0)
        ) / vupa.calculated_market_rent * 100,
        2
      )
    ELSE 0
  END AS concession_total_pct,

  -- Formatted C%/A% string
  CASE
    WHEN vupa.calculated_market_rent > 0 THEN
      ROUND((COALESCE(vupa.calculated_market_rent - a.rent_offered, 0) / vupa.calculated_market_rent) * 100, 1)::TEXT || '%/' ||
      ROUND(
        (
          COALESCE(vupa.calculated_market_rent - a.rent_offered, 0) +
          COALESCE(a.concession_upfront_amount / 12.0, 0) +
          COALESCE(vupa.calculated_market_rent * (a.concession_free_rent_days / 365.0), 0)
        ) / vupa.calculated_market_rent * 100,
        1
      )::TEXT || '%'
    ELSE '0%/0%'
  END AS concession_display,

  a.future_tenancy_id,
  a.is_active,
  a.created_at,
  a.updated_at

FROM availabilities a
LEFT JOIN view_unit_pricing_analysis vupa ON a.unit_id = vupa.unit_id
WHERE a.is_active = true;

COMMENT ON VIEW view_concession_analysis IS 'Calculates C%/A% concession percentages for available units';

GRANT SELECT ON view_concession_analysis TO authenticated, service_role;

-- =====================================================
-- STEP 3: PRIMARY CONSUMPTION - MASTER PIPELINE VIEW
-- =====================================================
-- [PRIMARY] view_leasing_pipeline
-- Used by: Availabilities List Table (index.vue)
-- Purpose: Self-contained source for the hybrid pipeline (Available + Applied + Leased)

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
  -- Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  vupa.calculated_market_rent AS market_base_rent,
  -- Vacancy metrics
  CASE
    WHEN a.status = 'Available'::text THEN COALESCE(a.available_date - CURRENT_DATE, 0)
    ELSE 0
  END AS vacant_days,
  -- Turnover days (time between move-out and available date)
  COALESCE(a.available_date - a.move_out_date, 0) AS turnover_days,
  -- Lease information
  l.start_date AS lease_start_date,
  l.end_date AS lease_end_date,
  l.rent_amount AS lease_rent_amount,
  
  -- ===== PRICING FIELDS =====
  -- Temporary amenities (sum of premiums + discounts from Pricing Manager)
  COALESCE(vupa.temp_amenities_total, 0) AS temp_amenities_total,
  
  -- Internal Target Price (Base + Fixed + Temp)
  COALESCE(vupa.calculated_offered_rent, 0) AS calculated_offered_rent,

  -- Sync Alerts (Yardi vs Internal)
  CASE
    WHEN ABS(COALESCE(a.rent_offered, 0) - COALESCE(vupa.calculated_offered_rent, 0)) > 0.01 THEN
      ARRAY[CONCAT('Yardi Rent ($', a.rent_offered::TEXT, ') does not match internal calculation ($', vupa.calculated_offered_rent::TEXT, ')')]
    ELSE ARRAY[]::TEXT[]
  END AS sync_alerts,

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

  -- Screening & Application (with coalesced backups)
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
  LEFT JOIN applications app ON app.property_code = a.property_code
    AND (
      app.unit_id = a.unit_id 
      OR (r.name IS NOT NULL AND UPPER(TRIM(app.applicant_name)) = UPPER(TRIM(r.name)))
    )
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
  -- We pull available_date from historical memory to avoid exclusivity
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
  -- Bedroom x Bathroom concatenation
  CASE
    WHEN fp.bedroom_count IS NOT NULL AND fp.bathroom_count IS NOT NULL THEN
      CONCAT(fp.bedroom_count, 'x', fp.bathroom_count)
    ELSE NULL
  END AS b_b,
  vupa.calculated_market_rent AS market_base_rent,
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

  -- Screening & Application
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
  LEFT JOIN applications app ON app.property_code = t.property_code
    AND (
      app.unit_id = t.unit_id 
      OR (r.name IS NOT NULL AND UPPER(TRIM(app.applicant_name)) = UPPER(TRIM(r.name)))
    )
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
COMMENT ON VIEW view_leasing_pipeline IS 'Hybrid leasing pipeline with full pricing, concession tracking (C%/A%), turnover metrics, and b_b format. Self-contained with all joins.';

-- Grant permissions
GRANT SELECT ON public.view_leasing_pipeline TO authenticated, anon, service_role;

-- =====================================================
-- STEP 3.5: RESTORE DROPPED DEPENDENT VIEWS 
-- =====================================================
-- These views were dropped by CASCADE in Step 1 and must be restored
-- in proper order after their dependencies (vupa/vlp) are recreated.

-- [NEWLY RESTORED] view_floor_plan_pricing_summary
-- Used by: Floor Plan Pricing Manager (Pricing > Floor Plans)
-- Purpose: Aggregates unit-level pricing to the floor plan level
CREATE OR REPLACE VIEW public.view_floor_plan_pricing_summary AS
WITH pipeline_counts AS (
    SELECT
        u.floor_plan_id,
        COUNT(*) FILTER (WHERE vlp.status = 'Available') as available_count
    FROM public.units u
    LEFT JOIN public.view_leasing_pipeline vlp ON u.id = vlp.unit_id
    WHERE u.floor_plan_id IS NOT NULL
    GROUP BY u.floor_plan_id
)
SELECT
    fp.id as floor_plan_id,
    fp.property_code,
    fp.code as floor_plan_code,
    fp.marketing_name as floor_plan_name,
    COUNT(u.id) as total_units,
    COALESCE(pc.available_count, 0) as available_units,
    COALESCE(AVG(vupa.calculated_market_rent), 0) as avg_market_rent,
    COALESCE(AVG(vupa.calculated_offered_rent), 0) as avg_offered_rent,
    COALESCE(AVG(vupa.calculated_offered_rent) - AVG(vupa.calculated_market_rent), 0) as rent_discrepancy
FROM public.floor_plans fp
LEFT JOIN public.units u ON fp.id = u.floor_plan_id
LEFT JOIN pipeline_counts pc ON fp.id = pc.floor_plan_id
LEFT JOIN public.view_unit_pricing_analysis vupa ON u.id = vupa.unit_id
GROUP BY fp.id, fp.property_code, fp.code, fp.marketing_name, pc.available_count;

GRANT SELECT ON public.view_floor_plan_pricing_summary TO authenticated, service_role;

-- =====================================================
-- STEP 4: PRIMARY CONSUMPTION - MASTER TABLE VIEW
-- =====================================================
-- [PRIMARY] view_table_availabilities 
-- Used by: Availabilities Detail Page ([id].vue)
-- Purpose: Detailed unit-level data with metrics and pricing consolidated

DROP VIEW IF EXISTS public.view_table_availabilities CASCADE;

CREATE OR REPLACE VIEW public.view_table_availabilities AS
SELECT
  a.id,
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
  vupa.calculated_market_rent AS market_base_rent,
  
  -- Concession fields for detail pages
  COALESCE(vca.concession_amenity_pct, 0) AS concession_amenity_pct,
  COALESCE(vca.concession_total_pct, 0) AS concession_total_pct,
  COALESCE(vca.concession_display, '0%/0%') AS concession_display_calc,
  COALESCE(vca.amenity_concession_monthly, 0) AS amenity_concession_monthly,
  COALESCE(vca.upfront_concession_monthly, 0) AS upfront_concession_monthly,
  COALESCE(vca.free_rent_concession_monthly, 0) AS free_rent_concession_monthly,

  -- Unit & Floor Plan details
  fp.area_sqft AS sf,
  fp.primary_image_url AS floor_plan_image_url,
  u.floor_plan_id,
  fp.marketing_name AS floor_plan_name,

  -- Bedroom x Bathroom concatenation
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
  -- Metrics calculation
  COALESCE(a.available_date - a.move_out_date, 0) AS turnover_days,
  CASE
    WHEN a.move_in_date IS NOT NULL THEN (a.move_in_date - a.move_out_date)
    ELSE (a.move_out_date - CURRENT_DATE)
  END AS vacant_days
FROM
  availabilities a
LEFT JOIN units u ON a.unit_id = u.id
LEFT JOIN floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN buildings b ON u.building_id = b.id
LEFT JOIN tenancies t ON a.future_tenancy_id = t.id
LEFT JOIN view_unit_pricing_analysis vupa ON a.unit_id = vupa.unit_id
LEFT JOIN view_concession_analysis vca ON a.unit_id = vca.unit_id
WHERE a.is_active = true;

-- Recreate metrics view which is a wrapper for the table view
CREATE OR REPLACE VIEW public.view_availabilities_metrics AS
SELECT * FROM public.view_table_availabilities;

GRANT SELECT ON public.view_table_availabilities TO authenticated, anon, service_role;
GRANT SELECT ON public.view_availabilities_metrics TO authenticated, anon, service_role;

COMMENT ON VIEW view_table_availabilities IS 'Availabilities view with vacancy metrics, b_b format, and True Market Rent.';
COMMENT ON VIEW view_availabilities_metrics IS 'Legacy wrapper for view_table_availabilities.';
