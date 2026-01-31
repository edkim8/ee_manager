-- Migration: Add screening_result column to applications table
-- Purpose: Track screening results and enable overdue detection
-- Date: 2026-01-31

-- Remove redundant columns (status can be derived from screening_result, is_overdue uses unit_flags)
ALTER TABLE public.applications 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS is_overdue;

-- Add screening_result column
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS screening_result TEXT;

-- Add unique index for upsert conflict resolution
DROP INDEX IF EXISTS idx_applications_unique_key;
CREATE UNIQUE INDEX idx_applications_unique_key 
ON public.applications(property_code, unit_id, applicant_name, application_date);

-- Create index for efficient overdue detection queries
DROP INDEX IF EXISTS idx_applications_overdue;
CREATE INDEX idx_applications_overdue 
ON public.applications(application_date, screening_result) 
WHERE screening_result IS NULL;

-- Drop old status index (no longer needed)
DROP INDEX IF EXISTS idx_applications_status;

-- Add comment for documentation
COMMENT ON COLUMN public.applications.screening_result IS 'Screening result status: Approved, Denied, or NULL if pending. Application status can be derived from this field.';
