-- Migration: Add RLS policies for availabilities and unit_flags
-- Date: 2026-02-02
-- Purpose: Enable authenticated users to perform all operations on these tables

-- =====================================================
-- RLS Policies for availabilities table
-- =====================================================

-- Drop existing policies if any (safety)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.availabilities;

-- Create permissive policy for authenticated users
CREATE POLICY "Allow all for authenticated users"
ON public.availabilities
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow all for authenticated users" ON public.availabilities IS
'Allows authenticated users to perform SELECT, INSERT, UPDATE, DELETE on availabilities table';

-- =====================================================
-- RLS Policies for unit_flags table
-- =====================================================

-- Drop existing policies if any (safety)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.unit_flags;

-- Create permissive policy for authenticated users
CREATE POLICY "Allow all for authenticated users"
ON public.unit_flags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow all for authenticated users" ON public.unit_flags IS
'Allows authenticated users to perform SELECT, INSERT, UPDATE, DELETE on unit_flags table';
