-- =============================================================================
-- Supabase Storage — Memory Dump / gallery uploads (browser uses anon key)
-- =============================================================================
-- 1) Dashboard → Storage → create bucket id **memory-fragments** (or match NEXT_PUBLIC_STORAGE_BUCKET).
--    Mark **Public** if the app uses getPublicUrl() without signed URLs.
-- 2) Run in SQL Editor. Replace bucket id in policies if yours differs.
-- 3) Idempotent: DROP IF EXISTS + INSERT bucket ON CONFLICT.

insert into storage.buckets (id, name, public)
values ('memory-fragments', 'memory-fragments', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "memory_fragments_public_read" on storage.objects;
create policy "memory_fragments_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memory-fragments');

drop policy if exists "memory_fragments_anon_insert" on storage.objects;
create policy "memory_fragments_anon_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'memory-fragments');

drop policy if exists "memory_fragments_anon_delete_fragments" on storage.objects;
create policy "memory_fragments_anon_delete_fragments"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'memory-fragments' and name like 'fragments/%');
