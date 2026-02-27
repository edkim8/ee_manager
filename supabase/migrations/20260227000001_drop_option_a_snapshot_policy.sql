-- Option A cleanup: drop the authenticated write policy on availability_snapshots.
-- Option B (server route using service_role) confirmed live 2026-02-27.
-- The solver now writes snapshots via /api/solver/save-snapshot which bypasses RLS entirely.

DROP POLICY IF EXISTS "authenticated_can_write_availability_snapshots" ON public.availability_snapshots;
