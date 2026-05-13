--Memory Tide — Supabase backend
--
-- Env (Vercel /- local):
--   SUPABASE_URL                 — optional server alias for project URL
--   NEXT_PUBLIC_SUPABASE_URL     — required in client bundle (same URL as dashboard)
--   SUPABASE_ANON_KEY            — optional server copy
--   NEXT_PUBLIC_SUPABASE_ANON_KEY — required for browser singleton + direct reads
--   SUPABASE_SERVICE_ROLE_KEY    — required for writes (uploads, echoes/wishes PATCH, quest-photos).
--                                 Optional for read-only `/api/world-memory` if anon + RLS public SELECT exist.
--   NEXT_PUBLIC_MEMORY_GALLERY_CLOUD=1 — legacy: enable cloud without publishing anon (API-only reads)
--
--   NEXT_PUBLIC_STORAGE_BUCKET   — same bucket name for **browser** Storage uploads (Trace/Wish attachments).
--   Grant anon `INSERT` on that bucket if uploads are unauthenticated (tighten in production if needed).
--
-- 1. Create Storage bucket (e.g. memory-fragments, public read) in Dashboard → Storage; match NEXT_PUBLIC_STORAGE_BUCKET.
-- 2. Enable Realtime for table `public.memory_images` if you want cross-device live gallery updates (Memory Dump).
-- 3. Run this script in the SQL editor.
-- 4. Memory hub tables (`memories`, `memory_texts`, `memory_images`, `timeline_entries`):
--    used by `/api/memory-hub` + `useLandmarks` when Supabase is configured (see `.env.example`).

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

-- Trace / Wish quest pins: link fragments to world_echoes / world_wishes row ids.
alter table public.photos add column if not exists quest_variant text;
alter table public.photos add column if not exists world_place_id text;
alter table public.photos add column if not exists place_query text;
alter table public.photos add column if not exists lat double precision;
alter table public.photos add column if not exists lng double precision;

create index if not exists photos_quest_place_idx on public.photos (quest_variant, world_place_id);

comment on column public.photos.quest_variant is 'trace | wish — which quest route owns this row.';
comment on column public.photos.world_place_id is 'Payload id from world_echoes or world_wishes.';

-- ---------------------------------------------------------------------------
-- Memory core (landmark hub + timeline). Writes via service role (Next API).
-- Enable Realtime on these tables only if you need live multi-device UI.
-- ---------------------------------------------------------------------------

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  tags text[] not null default '{}'::text[],
  landmark_date text,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_texts (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists memory_texts_memory_id_idx on public.memory_texts (memory_id);

create table if not exists public.memory_images (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  image_url text not null,
  caption text not null default '',
  storage_path text,
  fragment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memory_images_memory_id_idx on public.memory_images (memory_id);
create index if not exists memory_images_created_at_idx on public.memory_images (created_at desc);

create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  date date not null default (timezone ('utc', now()))::date,
  memory_id uuid references public.memories (id) on delete set null
);

create index if not exists timeline_entries_memory_id_date_idx
  on public.timeline_entries (memory_id, date desc);

alter table public.memories enable row level security;
alter table public.memory_texts enable row level security;
alter table public.memory_images enable row level security;
alter table public.timeline_entries enable row level security;

create policy "memories_select_public"
  on public.memories for select
  using (true);

create policy "memory_texts_select_public"
  on public.memory_texts for select
  using (true);

create policy "memory_images_select_public"
  on public.memory_images for select
  using (true);

create policy "timeline_entries_select_public"
  on public.timeline_entries for select
  using (true);

-- Canonical Yunnan row (matches `lib/memory-core-constants.ts`).
insert into public.memories (id, name, lat, lng)
values (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'Yunnan',
  25.04,
  102.72
)
on conflict (id) do nothing;

comment on table public.memories is 'Geographic memory anchors (lat/lng).';
comment on table public.memory_texts is 'Free-form text lines attached to a memory.';
comment on table public.memory_images is 'Image URLs attached to a memory.';
comment on table public.timeline_entries is 'Dated timeline rows; memory_id null = global.';

-- ---------------------------------------------------------------------------
-- Shared world (Trace / Wish / Eternal) — one global state for all visitors.
-- ---------------------------------------------------------------------------

create table if not exists public.world_echoes (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists world_echoes_created_idx on public.world_echoes (created_at desc);

create table if not exists public.world_wishes (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists world_wishes_created_idx on public.world_wishes (created_at desc);

create table if not exists public.world_eternal (
  id smallint primary key default 1 check (id = 1),
  anchor_iso date,
  milestones jsonb not null default '[]'::jsonb,
  birthday_whispers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.world_eternal (id) values (1) on conflict (id) do nothing;

alter table public.world_echoes enable row level security;
alter table public.world_wishes enable row level security;
alter table public.world_eternal enable row level security;

create policy "world_echoes_select_public"
  on public.world_echoes for select
  using (true);

create policy "world_wishes_select_public"
  on public.world_wishes for select
  using (true);

create policy "world_eternal_select_public"
  on public.world_eternal for select
  using (true);

-- Existing projects: add columns introduced after first deploy.
alter table public.memory_images add column if not exists storage_path text;
alter table public.memory_images add column if not exists fragment jsonb not null default '{}'::jsonb;
