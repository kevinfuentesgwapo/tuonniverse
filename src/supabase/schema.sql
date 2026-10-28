-- TUONIVERSE DATABASE
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.
--
-- Tables that already exist (reference):
--   profiles(id, display_name, created_at)
--   sets(id, user_id, title, description, created_at, updated_at)
--   cards(id, set_id, user_id, term, definition, position, created_at)
--   notes(id, user_id, title, content, created_at, updated_at)
--   ai_usage(id, user_id, used_on, count)

-- 1) Make sure new rows get an id, a date, and an owner automatically.
alter table public.sets  alter column id         set default gen_random_uuid();
alter table public.sets  alter column created_at set default now();
alter table public.sets  alter column updated_at set default now();
alter table public.sets  alter column user_id    set default auth.uid();

alter table public.cards alter column id         set default gen_random_uuid();
alter table public.cards alter column created_at set default now();
alter table public.cards alter column user_id    set default auth.uid();

-- 2) Star hard cards (used later by the study modes).
alter table public.cards
  add column if not exists starred boolean not null default false;

-- 3) Faster loading of a set's cards in order.
create index if not exists cards_set_position_idx
  on public.cards (set_id, position);

-- 4) Remember each study round. Powers streaks, the daily goal,
--    "Continue studying", and cards due later.
create table if not exists public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  set_id      uuid references public.sets (id) on delete set null,
  mode        text not null check (mode in ('flashcards', 'quiz', 'write')),
  cards_done  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, created_at desc);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own" on public.study_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own" on public.study_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own" on public.study_sessions
  for delete using (auth.uid() = user_id);