-- Memory Tide — global shared gallery (photos + videos)
-- Run in Supabase SQL editor after creating project.
-- 1. Create Storage bucket "memory-fragments" (public read) in Dashboard → Storage.
-- 2. Run this script.

create extension if not exists "pgcrypto";

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  bytes bigint not null default 0,
  caption text not null default '',
  author_name text not null,
  author_avatar text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);

alter table public.photos enable row level security;

-- Everyone can read (global gallery). Tighten in production if needed.
create policy "photos_select_public"
  on public.photos for select
  using (true);

-- Inserts/updates/deletes are performed with the service role (server API only),
-- which bypasses RLS. Do NOT grant anon/authenticated insert on public buckets without auth.

comment on table public.photos is 'Global memory fragments; uploads via Next.js API + service role.';
