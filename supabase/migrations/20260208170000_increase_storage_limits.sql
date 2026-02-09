-- Increase storage bucket file size limits
-- Current: images=5MB, documents=10MB
-- New: images=20MB, documents=50MB

-- Update 'images' bucket: 5MB → 20MB (for high-res phone photos)
UPDATE storage.buckets
SET file_size_limit = 20971520  -- 20MB in bytes
WHERE id = 'images';

-- Update 'documents' bucket: 10MB → 50MB (for large PDFs with images)
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'documents';

-- Verify changes
SELECT
    id as bucket_name,
    public,
    file_size_limit,
    ROUND(file_size_limit / 1024.0 / 1024.0, 1) || ' MB' as size_limit_mb,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('images', 'documents')
ORDER BY id;
