-- Add distribution and contribution GL codes to owner_profile_mapping
-- These are Yardi GL codes for individual owners who receive distributions
-- (e.g. TIC owners — only those who receive distributions need GL codes)

ALTER TABLE public.owner_profile_mapping
  ADD COLUMN IF NOT EXISTS distribution_gl TEXT,
  ADD COLUMN IF NOT EXISTS contribution_gl TEXT;
