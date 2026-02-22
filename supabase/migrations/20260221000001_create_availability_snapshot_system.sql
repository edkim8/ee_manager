-- Migration: Availability Snapshot System
-- Date: 2026-02-21
-- Description: Captures daily availability snapshots per property for trend analysis.
-- Follows the same append-on-each-run pattern as the delinquencies system.

-- 1. availability_snapshots table
CREATE TABLE public.availability_snapshots (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solver_run_id           UUID REFERENCES solver_runs(id),
  property_code           TEXT NOT NULL,
  snapshot_date           DATE NOT NULL,
  -- Status counts
  available_count         INT NOT NULL DEFAULT 0,
  applied_count           INT NOT NULL DEFAULT 0,
  leased_count            INT NOT NULL DEFAULT 0,
  occupied_count          INT NOT NULL DEFAULT 0,
  total_active_count      INT NOT NULL DEFAULT 0,
  total_units             INT NOT NULL DEFAULT 0,
  -- Rent metrics
  avg_market_rent         NUMERIC(10,2),
  avg_offered_rent        NUMERIC(10,2),
  -- Operational metrics
  avg_days_on_market      NUMERIC(10,1),
  avg_concession_days     NUMERIC(10,1),
  avg_concession_amount   NUMERIC(10,2),
  price_changes_count     INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent re-runs: same property+date = ignore duplicate
CREATE UNIQUE INDEX ON public.availability_snapshots(property_code, snapshot_date);

GRANT SELECT ON public.availability_snapshots TO authenticated;

-- 2. view_availability_daily_trend — last 30 days, one row per property per day
CREATE OR REPLACE VIEW public.view_availability_daily_trend AS
SELECT
  property_code,
  snapshot_date,
  available_count,
  applied_count,
  leased_count,
  occupied_count,
  total_active_count,
  total_units,
  avg_market_rent,
  avg_offered_rent,
  avg_days_on_market,
  avg_concession_days,
  avg_concession_amount,
  price_changes_count,
  -- Derived: vacancy rate as percentage of total units
  CASE
    WHEN total_units > 0
    THEN ROUND((available_count::NUMERIC / total_units) * 100, 1)
    ELSE 0
  END AS vacancy_rate,
  -- Derived: rent spread percentage (market vs offered)
  CASE
    WHEN avg_market_rent > 0
    THEN ROUND(((avg_market_rent - avg_offered_rent) / avg_market_rent) * 100, 1)
    ELSE 0
  END AS rent_spread_pct
FROM public.availability_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY property_code, snapshot_date ASC;

GRANT SELECT ON public.view_availability_daily_trend TO authenticated;

-- 3. view_availability_weekly_trend — last 52 weeks, weekly averages
-- Gaps (weeks with no data) appear as nulls in the result set — rendered as placeholders in charts.
CREATE OR REPLACE VIEW public.view_availability_weekly_trend AS
SELECT
  property_code,
  DATE_TRUNC('week', snapshot_date)::DATE AS week_start,
  ROUND(AVG(available_count), 1)          AS avg_available_count,
  ROUND(AVG(applied_count), 1)            AS avg_applied_count,
  ROUND(AVG(leased_count), 1)             AS avg_leased_count,
  ROUND(AVG(occupied_count), 1)           AS avg_occupied_count,
  ROUND(AVG(total_active_count), 1)       AS avg_total_active,
  ROUND(AVG(total_units), 0)              AS avg_total_units,
  ROUND(AVG(avg_market_rent), 2)          AS avg_market_rent,
  ROUND(AVG(avg_offered_rent), 2)         AS avg_offered_rent,
  ROUND(AVG(avg_days_on_market), 1)       AS avg_days_on_market,
  ROUND(AVG(avg_concession_days), 1)      AS avg_concession_days,
  ROUND(AVG(avg_concession_amount), 2)    AS avg_concession_amount,
  SUM(price_changes_count)                AS total_price_changes,
  COUNT(*)                                AS days_in_week,
  -- Derived metrics (weekly averages)
  CASE
    WHEN ROUND(AVG(total_units), 0) > 0
    THEN ROUND((AVG(available_count) / AVG(total_units)) * 100, 1)
    ELSE 0
  END AS avg_vacancy_rate,
  CASE
    WHEN AVG(avg_market_rent) > 0
    THEN ROUND(((AVG(avg_market_rent) - AVG(avg_offered_rent)) / AVG(avg_market_rent)) * 100, 1)
    ELSE 0
  END AS avg_rent_spread_pct
FROM public.availability_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '52 weeks'
GROUP BY property_code, DATE_TRUNC('week', snapshot_date)
ORDER BY property_code, week_start ASC;

GRANT SELECT ON public.view_availability_weekly_trend TO authenticated;
