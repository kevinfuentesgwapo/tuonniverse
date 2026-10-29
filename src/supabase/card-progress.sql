-- Tuoniverse: card_progress (spaced repetition).
-- One row per student per card: when it is due, and how well they know it.
-- Safe to run many times (idempotent).
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1) Create the table. We copy the id types from your real cards and sets
--    tables, so this works whether they use uuid or numbers.
do $$
declare
  card_type text;
  set_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into card_type
    from pg_attribute a
   where a.attrelid = 'public.cards'::regclass and a.attname = 'id';

  select format_type(a.atttypid, a.atttypmod) into set_type
    from pg_attribute a
   where a.attrelid = 'public.sets'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.card_progress (
      user_id uuid not null references auth.users (id) on delete cascade,
      card_id %s not null references public.cards (id) on delete cascade,
      set_id %s not null references public.sets (id) on delete cascade,
      due_on date not null default current_date,
      interval_days integer not null default 0,
      ease numeric(4,2) not null default 2.30,
      reps integer not null default 0,
      lapses integer not null default 0,
      last_reviewed timestamptz,
      primary key (user_id, card_id)
    )
  $f$, card_type, set_type);
end $$;

-- 2) Fast "what is due for me?" lookups.
create index if not exists card_progress_due_idx
  on public.card_progress (user_id, due_on);

create index if not exists card_progress_set_idx
  on public.card_progress (user_id, set_id);

-- 3) Row Level Security: each student only touches their own rows.
alter table public.card_progress enable row level security;

drop policy if exists "card_progress select own" on public.card_progress;
create policy "card_progress select own"
  on public.card_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "card_progress insert own" on public.card_progress;
create policy "card_progress insert own"
  on public.card_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "card_progress update own" on public.card_progress;
create policy "card_progress update own"
  on public.card_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "card_progress delete own" on public.card_progress;
create policy "card_progress delete own"
  on public.card_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);