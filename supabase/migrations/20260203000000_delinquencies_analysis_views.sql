-- Migration: Delinquencies Dashboard Analytics
-- Date: 2026-02-03
-- Description: Provides views and functions for delinquency summary and 26th-of-month trend analysis.

-- 1. View for CURRENT summary (Active only)
CREATE OR REPLACE VIEW public.view_delinquencies_current_summary AS
SELECT
    property_code,
    SUM(total_unpaid) as total_unpaid_sum,
    SUM(days_0_30) as days_0_30_sum,
    SUM(days_31_60) as days_31_60_sum,
    SUM(days_61_90) as days_61_90_sum,
    SUM(days_90_plus) as days_90_plus_sum,
    SUM(prepays) as prepays_sum,
    SUM(balance) as balance_sum,
    COUNT(*) as resident_count
FROM public.delinquencies
WHERE is_active = true
GROUP BY property_code;

-- 2. Function to get historical snapshots for the 26th of each month
-- This reconstructs the "State of the World" as of the 26th 23:59:59 for past months.
CREATE OR REPLACE FUNCTION public.get_delinquencies_monthly_26th_snapshots(
    p_property_code TEXT,
    p_months_count INT DEFAULT 4
)
RETURNS TABLE (
    snapshot_date DATE,
    total_unpaid NUMERIC(15,2),
    days_0_30 NUMERIC(15,2),
    days_31_60 NUMERIC(15,2),
    days_61_90 NUMERIC(15,2),
    days_90_plus NUMERIC(15,2),
    prepays NUMERIC(15,2),
    balance NUMERIC(15,2)
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE months AS (
        -- Start with the current month's 26th (or previous month if 26th hasn't passed)
        SELECT 
            CASE 
                WHEN EXTRACT(DAY FROM CURRENT_DATE) >= 26 
                THEN (date_trunc('month', CURRENT_DATE) + interval '25 days')::DATE
                ELSE (date_trunc('month', CURRENT_DATE) - interval '5 days')::DATE -- 26th of previous month
            END as target_date,
            1 as iteration
        UNION ALL
        SELECT 
            (target_date - interval '1 month')::DATE,
            iteration + 1
        FROM months
        WHERE iteration < p_months_count
    ),
    tenancy_snapshots AS (
        -- For each target_date and each tenancy, find the LATEST record created on or before that date
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
            ROW_NUMBER() OVER (PARTITION BY m.target_date, d.tenancy_id ORDER BY d.created_at DESC) as rank
        FROM months m
        CROSS JOIN public.delinquencies d
        WHERE d.property_code = p_property_code
          AND d.created_at <= (m.target_date + interval '1 day') -- Including the full 26th
    )
    SELECT 
        ts.target_date as snapshot_date,
        SUM(ts.total_unpaid)::NUMERIC(15,2) as total_unpaid,
        SUM(ts.days_0_30)::NUMERIC(15,2) as days_0_30,
        SUM(ts.days_31_60)::NUMERIC(15,2) as days_31_60,
        SUM(ts.days_61_90)::NUMERIC(15,2) as days_61_90,
        SUM(ts.days_90_plus)::NUMERIC(15,2) as days_90_plus,
        SUM(ts.prepays)::NUMERIC(15,2) as prepays,
        SUM(ts.balance)::NUMERIC(15,2) as balance
    FROM tenancy_snapshots ts
    WHERE ts.rank = 1 -- Latest record as of that date
    GROUP BY ts.target_date
    ORDER BY ts.target_date DESC;
END;
$$;

-- 3. View for DAILY trend (Trailing 30 days)
CREATE OR REPLACE VIEW public.view_delinquencies_daily_trend AS
SELECT
    property_code,
    created_at::DATE as snapshot_date,
    SUM(total_unpaid) as total_unpaid_sum,
    SUM(balance) as balance_sum
FROM public.delinquencies
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY property_code, created_at::DATE
ORDER BY snapshot_date ASC;
