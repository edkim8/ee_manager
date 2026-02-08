-- Migration: Fix RLS policies for all Solver tables
-- Date: 2026-02-02
-- Purpose: Ensure all tables have proper RLS policies for authenticated users

-- =====================================================
-- Enable RLS on unit_flags (was missing)
-- =====================================================
ALTER TABLE public.unit_flags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Drop and recreate policies to ensure they exist
-- (Idempotent - safe to run multiple times)
-- =====================================================

-- availabilities
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.availabilities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.availabilities;
CREATE POLICY "Enable all for authenticated users"
ON public.availabilities
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- unit_flags
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.unit_flags;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.unit_flags;
CREATE POLICY "Enable all for authenticated users"
ON public.unit_flags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- applications
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.applications;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.applications;
CREATE POLICY "Enable all for authenticated users"
ON public.applications
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- residents
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.residents;
CREATE POLICY "Enable all for authenticated users"
ON public.residents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- tenancies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.tenancies;
CREATE POLICY "Enable all for authenticated users"
ON public.tenancies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- leases
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.leases;
CREATE POLICY "Enable all for authenticated users"
ON public.leases
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- import_staging
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.import_staging;
CREATE POLICY "Enable all for authenticated users"
ON public.import_staging
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- Add helpful comments
-- =====================================================
COMMENT ON POLICY "Enable all for authenticated users" ON public.availabilities IS
'Allows all authenticated users to perform SELECT, INSERT, UPDATE, DELETE on availabilities';

COMMENT ON POLICY "Enable all for authenticated users" ON public.unit_flags IS
'Allows all authenticated users to perform SELECT, INSERT, UPDATE, DELETE on unit_flags';

COMMENT ON POLICY "Enable all for authenticated users" ON public.applications IS
'Allows all authenticated users to perform SELECT, INSERT, UPDATE, DELETE on applications';
