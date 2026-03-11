-- Migration: Fix Delinquency Snapshot Date Bug + Tombstone Filtering
-- Date: 2026-03-10
-- Description:
--   1. Fixes the "26th of previous month" date calculation bug.
--      The prior formula used `- interval '5 days'` which produced the 24th, not the 26th.
--   2. Adds `total_unpaid > 0` filter to the monthly snapshot so tombstone ($0) records
--      for resolved tenancies are correctly excluded from historical totals.
--   3. Updates view_delinquencies_current_summary to exclude $0 tombstone records
--      from the active resident count.
--   4. Forces PostgREST schema cache reload so the resident history RPC is visible.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix get_delinquencies_monthly_26th_snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_delinquencies_monthly_26th_snapshots(
    p_property_code TEXT,
    p_months_count  INT DEFAULT 4
)
RETURNS TABLE (
    snapshot_date DATE,
    total_unpaid  NUMERIC(15,2),
    days_0_30     NUMERIC(15,2),
    days_31_60    NUMERIC(15,2),
    days_61_90    NUMERIC(15,2),
    days_90_plus  NUMERIC(15,2),
    prepays       NUMERIC(15,2),
    balance       NUMERIC(15,2)
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE months AS (
        -- Start with the 26th of the most-recently-completed Yardi cycle.
        -- If today is on or after the 26th, that is this month's 26th;
        -- otherwise it is the PREVIOUS month's 26th.
        SELECT
            CASE
                WHEN EXTRACT(DAY FROM CURRENT_DATE) >= 26
                THEN (date_trunc('month', CURRENT_DATE) + interval '25 days')::DATE
                -- FIX: was `date_trunc('month', CURRENT_DATE) - interval '5 days'`
                -- which gave the 24th of the prior month, not the 26th.
                ELSE (date_trunc('month', CURRENT_DATE) - interval '1 month' + interval '25 days')::DATE
            END AS target_date,
            1 AS iteration
        UNION ALL
        SELECT
            (target_date - interval '1 month')::DATE,
            iteration + 1
        FROM months
        WHERE iteration < p_months_count
    ),
    tenancy_snapshots AS (
        -- For each target_date × tenancy, find the LATEST record on or before that date
        SELECT
            m.target_date,
            d.tenancy_id,
            d.total_unpaid,
            d.days_0_30,
            d.days_31_60,
            d.days_61_90,
            d.days_90_plus,
            d.prepays,
            d.balance,
            ROW_NUMBER() OVER (
                PARTITION BY m.target_date, d.tenancy_id
                ORDER BY d.created_at DESC
            ) AS rank
        FROM months m
        CROSS JOIN public.delinquencies d
        WHERE d.property_code = p_property_code
          AND d.created_at <= (m.target_date + interval '1 day')
    )
    SELECT
        ts.target_date AS snapshot_date,
        SUM(ts.total_unpaid)::NUMERIC(15,2) AS total_unpaid,
        SUM(ts.days_0_30)::NUMERIC(15,2)    AS days_0_30,
        SUM(ts.days_31_60)::NUMERIC(15,2)   AS days_31_60,
        SUM(ts.days_61_90)::NUMERIC(15,2)   AS days_61_90,
        SUM(ts.days_90_plus)::NUMERIC(15,2) AS days_90_plus,
        SUM(ts.prepays)::NUMERIC(15,2)      AS prepays,
        SUM(ts.balance)::NUMERIC(15,2)      AS balance
    FROM tenancy_snapshots ts
    WHERE ts.rank = 1
      AND ts.total_unpaid > 0  -- Exclude $0 tombstone records for resolved tenancies
    GROUP BY ts.target_date
    ORDER BY ts.target_date DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update current summary view to exclude $0 tombstones from resident count
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_delinquencies_current_summary AS
SELECT
    property_code,
    SUM(total_unpaid)  AS total_unpaid_sum,
    SUM(days_0_30)     AS days_0_30_sum,
    SUM(days_31_60)    AS days_31_60_sum,
    SUM(days_61_90)    AS days_61_90_sum,
    SUM(days_90_plus)  AS days_90_plus_sum,
    SUM(prepays)       AS prepays_sum,
    SUM(balance)       AS balance_sum,
    COUNT(*)           AS resident_count
FROM public.delinquencies
WHERE is_active    = true
  AND total_unpaid > 0  -- Exclude $0 tombstone records
GROUP BY property_code;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Force PostgREST schema cache reload so the resident history RPC is visible
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
