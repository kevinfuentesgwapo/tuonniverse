-- TUONIVERSE: tighten who may UPDATE a card (security check, Nov 2026)
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.
--
-- Why: the rule "own cards" (for ALL actions) already lets a student change
-- their own cards, AND it checks that the set belongs to them.
-- The extra rule "Users update own cards" only checked user_id, so it was a
-- looser second door: someone could try to move their own card into a set
-- that belongs to another student (they would need that set's secret id).
-- Rules are OR-ed, so the looser one won. We remove it.

drop policy if exists "Users update own cards" on public.cards;

-- If star-fix.sql is ever run again, run THIS file again after it.

-- CHECK (optional): after the script, "cards" should show only "own cards".
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'cards';