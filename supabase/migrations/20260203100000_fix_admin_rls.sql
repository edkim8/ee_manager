-- Migration: Fix Admin RLS policies (Attempt 4 - Named Dollar Quotes)
-- Date: 2026-02-03
-- Purpose: Use named dollar quotes to prevent "unterminated string" errors in certain SQL editors

-- 0. Helper Function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $policy$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$policy$;

-- 1. Profiles Table Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Create policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. User Property Access Policies
DROP POLICY IF EXISTS "Admins can manage all access" ON public.user_property_access;
DROP POLICY IF EXISTS "Admins can view all access" ON public.user_property_access;

-- Create policy for admins to view all access
CREATE POLICY "Admins can view all access"
  ON public.user_property_access FOR SELECT
  USING (public.is_admin());

-- Create policy for admins to perform all operations on access records
CREATE POLICY "Admins can manage all access"
  ON public.user_property_access FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
