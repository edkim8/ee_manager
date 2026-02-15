-- Final standardization of full_name computed column
-- 1. Ensure the function name is 'profiles_full_name' (PostgREST standard: table_column)
DROP FUNCTION IF EXISTS public.full_name(public.profiles);
DROP FUNCTION IF EXISTS public.profiles_full_name(public.profiles);

CREATE OR REPLACE FUNCTION public.profiles_full_name(p public.profiles)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''));
$$;

-- 2. Ensure column full_name is gone
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- 3. Ensure RLS is permissive for the user themselves (Select, Update, Insert)
-- Using email as a backup check in RLS if ID is flaky in their environment
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id OR auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'email' = email);
