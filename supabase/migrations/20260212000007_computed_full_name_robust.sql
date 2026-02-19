-- Refined computed full_name migration with data migration
-- 1. Preserve data from existing full_name column into first_name and last_name if they are empty
-- Note: This migration is safe even if full_name column was already dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'full_name'
  ) THEN
    UPDATE public.profiles
    SET
      first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
      last_name = COALESCE(last_name, trim(substring(full_name from position(' ' in full_name))))
    WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);
  END IF;
END $$;

-- 2. Drop the existing column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- 3. Drop existing function if parameter signature changed
DROP FUNCTION IF EXISTS public.profiles_full_name(public.profiles);

-- 4. Create the computed column function
-- PostgREST allows functions named table_name_column_name to act as computed columns
CREATE OR REPLACE FUNCTION public.profiles_full_name(profile_row public.profiles)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(coalesce(profile_row.first_name, '') || ' ' || coalesce(profile_row.last_name, ''));
$$;

-- 5. Ensure handle_new_user trigger is correct
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
