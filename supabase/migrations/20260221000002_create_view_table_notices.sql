-- =====================================================
-- View: view_table_notices
-- Purpose: Active Notice tenancies with resident, unit, building, and lease context
-- Date: 2026-02-21
-- =====================================================

CREATE OR REPLACE VIEW public.view_table_notices AS
SELECT
    t.id                        AS tenancy_id,
    t.property_code,
    t.unit_id,
    u.unit_name,
    t.status                    AS tenancy_status,
    t.move_in_date,
    t.move_out_date,

    -- Primary resident
    r.id                        AS resident_id,
    r.name                      AS resident_name,
    r.email                     AS resident_email,
    r.phone                     AS resident_phone,

    -- Building context
    b.id                        AS building_id,
    b.name                      AS building_name,

    -- Active lease financials
    l.start_date                AS lease_start_date,
    l.end_date                  AS lease_end_date,
    l.rent_amount,

    -- Computed: days remaining until move-out (negative = overdue)
    (t.move_out_date - CURRENT_DATE) AS days_until_moveout

FROM public.tenancies t
LEFT JOIN public.units u        ON t.unit_id = u.id
LEFT JOIN public.buildings b    ON u.building_id = b.id
LEFT JOIN public.residents r    ON t.id = r.tenancy_id
                                AND r.role = 'Primary'
                                AND r.is_active = true
LEFT JOIN public.leases l       ON t.id = l.tenancy_id
                                AND l.is_active = true
WHERE t.status = 'Notice'
ORDER BY t.property_code, t.move_out_date;

GRANT SELECT ON public.view_table_notices TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON VIEW public.view_table_notices IS 'Active Notice tenancies with resident, unit, building, and lease context. Sorted by property then move-out date.';
