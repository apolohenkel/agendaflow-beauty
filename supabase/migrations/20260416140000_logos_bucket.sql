-- Bucket logos + policies tenant-scoped. Aplicada via MCP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists logos_public_read on storage.objects;
create policy logos_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists logos_member_insert on storage.objects;
create policy logos_member_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select org_id::text from public.organization_members where user_id = auth.uid()
  ));

drop policy if exists logos_member_update on storage.objects;
create policy logos_member_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select org_id::text from public.organization_members where user_id = auth.uid()
  ))
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select org_id::text from public.organization_members where user_id = auth.uid()
  ));

drop policy if exists logos_member_delete on storage.objects;
create policy logos_member_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (
    select org_id::text from public.organization_members where user_id = auth.uid()
  ));
