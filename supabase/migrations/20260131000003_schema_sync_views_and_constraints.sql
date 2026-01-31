-- Migration: Schema Sync - Views and Constraints
-- Date: 2026-01-31
-- Description:
--   1. Rename leases_view → view_leases (consistent naming)
--   2. Ensure view_availabilities_metrics exists
--   3. Fix availabilities.is_active to NOT NULL DEFAULT true

-- ============================================
-- 1. Rename leases_view to view_leases
-- ============================================
DROP VIEW IF EXISTS public.view_leases;
DROP VIEW IF EXISTS public.leases_view;

CREATE OR REPLACE VIEW public.view_leases AS
SELECT
    l.id,
    l.tenancy_id,
    l.property_code,

    -- Primary Resident Name
    (
        SELECT r.name
        FROM public.residents r
        WHERE r.tenancy_id = l.tenancy_id
          AND r.role = 'Primary'
          AND r.is_active = true
        LIMIT 1
    ) AS resident,

    -- Household Count (Primary + Roommates + Occupants)
    (
        SELECT COUNT(*)
        FROM public.residents r
        WHERE r.tenancy_id = l.tenancy_id
          AND r.role IN ('Primary', 'Roommate', 'Occupant')
          AND r.is_active = true
    ) AS number_household,

    -- Unit Name
    (
        SELECT u.unit_name
        FROM public.units u
        JOIN public.tenancies t ON t.unit_id = u.id
        WHERE t.id = l.tenancy_id
        LIMIT 1
    ) AS unit_name,

    -- Move-in Date from Tenancy
    (
        SELECT t.move_in_date
        FROM public.tenancies t
        WHERE t.id = l.tenancy_id
        LIMIT 1
    ) AS move_in_date,

    -- Lease Details
    l.start_date,
    l.end_date,
    l.rent_amount,
    l.deposit_amount,
    l.lease_status

FROM public.leases l
WHERE l.is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.view_leases TO authenticated;

-- ============================================
-- 2. Ensure view_availabilities_metrics exists
-- ============================================
CREATE OR REPLACE VIEW public.view_availabilities_metrics AS
SELECT
    a.unit_id,
    a.property_code,
    a.unit_name,
    a.status,
    a.leasing_agent,
    a.ready_date,
    a.move_out_date,
    a.move_in_date,
    a.amenities,
    -- Future Tenancy Status (e.g., 'Applicant', 'Future', 'Denied')
    t.status AS future_status,
    -- Operational Category: 'Available', 'Applied', 'Leased'
    CASE
        WHEN t.status IN ('Future', 'Current') THEN 'Leased'
        WHEN t.status IN ('Applicant') THEN 'Applied'
        ELSE 'Available'
    END AS operational_status,
    -- Turnover Days: Ready Date - Move Out Date
    (a.ready_date - a.move_out_date) AS turnover_days,
    -- Vacant Days: If Future Lease exists -> Gap between leases. If Not -> Gap until Today.
    CASE
        WHEN a.move_in_date IS NOT NULL THEN (a.move_in_date - a.move_out_date)
        ELSE (CURRENT_DATE - a.move_out_date)
    END AS vacant_days
FROM public.availabilities a
LEFT JOIN public.tenancies t ON a.future_tenancy_id = t.id;

-- Grant access to authenticated users
GRANT SELECT ON public.view_availabilities_metrics TO authenticated;

-- ============================================
-- 3. Fix availabilities.is_active constraint
-- ============================================
-- Set default value for is_active
ALTER TABLE public.availabilities ALTER COLUMN is_active SET DEFAULT true;

-- Update any NULL values to true before adding NOT NULL constraint
UPDATE public.availabilities SET is_active = true WHERE is_active IS NULL;

-- Add NOT NULL constraint
ALTER TABLE public.availabilities ALTER COLUMN is_active SET NOT NULL;
