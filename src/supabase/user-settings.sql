-- Settings for each student: daily goal and calm mode.
-- Safe to run more than one time.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal int not null default 10 check (daily_goal between 1 and 200),
  calm_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings select own" on public.user_settings;
drop policy if exists "user_settings insert own" on public.user_settings;
drop policy if exists "user_settings update own" on public.user_settings;
drop policy if exists "user_settings delete own" on public.user_settings;

create policy "user_settings select own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings insert own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings update own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings delete own" on public.user_settings
  for delete using (auth.uid() = user_id);