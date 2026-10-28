-- Edit set fix. Run this ONLY if saving a change fails.
-- Safe to run twice.

drop policy if exists "Users update own sets" on public.sets;
create policy "Users update own sets"
  on public.sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users update own cards" on public.cards;
create policy "Users update own cards"
  on public.cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);