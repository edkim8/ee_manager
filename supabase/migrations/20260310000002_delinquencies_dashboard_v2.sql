-- Migration: Delinquencies Dashboard V2 Enhancements
-- Date: 2026-03-10
-- Description:
--   1. Extends daily trend view window from 30 → 90 days for monthly-level visibility.
--   2. Adds get_delinquency_resident_history RPC for per-tenancy historical pattern data
--      (months on list, peak balance, previous month balance) powering the residents table.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend daily trend view to 90-day window
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_delinquencies_daily_trend AS
SELECT
    property_code,
    created_at::DATE        AS snapshot_date,
    SUM(total_unpaid)       AS total_unpaid_sum,
    SUM(balance)            AS balance_sum
FROM public.delinquencies
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  AND total_unpaid > 0  -- exclude $0 tombstone records from trend line
GROUP BY property_code, created_at::DATE
ORDER BY snapshot_date ASC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Per-tenancy history RPC for the Delinquent Residents table
--
-- Returns one row per tenancy_id that has any record within the look-back window.
-- Callers join this to view_table_delinquent_residents by tenancy_id.
--
-- Columns:
--   tenancy_id          TEXT
--   months_on_list      INT     -- distinct calendar months with a positive-balance record
--   peak_unpaid         NUMERIC -- max total_unpaid in the window
--   prev_month_unpaid   NUMERIC -- latest total_unpaid from the *previous* calendar month
--                                  (NULL if no record exists for that month)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_delinquency_resident_history(
    p_property_code  TEXT,
    p_months_count   INT DEFAULT 12
)
RETURNS TABLE (
    tenancy_id          TEXT,
    months_on_list      INT,
    peak_unpaid         NUMERIC(15,2),
    prev_month_unpaid   NUMERIC(15,2)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_window_start      TIMESTAMPTZ;
    v_prev_month_start  TIMESTAMPTZ;
    v_prev_month_end    TIMESTAMPTZ;
BEGIN
    v_window_start     := date_trunc('month', CURRENT_TIMESTAMP) - (p_months_count || ' months')::INTERVAL;
    v_prev_month_start := date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1 month';
    v_prev_month_end   := date_trunc('month', CURRENT_TIMESTAMP);

    RETURN QUERY
    WITH window_records AS (
        -- All positive-balance records within the look-back window for this property
        SELECT
            d.tenancy_id,
            d.total_unpaid,
            date_trunc('month', d.created_at) AS record_month
        FROM public.delinquencies d
        WHERE d.property_code = p_property_code
          AND d.created_at   >= v_window_start
          AND d.total_unpaid  > 0
    ),
    prev_month_latest AS (
        -- Most-recent record per tenancy within the previous calendar month
        SELECT DISTINCT ON (d.tenancy_id)
            d.tenancy_id,
            d.total_unpaid
        FROM public.delinquencies d
        WHERE d.property_code = p_property_code
          AND d.created_at   >= v_prev_month_start
          AND d.created_at    < v_prev_month_end
          AND d.total_unpaid  > 0
        ORDER BY d.tenancy_id, d.created_at DESC
    ),
    stats AS (
        SELECT
            w.tenancy_id,
            COUNT(DISTINCT w.record_month)::INT  AS months_on_list,
            MAX(w.total_unpaid)::NUMERIC(15,2)   AS peak_unpaid
        FROM window_records w
        GROUP BY w.tenancy_id
    )
    SELECT
        s.tenancy_id,
        s.months_on_list,
        s.peak_unpaid,
        pm.total_unpaid::NUMERIC(15,2) AS prev_month_unpaid
    FROM stats s
    LEFT JOIN prev_month_latest pm ON s.tenancy_id = pm.tenancy_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delinquency_resident_history TO authenticated, service_role;
