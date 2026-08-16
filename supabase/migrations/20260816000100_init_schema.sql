-- OFFICE RELAY : core schema
-- B2B Circular Resource Relay Platform
-- All identifiers are English. UI language is Japanese.

create schema if not exists extensions;
create extension if not exists "vector" with schema extensions;
create extension if not exists "postgis" with schema extensions;

-- vector / geography types and operator classes live in "extensions"
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create type public.org_type as enum ('donor', 'startup');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type public.org_type not null,
  public_location text not null default '',
  -- geographic centre of the organization (PostGIS). Used for distance matching.
  location geography(Point, 4326),
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_id_idx on public.org_members (user_id);

-- ---------------------------------------------------------------------------
-- items (surplus office assets offered by a DONOR)
-- ---------------------------------------------------------------------------
create type public.item_status as enum ('available', 'reserved', 'transferred', 'archived');

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  quantity integer not null default 1 check (quantity > 0),
  condition text not null default 'good',
  public_location text not null default '',
  location geography(Point, 4326),
  pickup_deadline timestamptz,
  status public.item_status not null default 'available',
  -- pgvector embedding of "title + description" (gte-small, 384 dims)
  embedding vector(384),
  created_at timestamptz not null default now()
);

create index items_owner_org_id_idx on public.items (owner_org_id);
create index items_category_idx on public.items (category);
create index items_location_idx on public.items using gist (location);
create index items_embedding_idx on public.items using hnsw (embedding vector_cosine_ops);

-- private counterpart of items: never exposed to non-matched organizations
create table public.item_private_details (
  item_id uuid primary key references public.items (id) on delete cascade,
  exact_pickup_address text not null default '',
  contact_note text not null default '',
  updated_at timestamptz not null default now()
);

create table public.item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  storage_path text not null unique,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index item_media_item_id_idx on public.item_media (item_id);

-- ---------------------------------------------------------------------------
-- needs (assets a STARTUP is looking for)
-- ---------------------------------------------------------------------------
create type public.need_status as enum ('open', 'fulfilled', 'closed');

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  quantity integer not null default 1 check (quantity > 0),
  public_location text not null default '',
  location geography(Point, 4326),
  needed_by timestamptz,
  status public.need_status not null default 'open',
  embedding vector(384),
  created_at timestamptz not null default now()
);

create index needs_org_id_idx on public.needs (org_id);
create index needs_category_idx on public.needs (category);
create index needs_location_idx on public.needs using gist (location);
create index needs_embedding_idx on public.needs using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- services : the second exchange axis of OFFICE RELAY
-- ---------------------------------------------------------------------------
create table public.service_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  embedding vector(384),
  created_at timestamptz not null default now()
);

create table public.service_wants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  embedding vector(384),
  created_at timestamptz not null default now()
);

create index service_offers_org_id_idx on public.service_offers (org_id);
create index service_wants_org_id_idx on public.service_wants (org_id);
create index service_offers_embedding_idx on public.service_offers using hnsw (embedding vector_cosine_ops);
create index service_wants_embedding_idx on public.service_wants using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create type public.match_status as enum ('proposed', 'pending_donor', 'accepted', 'rejected');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  need_id uuid not null references public.needs (id) on delete cascade,
  donor_org_id uuid not null references public.organizations (id) on delete cascade,
  recipient_org_id uuid not null references public.organizations (id) on delete cascade,
  asset_score numeric(6, 2) not null default 0,
  quantity_score numeric(6, 2) not null default 0,
  service_score numeric(6, 2) not null default 0,
  location_score numeric(6, 2) not null default 0,
  urgency_score numeric(6, 2) not null default 0,
  total_score numeric(6, 2) not null default 0,
  -- transparency: which strategies contributed, distances, similarities
  score_detail jsonb not null default '{}'::jsonb,
  startup_accepted_at timestamptz,
  donor_accepted_at timestamptz,
  status public.match_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, need_id)
);

create index matches_donor_org_id_idx on public.matches (donor_org_id);
create index matches_recipient_org_id_idx on public.matches (recipient_org_id);

-- ---------------------------------------------------------------------------
-- transfers (created automatically once both sides accepted)
-- ---------------------------------------------------------------------------
create type public.transfer_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  delivery_method text not null default 'donor_pickup',
  scheduled_at timestamptz,
  status public.transfer_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Devin Connector Factory jobs
-- ---------------------------------------------------------------------------
create type public.connector_job_status as enum (
  'queued', 'analyzing', 'building', 'testing', 'pr_created', 'failed'
);

create table public.connector_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  supplier_name text not null,
  source_kind text not null default 'csv' check (source_kind in ('csv', 'api_spec')),
  source_sample text not null default '',
  status public.connector_job_status not null default 'queued',
  devin_session_id text,
  devin_session_url text,
  pull_request_url text,
  log jsonb not null default '[]'::jsonb,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index connector_jobs_org_id_idx on public.connector_jobs (org_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

create trigger connector_jobs_touch_updated_at
before update on public.connector_jobs
for each row execute function public.touch_updated_at();
