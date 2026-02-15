-- Computed full_name for profiles
-- 1. Drop existing column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- 2. Add computed column function
-- When named as table_column, it acts as a computed column in PostgREST
CREATE OR REPLACE FUNCTION public.profiles_full_name(profile_row public.profiles)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(coalesce(profile_row.first_name, '') || ' ' || coalesce(profile_row.last_name, ''));
$$;

-- 3. Update handle_new_user trigger to parse names from metadata
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
