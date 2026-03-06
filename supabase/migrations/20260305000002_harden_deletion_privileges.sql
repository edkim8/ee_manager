-- =====================================================
-- Harden Deletion Privileges (V1.0)
-- Date: 2026-03-05
-- Purpose: Restrict DELETE to record creators (auth.uid()) or Super Admins (is_admin())
-- Implements: docs/governance/DELETION_CLEANUP_PROTOCOL.md Section 6
-- =====================================================
-- Requires: public.is_admin() helper (created in 20260203100000_fix_admin_rls.sql)
--           Checks public.profiles.is_super_admin = true for the calling user.
-- Legacy records (created_by / uploaded_by IS NULL): admin-only deletion.
-- =====================================================

-- =====================================================
-- 1. public.locations
-- Was: USING (true) — any authenticated user could delete any location
-- Now: creator or admin only
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.locations;

CREATE POLICY "Allow creator or admin to delete location"
ON public.locations
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin());

-- =====================================================
-- 2. public.location_notes
-- Was: USING (created_by = auth.uid() OR created_by IS NULL)
--      (legacy NULL loophole let any user delete unowned notes)
-- Now: creator or admin only; legacy NULL notes → admin-only
-- =====================================================
DROP POLICY IF EXISTS "Allow users to delete own notes or legacy notes" ON public.location_notes;
-- Also drop the original policy in case the relaxed one was never applied
DROP POLICY IF EXISTS "Allow users to delete own notes" ON public.location_notes;

CREATE POLICY "Allow creator or admin to delete note"
ON public.location_notes
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin());

-- =====================================================
-- 3. public.location_note_attachments
-- Was: USING (uploaded_by = auth.uid() OR uploaded_by IS NULL)
--      (legacy NULL loophole let any user delete unowned attachments)
-- Now: uploader or admin only; legacy NULL attachments → admin-only
-- =====================================================
DROP POLICY IF EXISTS "Allow users to delete own attachments or legacy attachments" ON public.location_note_attachments;
-- Also drop the original policy in case the relaxed one was never applied
DROP POLICY IF EXISTS "Allow users to delete own attachments" ON public.location_note_attachments;

CREATE POLICY "Allow creator or admin to delete note attachment"
ON public.location_note_attachments
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_admin());

-- =====================================================
-- 4. public.attachments (polymorphic — inventory, etc.)
-- Drop any existing permissive delete policy and replace with creator-or-admin.
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated delete access to attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow users to delete own attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON public.attachments;

CREATE POLICY "Allow creator or admin to delete attachment"
ON public.attachments
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_admin());
