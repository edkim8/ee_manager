-- ============================================================
-- MANUAL SQL UPDATE FOR STEP 2D (APPLICATIONS)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Remove redundant columns
-- (status can be derived from screening_result, is_overdue uses unit_flags)
ALTER TABLE public.applications 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS is_overdue;

-- 2. Add screening_result column
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS screening_result TEXT;

-- 3. Add unique index for upsert conflict resolution
DROP INDEX IF EXISTS idx_applications_unique_key;
CREATE UNIQUE INDEX idx_applications_unique_key 
ON public.applications(property_code, unit_id, applicant_name, application_date);

-- 4. Create index for efficient overdue detection queries
DROP INDEX IF EXISTS idx_applications_overdue;
CREATE INDEX idx_applications_overdue 
ON public.applications(application_date, screening_result) 
WHERE screening_result IS NULL;

-- 5. Drop old status index (no longer needed)
DROP INDEX IF EXISTS idx_applications_status;

-- 6. Add comment for documentation
COMMENT ON COLUMN public.applications.screening_result IS 'Screening result status: Approved, Denied, or NULL if pending. Application status can be derived from this field.';

-- ============================================================
-- VERIFICATION QUERIES (run these after the above)
-- ============================================================

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'applications' 
ORDER BY ordinal_position;

-- Check that unique index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'applications' 
  AND indexname = 'idx_applications_unique_key';

-- Check that overdue index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'applications' 
  AND indexname = 'idx_applications_overdue';

-- ============================================================
-- DONE! After running this, refresh your browser and try again
-- ============================================================
