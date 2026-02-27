-- Migration: Fix Security Definer Views & Enable RLS on missing tables
-- Date: 2026-02-25
-- Description: Addresses Supabase Security Advisor findings:
--   1. 24 views flagged as SECURITY DEFINER — switch to SECURITY INVOKER so each view
--      runs under the querying user's RLS context rather than the postgres superuser.
--      All underlying tables already have "all for authenticated" blanket policies,
--      so this change does NOT restrict any existing access.
--   2. availability_snapshots — enable RLS + SELECT policy for authenticated users.
--      Write operations happen exclusively via service_role (Solver), which bypasses RLS.
--   3. mtm_offer_history — same pattern: enable RLS + SELECT policy for authenticated.

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Switch all flagged views to SECURITY INVOKER
-- ─────────────────────────────────────────────────────────────────────────────

-- Availability views
ALTER VIEW public.view_availability_daily_trend    SET (security_invoker = true);
ALTER VIEW public.view_availability_weekly_trend   SET (security_invoker = true);
ALTER VIEW public.view_availabilities_metrics      SET (security_invoker = true);
ALTER VIEW public.view_table_availabilities        SET (security_invoker = true);

-- Leasing / pipeline views
ALTER VIEW public.view_leasing_pipeline            SET (security_invoker = true);
ALTER VIEW public.view_leases                      SET (security_invoker = true);
ALTER VIEW public.view_table_leases                SET (security_invoker = true);
ALTER VIEW public.view_floor_plan_pricing_summary  SET (security_invoker = true);
ALTER VIEW public.view_unit_pricing_analysis       SET (security_invoker = true);
ALTER VIEW public.view_concession_analysis         SET (security_invoker = true);

-- Residents / notices views
ALTER VIEW public.view_table_residents             SET (security_invoker = true);
ALTER VIEW public.view_table_notices               SET (security_invoker = true);
ALTER VIEW public.view_table_units                 SET (security_invoker = true);

-- Delinquencies views
ALTER VIEW public.view_delinquencies_daily_trend   SET (security_invoker = true);
ALTER VIEW public.view_delinquencies_current_summary SET (security_invoker = true);
ALTER VIEW public.view_table_delinquent_residents  SET (security_invoker = true);

-- Renewals views
ALTER VIEW public.view_renewal_worksheet_summaries SET (security_invoker = true);
ALTER VIEW public.view_renewal_pipeline_summary    SET (security_invoker = true);

-- Inventory views
ALTER VIEW public.view_inventory_summary_by_location SET (security_invoker = true);
ALTER VIEW public.view_inventory_item_definitions    SET (security_invoker = true);
ALTER VIEW public.view_inventory_installations       SET (security_invoker = true);

-- Alerts / make-ready views
ALTER VIEW public.view_table_alerts_unified        SET (security_invoker = true);
ALTER VIEW public.view_table_make_ready            SET (security_invoker = true);

-- Location views
ALTER VIEW public.location_notes_summary           SET (security_invoker = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Enable RLS on availability_snapshots
-- ─────────────────────────────────────────────────────────────────────────────
-- Solver writes rows via service_role (bypasses RLS).
-- Authenticated users read for analysis dashboards.

ALTER TABLE public.availability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_availability_snapshots"
  ON public.availability_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Enable RLS on mtm_offer_history
-- ─────────────────────────────────────────────────────────────────────────────
-- API routes write rows via service_role (bypasses RLS).
-- Authenticated users read for the renewals module.

ALTER TABLE public.mtm_offer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_mtm_offer_history"
  ON public.mtm_offer_history
  FOR SELECT
  TO authenticated
  USING (true);
