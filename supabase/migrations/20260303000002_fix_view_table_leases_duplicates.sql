-- Migration: Fix view_table_leases duplicate rows
-- Date: 2026-03-03
-- Problem: view_table_leases JOINs to residents without filtering to role='Primary'.
--          A lease with 2+ household members (Primary + Roommate/Occupant) produces
--          one row per active resident. This causes duplicate rows in Lease History
--          for any unit whose current tenancy has multiple household members.
--          Historical leases don't duplicate because old residents have is_active=false.
-- Fix: Use correlated subqueries for resident_id and resident_name (same pattern as
--      the original leases_view), so each lease always produces exactly one row.

-- Must DROP first — cannot use CREATE OR REPLACE to change a JOIN to subqueries
-- without risking column-order conflicts on the existing dashboard-created view.
DROP VIEW IF EXISTS public.view_table_leases;

CREATE VIEW public.view_table_leases AS
SELECT
    -- Lease core fields
    l.id,
    l.tenancy_id,
    l.property_code,
    l.is_active,
    l.lease_status,
    l.start_date,
    l.end_date,
    l.rent_amount,
    l.deposit_amount,

    -- Month-to-month: active lease whose end_date has already passed
    (l.lease_status = 'Current' AND l.end_date < CURRENT_DATE)::boolean AS is_mtm,

    -- Tenancy fields
    t.status AS tenancy_status,
    t.unit_id,
    t.move_in_date,
    t.move_out_date,

    -- Unit
    u.unit_name,

    -- Building
    b.id   AS building_id,
    b.name AS building_name,

    -- Primary resident — correlated subqueries prevent duplicate rows
    (
        SELECT r.id
        FROM public.residents r
        WHERE r.tenancy_id = l.tenancy_id
          AND r.role = 'Primary'
          AND r.is_active = true
        LIMIT 1
    ) AS resident_id,
    (
        SELECT r.name
        FROM public.residents r
        WHERE r.tenancy_id = l.tenancy_id
          AND r.role = 'Primary'
          AND r.is_active = true
        LIMIT 1
    ) AS resident_name,

    -- Household count (Primary + Roommate + Occupant)
    (
        SELECT COUNT(*)
        FROM public.residents r
        WHERE r.tenancy_id = l.tenancy_id
          AND r.role IN ('Primary', 'Roommate', 'Occupant')
          AND r.is_active = true
    ) AS household_count

FROM public.leases l
JOIN  public.tenancies t ON t.id = l.tenancy_id
JOIN  public.units     u ON u.id = t.unit_id
LEFT JOIN public.buildings b ON b.id = u.building_id;

GRANT SELECT ON public.view_table_leases TO authenticated;
