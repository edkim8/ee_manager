-- Fix: Make 'documents' bucket public so getPublicUrl() works for PDFs and other file attachments.
--
-- Root cause: bucket was created as public=false in 20260208163000_storage_bucket.sql.
-- Code calls supabase.storage.from('documents').getPublicUrl() which generates a public-endpoint
-- URL (storage/v1/object/public/documents/...). Since the bucket isn't public, that endpoint
-- returns {"statusCode":"404","error":"Bucket not found"} on access.
--
-- The upload itself succeeded (Auth Upload Documents policy exists), so files are in storage
-- but cannot be opened. Making the bucket public fixes the URL without any code changes.
--
-- Security note: All users of this system are authenticated staff. Document URLs contain
-- random strings (not guessable). This matches the same model used by the 'images' bucket.

UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- Also add the missing update and delete policies that were omitted from the original migration.
-- Without these, staff cannot remove documents they uploaded.

CREATE POLICY "Auth Update Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'documents' );

CREATE POLICY "Auth Delete Documents"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' );
