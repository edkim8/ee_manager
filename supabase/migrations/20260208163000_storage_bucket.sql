-- 1. Create 'images' bucket (Public)
-- Used for: Locations, Property Photos, Avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- 2. Create 'documents' bucket (Private/Authenticated only)
-- Used for: Contracts, Invoices, Manuals
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Enable RLS logic
-- (Note: storage.objects usually has RLS enabled by default. If not, you might need superuser permissions.)
-- alter table storage.objects enable row level security;

-- POLICY: IMAGES (Public Read, Auth Insert)
create policy "Public Access Images"
on storage.objects for select
to public
using ( bucket_id = 'images' );

create policy "Auth Upload Images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'images' );

create policy "Auth Update Images"
on storage.objects for update
to authenticated
using ( bucket_id = 'images' );

create policy "Auth Delete Images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'images' );

-- POLICY: DOCUMENTS (Auth Read, Auth Insert)
create policy "Auth Access Documents"
on storage.objects for select
to authenticated
using ( bucket_id = 'documents' );

create policy "Auth Upload Documents"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'documents' );
