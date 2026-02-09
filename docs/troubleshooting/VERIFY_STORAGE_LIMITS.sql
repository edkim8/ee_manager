-- Check current storage bucket limits
SELECT
    id as bucket_name,
    name,
    public,
    file_size_limit as limit_bytes,
    ROUND(file_size_limit / 1024.0 / 1024.0, 2) || ' MB' as limit_mb,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
WHERE id IN ('images', 'documents')
ORDER BY id;
