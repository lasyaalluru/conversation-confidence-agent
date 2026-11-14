-- Confidence Coach — starter database schema for Supabase.
-- Run in Supabase → SQL Editor. Review before running; this is a starting point, not final.
-- Row Level Security (RLS) ensures each signed-in user can only read/write their own data.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferred_ui_language text not null default 'en' check (preferred_ui_language in ('en', 'zh-CN')),
  practice_language text not null default 'en' check (practice_language in ('en', 'zh-CN')),
  created_at timestamptz not null default now()
);

-- Scenarios live in code (lib/scenarios.ts) for now; this table is for when they move to the DB.
create table if not exists public.scenarios (
  id text primary key,
  title text not null,
  language text not null check (language in ('en', 'zh-CN')),
  difficulty text not null,
  objectives jsonb not null default '[]'
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null,
  practice_language text not null check (practice_language in ('en', 'zh-CN')),
  confidence_before smallint check (confidence_before between 1 and 5),
  confidence_after smallint check (confidence_after between 1 and 5),
  turns smallint not null default 0,
  started_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  feedback_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null check (language in ('en', 'zh-CN')),
  phrase text not null,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  mission_text text not null,
  completion_status text not null default 'pending' check (completion_status in ('pending', 'tried', 'skipped')),
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.scenarios enable row level security;
alter table public.sessions enable row level security;
alter table public.feedback enable row level security;
alter table public.saved_phrases enable row level security;
alter table public.missions enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scenarios are readable" on public.scenarios
  for select using (true);

create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own saved phrases" on public.saved_phrases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "feedback for own sessions" on public.feedback
  for all using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

create policy "missions for own sessions" on public.missions
  for all using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));
