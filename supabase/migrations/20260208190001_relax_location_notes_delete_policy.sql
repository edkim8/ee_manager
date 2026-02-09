-- Alternative: Relax the delete policies to handle legacy notes and attachments
-- This allows users to delete items where created_by/uploaded_by is NULL OR matches their user ID

-- =====================================================
-- Fix: location_notes delete policy
-- =====================================================
DROP POLICY IF EXISTS "Allow users to delete own notes" ON public.location_notes;

-- Create a more permissive policy
-- Allows delete if:
-- 1. The note was created by the current user (created_by = auth.uid())
-- 2. OR the note has no creator assigned (created_by IS NULL) - legacy notes
CREATE POLICY "Allow users to delete own notes or legacy notes"
ON public.location_notes
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
    OR created_by IS NULL
);

-- =====================================================
-- Fix: location_note_attachments delete policy
-- =====================================================
DROP POLICY IF EXISTS "Allow users to delete own attachments" ON public.location_note_attachments;

-- Create a more permissive policy for attachments
-- Allows delete if:
-- 1. The attachment was uploaded by the current user (uploaded_by = auth.uid())
-- 2. OR the attachment has no uploader assigned (uploaded_by IS NULL) - legacy attachments
CREATE POLICY "Allow users to delete own attachments or legacy attachments"
ON public.location_note_attachments
FOR DELETE
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR uploaded_by IS NULL
);
