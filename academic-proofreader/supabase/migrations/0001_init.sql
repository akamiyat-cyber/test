-- Phase 0: initial schema for the scientific paper authoring environment.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the
-- SQL editor of your Supabase project.

-- ---------------------------------------------------------------------------
-- profiles: 1 row per auth user, created automatically by trigger.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- documents: one manuscript workspace (body / captions / reviewer comments).
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled manuscript',
  journal_id text not null default 'general',
  style_preset_id text not null default 'general-academic',
  body_text text not null default '',
  caption_text text not null default '',
  reviewer_comments_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_updated_at_idx on public.documents (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- document_versions: one snapshot per proofreading run.
-- corrections / consistency_issues stay JSONB on purpose: their structure
-- follows the AI response schema and will evolve; we never query into them.
-- ---------------------------------------------------------------------------
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('body', 'caption')),
  original_text text not null,
  revised_text text not null,
  corrections jsonb not null default '[]'::jsonb,
  consistency_issues jsonb not null default '[]'::jsonb,
  journal_id text not null,
  style_preset_id text not null,
  created_at timestamptz not null default now()
);

create index document_versions_document_id_idx on public.document_versions (document_id, created_at desc);
create index document_versions_user_id_idx on public.document_versions (user_id);

-- ---------------------------------------------------------------------------
-- "references": bibliography entries, normalized to CSL-JSON (Phase 2).
-- Quoted name: REFERENCES is a reserved word in PostgreSQL.
-- ---------------------------------------------------------------------------
create table public."references" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  csl jsonb not null,
  doi text,
  title text,
  authors_text text,
  year integer,
  source text not null default 'manual'
    check (source in ('bibtex', 'ris', 'crossref', 'semantic-scholar', 'pubmed', 'manual')),
  created_at timestamptz not null default now()
);

create index references_user_id_idx on public."references" (user_id);
create index references_document_id_idx on public."references" (document_id);

-- ---------------------------------------------------------------------------
-- comments: co-author comments on corrections or the whole document.
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  target_type text not null check (target_type in ('correction', 'global')),
  target_label text,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_document_id_idx on public.comments (document_id, created_at desc);

-- ---------------------------------------------------------------------------
-- whitelist_terms: user's protected terminology.
-- ---------------------------------------------------------------------------
create table public.whitelist_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  preset_id text,
  created_at timestamptz not null default now(),
  unique (user_id, term)
);

-- ---------------------------------------------------------------------------
-- usage_events: AI call metering (Phase 5 quotas/billing groundwork).
-- Inserted by the server with the service-role key; user_id may be null for
-- anonymous calls. Users can read their own rows; nobody can write via RLS.
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  route text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index usage_events_user_id_created_at_idx on public.usage_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: owners only, everywhere.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public."references" enable row level security;
alter table public.comments enable row level security;
alter table public.whitelist_terms enable row level security;
alter table public.usage_events enable row level security;

create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own document_versions" on public.document_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own references" on public."references"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own comments" on public.comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own whitelist_terms" on public.whitelist_terms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage_events: read own rows only; inserts happen via service role (bypasses RLS).
create policy "own usage read" on public.usage_events
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance for documents.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute procedure public.touch_updated_at();
