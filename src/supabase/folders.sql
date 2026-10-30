-- Folders for sets. Safe to run more than one time.
-- If you delete a folder, its sets are NOT deleted. They just have no folder.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

alter table public.sets
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists sets_folder_id_idx on public.sets (folder_id);
create index if not exists folders_user_id_idx on public.folders (user_id);

alter table public.folders enable row level security;

drop policy if exists "folders select own" on public.folders;
drop policy if exists "folders insert own" on public.folders;
drop policy if exists "folders update own" on public.folders;
drop policy if exists "folders delete own" on public.folders;

create policy "folders select own" on public.folders
  for select using (auth.uid() = user_id);
create policy "folders insert own" on public.folders
  for insert with check (auth.uid() = user_id);
create policy "folders update own" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "folders delete own" on public.folders
  for delete using (auth.uid() = user_id);