-- Migration: Fix availability_snapshots RLS write access for authenticated Solver
-- Date: 2026-02-26
-- Description: Migration 20260225000004 enabled RLS on availability_snapshots with only
--   a FOR SELECT policy, under the assumption that the Solver writes via service_role.
--   In practice, useSolverEngine.ts is a browser-side composable that writes using the
--   authenticated user's JWT — not service_role. This caused 403 Forbidden errors on
--   every snapshot POST (5 properties × 1 error per run), recovered only by fetch-retry
--   hitting a stale connection-pool connection.
--
--   This policy restores write access for authenticated users, matching the effective
--   permissions before RLS was enabled on this table.
--
--   Future: When snapshot writes are moved to a server-side API route using
--   SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS), this policy can be narrowed back
--   to FOR SELECT only.

CREATE POLICY "authenticated_can_write_availability_snapshots"
  ON public.availability_snapshots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
