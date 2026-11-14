-- ConvoConfidence AI — initial schema.
-- Apply in Supabase: Dashboard → SQL Editor → paste & run (or `supabase db push` with the CLI).
-- Every table has Row Level Security: a signed-in user can only read/write their own rows.
-- Guests never touch the database (their progress lives in their browser).

-- ---------- Profiles ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  comfort_level smallint not null default 1 check (comfort_level between 1 and 3),
  goals text[] not null default '{}',
  baseline_confidence smallint check (baseline_confidence between 1 and 5),
  onboarding_completed_at timestamptz,
  consent jsonb not null default '{"storeTranscripts": true, "pilotReflections": true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Scenarios (reference data; the app's source of truth is lib/scenarios) ----------
create table if not exists public.scenarios (
  id text primary key,
  title text not null,
  category text not null check (category in ('everyday', 'social', 'group', 'academic', 'professional')),
  description text not null,
  status text not null default 'coming_soon' check (status in ('available', 'coming_soon')),
  difficulty_config jsonb not null default '{}',
  learning_objectives jsonb not null default '[]'
);

insert into public.scenarios (id, title, category, description, status, learning_objectives)
values ('ordering-coffee', 'Ordering coffee', 'everyday',
        'Greet the barista, place your order, and handle a small surprise.', 'available',
        '["respond_to_greeting","return_question","make_request","handle_surprise","close_politely"]')
on conflict (id) do nothing;

-- ---------- Practice sessions ----------
create table if not exists public.practice_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null references public.scenarios (id),
  comfort_level smallint not null check (comfort_level between 1 and 3),
  mode text not null check (mode in ('live', 'demo')),
  status text not null check (status in ('in_progress', 'completed', 'ended_early')),
  started_at timestamptz not null,
  ended_at timestamptz,
  confidence_before smallint check (confidence_before between 1 and 5),
  confidence_after smallint check (confidence_after between 1 and 5),
  user_turn_count smallint not null default 0,
  events jsonb not null default '[]',      -- raw timing events for future analytics
  reflection jsonb                         -- optional pilot reflection
);
create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

-- ---------- Conversation turns (transcripts; deleted if the user turns off transcript storage) ----------
create table if not exists public.conversation_turns (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  sequence smallint not null,
  speaker text not null check (speaker in ('ai', 'user')),
  transcript text not null,
  spoken_at timestamptz not null,
  input_mode text check (input_mode in ('voice', 'text')),
  stage text,
  unique (session_id, sequence)
);

-- ---------- Feedback ----------
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  session_id uuid not null unique references public.practice_sessions (id) on delete cascade,
  summary text not null,
  strengths jsonb not null,
  improvements jsonb not null,
  alternative_phrases jsonb not null,
  reflection jsonb not null,
  mode text not null check (mode in ('live', 'demo')),
  feedback_version smallint not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- Saved phrases ----------
create table if not exists public.saved_phrases (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase text not null,
  context text,
  scenario_id text references public.scenarios (id),
  saved_at timestamptz not null default now(),
  next_review_at timestamptz,              -- reserved for spaced repetition
  unique (user_id, phrase)
);

-- ---------- Real-world missions ----------
create table if not exists public.missions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.practice_sessions (id) on delete cascade,
  scenario_id text references public.scenarios (id),
  mission_text text not null,
  completion_status text not null default 'pending'
    check (completion_status in ('pending', 'tried', 'not_yet', 'try_again')),
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles            enable row level security;
alter table public.scenarios           enable row level security;
alter table public.practice_sessions   enable row level security;
alter table public.conversation_turns  enable row level security;
alter table public.feedback            enable row level security;
alter table public.saved_phrases       enable row level security;
alter table public.missions            enable row level security;

create policy "scenarios are public reference data" on public.scenarios
  for select using (true);

create policy "own profile" on public.profiles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own sessions" on public.practice_sessions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own saved phrases" on public.saved_phrases
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own missions" on public.missions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "turns of own sessions" on public.conversation_turns
  for all to authenticated
  using (exists (select 1 from public.practice_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.practice_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

create policy "feedback of own sessions" on public.feedback
  for all to authenticated
  using (exists (select 1 from public.practice_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.practice_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
