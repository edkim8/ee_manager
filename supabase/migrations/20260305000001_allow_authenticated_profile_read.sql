-- =====================================================
-- Allow Authenticated Users to Read All Profiles
-- Date: 2026-03-05
-- Purpose: Internal staff app — all authenticated users are staff members
--          who need to see each other's display names (e.g. note creators).
--          Read-only. Update/Delete policies remain unchanged.
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
