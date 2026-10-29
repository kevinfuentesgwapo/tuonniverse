-- Lets study_sessions.mode accept 'test' (plus the older modes).
-- Safe to run twice. It finds the old rule by itself, removes it, and adds the new one.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.study_sessions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%mode%'
  loop
    execute format('alter table public.study_sessions drop constraint %I', c.conname);
  end loop;

  alter table public.study_sessions
    add constraint study_sessions_mode_check
    check (mode in ('flashcards', 'quiz', 'write', 'match', 'test'));
end $$;