-- Idempotent: fixes Memory Dump RLS for anon/authenticated (matches supabase/schema.sql).
-- Run in Supabase SQL Editor if uploads or gallery reads fail with permission / RLS errors.

drop policy if exists "memory_images_select_public" on public.memory_images;
create policy "memory_images_select_public"
  on public.memory_images for select
  to anon, authenticated
  using (true);

drop policy if exists "memory_images_insert_public" on public.memory_images;
create policy "memory_images_insert_public"
  on public.memory_images for insert
  to anon, authenticated
  with check (memory_id = 'a0000000-0000-4000-8000-000000000001'::uuid);

comment on policy "memory_images_insert_public" on public.memory_images is
  'Memory Dump: anon/authenticated may insert rows only for the canonical Yunnan memory id (lib/memory-core-constants.ts).';
