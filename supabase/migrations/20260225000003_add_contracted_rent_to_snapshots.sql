-- Migration: Add avg_contracted_rent to availability snapshot system
-- Date: 2026-02-25
-- Description: Adds actual contracted rent (from leases.rent_amount) to snapshots.
--   - avg_offered_rent = Yardi "Market Rent" (asking price / market rate)
--   - avg_contracted_rent = average active lease rent_amount (what tenants actually pay)
--   - rent_spread_pct now measures the discount between offered and contracted rent

-- 1. Add column to base table
ALTER TABLE public.availability_snapshots
  ADD COLUMN IF NOT EXISTS avg_contracted_rent NUMERIC(10, 2);

-- 2. Rebuild view_availability_daily_trend (explicit SELECT — must include new column)
-- Must DROP + recreate (not CREATE OR REPLACE) because we're inserting a column in the middle,
-- which PostgreSQL does not allow with CREATE OR REPLACE.
DROP VIEW IF EXISTS public.view_availability_daily_trend;
CREATE VIEW public.view_availability_daily_trend WITH (security_invoker = true) AS
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
  avg_contracted_rent,
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
  -- Derived: rent spread — offered (market asking) vs contracted (actual lease) rent
  -- Positive = tenants pay less than asking price (discount / effective concession)
  CASE
    WHEN avg_offered_rent > 0 AND avg_contracted_rent IS NOT NULL
    THEN ROUND(((avg_offered_rent - avg_contracted_rent) / avg_offered_rent) * 100, 1)
    ELSE 0
  END AS rent_spread_pct
FROM public.availability_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY property_code, snapshot_date ASC;

GRANT SELECT ON public.view_availability_daily_trend TO authenticated;

-- 3. Rebuild view_availability_weekly_trend (include avg_contracted_rent + fix rent_spread_pct)
DROP VIEW IF EXISTS public.view_availability_weekly_trend;
CREATE VIEW public.view_availability_weekly_trend WITH (security_invoker = true) AS
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
  ROUND(AVG(avg_contracted_rent), 2)      AS avg_contracted_rent,
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
    WHEN AVG(avg_offered_rent) > 0 AND AVG(avg_contracted_rent) IS NOT NULL
    THEN ROUND(((AVG(avg_offered_rent) - AVG(avg_contracted_rent)) / AVG(avg_offered_rent)) * 100, 1)
    ELSE 0
  END AS avg_rent_spread_pct
FROM public.availability_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '52 weeks'
GROUP BY property_code, DATE_TRUNC('week', snapshot_date)
ORDER BY property_code, week_start ASC;

GRANT SELECT ON public.view_availability_weekly_trend TO authenticated;
