-- TUONIVERSE: SHARE LINKS FOR SETS
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.
--
-- How it works:
--   * A set is private while sets.share_code is NULL.
--   * Turning sharing on gives the set a long random code.
--   * People with the code can only READ that one set (never change it).
--   * "Save a copy" makes a NEW set for the logged-in person.
--   * The sets/cards tables stay private. No one can list shared sets.

-- 1) The share code column (empty = not shared).
alter table public.sets add column if not exists share_code text;

alter table public.sets drop constraint if exists sets_share_code_len;
alter table public.sets add constraint sets_share_code_len
  check (share_code is null or char_length(share_code) >= 12);

create unique index if not exists sets_share_code_key
  on public.sets (share_code) where share_code is not null;

-- 2) Owner turns sharing on or off. Returns the code (or NULL when off).
create or replace function public.set_sharing(p_set_id uuid, p_enabled boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Please log in first.';
  end if;

  if p_enabled then
    update public.sets
       set share_code = coalesce(
             share_code,
             substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
     where id = p_set_id and user_id = auth.uid()
     returning share_code into v_code;

    if v_code is null then
      raise exception 'Set not found.';
    end if;
  else
    update public.sets
       set share_code = null
     where id = p_set_id and user_id = auth.uid();
    v_code := null;
  end if;

  return v_code;
end;
$$;

-- 3) Anyone with the code can read the set and its cards (no user ids shown).
create or replace function public.get_shared_set(p_code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'title', s.title,
    'description', s.description,
    'cards', coalesce(
      (select json_agg(
                json_build_object('term', c.term, 'definition', c.definition)
                order by c.position, c.created_at)
         from public.cards c
        where c.set_id = s.id),
      '[]'::json)
  )
  from public.sets s
  where p_code is not null and s.share_code = p_code;
$$;

-- 4) A logged-in person saves a copy into their own account.
create or replace function public.copy_shared_set(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src uuid;
  v_new uuid;
begin
  if auth.uid() is null then
    raise exception 'Please log in first.';
  end if;

  select id into v_src from public.sets where share_code = p_code;
  if v_src is null then
    raise exception 'This link is not shared anymore.';
  end if;

  insert into public.sets (user_id, title, description)
  select auth.uid(), title, description
    from public.sets where id = v_src
  returning id into v_new;

  insert into public.cards (set_id, user_id, term, definition, position)
  select v_new, auth.uid(), term, definition, position
    from public.cards where set_id = v_src;

  return v_new;
end;
$$;

-- 5) Who may call what.
revoke all on function public.set_sharing(uuid, boolean) from public, anon;
grant execute on function public.set_sharing(uuid, boolean) to authenticated;

revoke all on function public.copy_shared_set(text) from public, anon;
grant execute on function public.copy_shared_set(text) to authenticated;

revoke all on function public.get_shared_set(text) from public, anon;
grant execute on function public.get_shared_set(text) to anon, authenticated;