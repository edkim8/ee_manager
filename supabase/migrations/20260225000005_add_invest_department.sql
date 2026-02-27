-- Migration: Add 'Invest' to profiles department check constraint
-- Date: 2026-02-25

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check CHECK (
    department IS NULL
    OR department = ANY (ARRAY[
      'Leasing'::text,
      'Maintenance'::text,
      'Management'::text,
      'Invest'::text
    ])
  );
