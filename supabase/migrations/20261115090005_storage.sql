-- College Ready-AI — file storage.
--
-- Two private buckets. Nothing a student uploads is ever public: the site says
-- uploaded notes "are not shared with other students and are not published
-- anywhere", and a public bucket would quietly make that untrue.
--
-- Path convention, which the policies depend on:
--     study-uploads/<user id>/<deck id>/<original file name>
--     exports/<user id>/<iso timestamp>.json
-- The first folder is the owner. Everything below is theirs and nobody else's.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('study-uploads', 'study-uploads', false, 104857600),  -- 100 MB, as the site says
  ('exports',       'exports',       false,  52428800)
on conflict (id) do nothing;

-- A student reaches only their own folder, and only while the account is open.
-- Uploading is the one thing worth spelling out: without the `cr_is_active`
-- check a paused account could still push files into storage.
create policy uploads_read_own on storage.objects
  for select using (
    bucket_id = 'study-uploads'
    and split_part(name, '/', 1) = public.cr_uid()::text
  );

create policy uploads_write_own on storage.objects
  for insert with check (
    bucket_id = 'study-uploads'
    and split_part(name, '/', 1) = public.cr_uid()::text
    and public.cr_is_active()
  );

-- Deleting stays open to a paused account on purpose: taking your files out is
-- a right, not a feature of the plan.
create policy uploads_delete_own on storage.objects
  for delete using (
    bucket_id = 'study-uploads'
    and split_part(name, '/', 1) = public.cr_uid()::text
  );

-- Exports are written by the server and read once by the person who asked.
create policy exports_read_own on storage.objects
  for select using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = public.cr_uid()::text
  );

create policy exports_delete_own on storage.objects
  for delete using (
    bucket_id = 'exports'
    and split_part(name, '/', 1) = public.cr_uid()::text
  );
