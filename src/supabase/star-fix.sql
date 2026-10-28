-- Lets you change your own cards (needed to save stars).
-- Safe to run twice. Run it ONLY if the check query shows no UPDATE or ALL policy on cards.
alter table public.cards enable row level security;

drop policy if exists "Users update own cards" on public.cards;
create policy "Users update own cards"
  on public.cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);