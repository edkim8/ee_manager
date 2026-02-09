-- Fix existing location_notes that have NULL created_by field
-- This will allow users to delete notes they created before the fix

-- Update all notes with NULL created_by to use the first authenticated user
-- (Since you mentioned only authenticated users can create notes, this is safe)

-- Note: Run this in Supabase SQL Editor
-- If you want to assign all existing notes to YOUR specific user ID,
-- replace the subquery with your actual user ID from auth.users

UPDATE public.location_notes
SET created_by = (
    SELECT id
    FROM auth.users
    LIMIT 1
)
WHERE created_by IS NULL;

-- Verify the update
SELECT
    COUNT(*) as total_notes,
    COUNT(created_by) as notes_with_creator,
    COUNT(*) - COUNT(created_by) as notes_without_creator
FROM public.location_notes;
