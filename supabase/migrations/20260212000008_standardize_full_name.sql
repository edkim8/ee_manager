-- Standardize computed full_name function
-- 1. Ensure columns exist and full_name column is gone
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles DROP COLUMN full_name;
    END IF;
END $$;

-- 2. Rename function to just 'full_name' (PostgREST standard for computed columns)
DROP FUNCTION IF EXISTS public.profiles_full_name(public.profiles);
CREATE OR REPLACE FUNCTION public.full_name(p public.profiles)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''));
$$;

-- 3. Ensure RLS is permissive enough for the user themselves
-- (Assuming the policy from the first migration exists)
-- If not, this ensures it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 4. Simple trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$;
