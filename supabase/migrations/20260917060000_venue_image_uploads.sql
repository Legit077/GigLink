-- Real file uploads for venue photos, replacing pasted image URLs.
-- Files are stored under {owner_id}/{venue_id}/{filename} so ownership can be
-- checked from the storage path itself via RLS.

insert into storage.buckets (id, name, public)
values ('venue-images', 'venue-images', true)
on conflict (id) do nothing;

drop policy if exists venue_images_public_read on storage.objects;
create policy venue_images_public_read on storage.objects for select
  using (bucket_id = 'venue-images');

drop policy if exists venue_images_owner_insert on storage.objects;
create policy venue_images_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'venue-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.venues v
      where v.id::text = (storage.foldername(name))[2]
        and (v.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists venue_images_owner_delete on storage.objects;
create policy venue_images_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'venue-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.venues v
      where v.id::text = (storage.foldername(name))[2]
        and (v.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );
