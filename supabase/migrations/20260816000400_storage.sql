-- OFFICE RELAY : Supabase Storage for asset photos
-- Bucket is private. Object paths are {organization_id}/{item_id}/{filename}
-- so the first path segment is the owning organization.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  false,
  10485760, -- 10 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Asset photos are part of the public asset information: any signed-in
-- organization may read them (signed URLs are issued with the user's JWT).
create policy "item_images_read_authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'item-images');

-- Only members of the owning organization may upload into their own folder.
create policy "item_images_insert_own_org"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-images'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

-- No overwriting of another organization's objects.
create policy "item_images_update_own_org"
on storage.objects for update to authenticated
using (
  bucket_id = 'item-images'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'item-images'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

-- No deleting of another organization's objects.
create policy "item_images_delete_own_org"
on storage.objects for delete to authenticated
using (
  bucket_id = 'item-images'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);
