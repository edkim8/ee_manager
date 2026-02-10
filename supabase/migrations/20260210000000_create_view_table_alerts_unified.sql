-- ============================================================
-- Unified Alerts View: UNION of Yardi Alerts and App Flags
-- ============================================================
-- Purpose: Combine both Yardi-sourced alerts and App-generated
--          unit flags into a single queryable view for the
--          Office > Alerts dashboard.
-- ============================================================

CREATE OR REPLACE VIEW view_table_alerts_unified AS

-- ========== YARDI ALERTS ==========
SELECT
    a.id,
    'Yardi'::text AS source,
    a.property_code,
    a.unit_id,
    COALESCE(u.unit_name, a.unit_name) AS unit_name,
    b.name AS building_name,
    a.description AS title,
    NULL::text AS message,
    a.resident,
    'warning'::text AS severity,
    a.is_active,
    a.created_at,
    NULL::timestamptz AS resolved_at,
    NULL::uuid AS resolved_by,
    -- Calculate if overdue (>5 working days)
    (
        SELECT COUNT(*)
        FROM generate_series(
            a.created_at::date,
            CURRENT_DATE,
            '1 day'::interval
        ) AS day
        WHERE EXTRACT(DOW FROM day) NOT IN (0, 6) -- Exclude Sat/Sun
    ) > 5 AS is_overdue,
    -- Calculate days open (calendar days for active alerts)
    CASE
        WHEN a.is_active THEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - a.created_at)::integer
        ELSE 0
    END AS days_open
FROM alerts a
LEFT JOIN units u ON a.unit_id = u.id
LEFT JOIN buildings b ON u.building_id = b.id

UNION ALL

-- ========== APP FLAGS ==========
SELECT
    uf.id,
    'App'::text AS source,
    uf.property_code,
    uf.unit_id,
    u.unit_name,
    b.name AS building_name,
    uf.title,
    uf.message,
    NULL::text AS resident,
    uf.severity,
    (uf.resolved_at IS NULL) AS is_active,
    uf.created_at,
    uf.resolved_at,
    uf.resolved_by,
    -- Calculate if overdue (>5 working days)
    (
        SELECT COUNT(*)
        FROM generate_series(
            uf.created_at::date,
            COALESCE(uf.resolved_at::date, CURRENT_DATE),
            '1 day'::interval
        ) AS day
        WHERE EXTRACT(DOW FROM day) NOT IN (0, 6) -- Exclude Sat/Sun
    ) > 5 AS is_overdue,
    -- Calculate days open (calendar days for active flags)
    CASE
        WHEN uf.resolved_at IS NULL THEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - uf.created_at)::integer
        ELSE 0
    END AS days_open
FROM unit_flags uf
LEFT JOIN units u ON uf.unit_id = u.id
LEFT JOIN buildings b ON u.building_id = b.id;

-- ============================================================
-- Grant read access to authenticated users
-- ============================================================
GRANT SELECT ON view_table_alerts_unified TO authenticated;
