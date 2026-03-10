-- Migration: Solver Data Retention Policy
-- Date: 2026-03-10
-- Purpose: Prevent unbounded growth of solver_events and solver_runs tables.
--
-- Retention tiers (two-tier strategy):
--   solver_events  → 90 days   (full event detail: 3 complete monthly cycles)
--   solver_runs    → 365 days  (batch-level summary + JSONB: full year trend baseline)
--
-- solver_events rows are deleted directly by event_date (not via CASCADE from solver_runs).
-- This preserves the run-level summary rows for the full year while purging granular event
-- detail after 90 days — the point at which apartment patterns repeat and detail loses value.
--
-- Jobs run via pg_cron:
--   Event pruning  → daily at 03:00 UTC (low-traffic window)
--   Run pruning    → 1st of each month at 04:00 UTC

-- ─────────────────────────────────────────────────────────────
-- 1. Enable pg_cron extension (idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────────────────────
-- 2. Grant pg_cron usage to postgres role (required by Supabase)
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA cron TO postgres;

-- ─────────────────────────────────────────────────────────────
-- 3. Retention helper function
--    Called by both cron jobs. Also safe to call manually.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_solver_retention()
RETURNS TABLE(events_deleted BIGINT, runs_deleted BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events_deleted BIGINT := 0;
  v_runs_deleted   BIGINT := 0;
BEGIN
  -- Purge detailed events older than 90 days
  -- (Preserves the parent solver_run row — run-level summaries stay for 1 year)
  DELETE FROM public.solver_events
  WHERE event_date < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;

  -- Purge completed run records older than 365 days
  -- ON DELETE CASCADE on solver_events means any remaining events for these
  -- runs (edge case: events with NULL event_date) are also removed.
  DELETE FROM public.solver_runs
  WHERE completed_at < NOW() - INTERVAL '365 days'
    AND status IN ('completed', 'failed');
  GET DIAGNOSTICS v_runs_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_events_deleted, v_runs_deleted;
END;
$$;

COMMENT ON FUNCTION public.run_solver_retention() IS
'Enforces two-tier retention policy: solver_events purged after 90 days, solver_runs after 365 days. Safe to call manually or via pg_cron.';

-- ─────────────────────────────────────────────────────────────
-- 4. Schedule cron jobs
--    Unschedule first (idempotent — safe to re-run migration)
-- ─────────────────────────────────────────────────────────────

-- Remove any existing jobs with these names before (re-)creating
SELECT cron.unschedule('solver-events-retention') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'solver-events-retention'
);

SELECT cron.unschedule('solver-runs-retention') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'solver-runs-retention'
);

-- Job 1: Prune solver_events daily at 03:00 UTC
SELECT cron.schedule(
  'solver-events-retention',
  '0 3 * * *',
  $$SELECT public.run_solver_retention()$$
);

-- Job 2: Prune solver_runs on the 1st of each month at 04:00 UTC
-- (Runs monthly because annual-old runs accumulate slowly)
SELECT cron.schedule(
  'solver-runs-retention',
  '0 4 1 * *',
  $$SELECT public.run_solver_retention()$$
);

-- ─────────────────────────────────────────────────────────────
-- 5. Add index to support fast retention deletes if not present
-- ─────────────────────────────────────────────────────────────
-- solver_events already has idx_solver_events_date on event_date DESC.
-- solver_runs already has idx_solver_runs_date on upload_date DESC.
-- Add completed_at index for the runs delete path (not previously indexed).
CREATE INDEX IF NOT EXISTS idx_solver_runs_completed_at
  ON public.solver_runs(completed_at DESC)
  WHERE completed_at IS NOT NULL;
