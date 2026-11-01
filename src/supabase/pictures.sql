-- TUONIVERSE: PICTURES ON CARDS (step 1: database + storage)
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.
--
-- How it works:
--   * Each card can have ONE picture. Its place is saved in cards.image_path,
--     like  <user id>/<random name>.webp  inside the bucket "card-images".
--   * The bucket is PUBLIC: anyone who has the exact picture link can see it.
--     File names are long and random, and nothing lists them.
--   * Only a logged-in person can upload, and only into their own folder.
--     Free-plan room is small (1 GB), so each person may keep 100 pictures.
--   * A shared set's copy points to the SAME file. A file can only be deleted
--     when NO card anywhere still uses it (picture_in_use below).

-- 1) The picture place on each card (empty = no picture).
alter table public.cards add column if not exists image_path text;

alter table public.cards drop constraint if exists cards_image_path_len;
alter table public.cards add constraint cards_image_path_len
  check (image_path is null or char_length(image_path) between 1 and 200);

create index if not exists cards_image_path_idx
  on public.cards (image_path) where image_path is not null;

-- 2) The bucket. Public. Small files only (the app shrinks pictures first).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images', 'card-images', true, 524288,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Is this picture still used by any card (anyone's)?
create or replace function public.picture_in_use(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cards where image_path = p_path);
$$;

revoke all on function public.picture_in_use(text) from public, anon;
grant execute on function public.picture_in_use(text) to authenticated;

-- 4) Who may do what with the files (reading a public bucket needs no rule).
drop policy if exists "card images insert own" on storage.objects;
drop policy if exists "card images select own" on storage.objects;
drop policy if exists "card images delete own" on storage.objects;

-- Counting pictures inside a rule on storage.objects makes the rule call
-- itself again and again (upload fails with "database schema is invalid").
-- So the counting lives in a helper function that skips the rules.
create or replace function public.my_picture_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from storage.objects o
   where o.bucket_id = 'card-images'
     and (storage.foldername(o.name))[1] = (select auth.uid()::text);
$$;

revoke all on function public.my_picture_count() from public, anon;
grant execute on function public.my_picture_count() to authenticated;

-- Upload: only into your own folder, and at most 100 pictures in total.
create policy "card images insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.my_picture_count() < 100
  );

-- See (list) only your own files.
create policy "card images select own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Delete only your own files, and never a file another card still uses.
create policy "card images delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not public.picture_in_use(name)
  );

-- 5) Shared sets now also tell which picture each card has.
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
                json_build_object(
                  'term', c.term,
                  'definition', c.definition,
                  'image_path', c.image_path)
                order by c.position, c.created_at)
         from public.cards c
        where c.set_id = s.id),
      '[]'::json)
  )
  from public.sets s
  where p_code is not null and s.share_code = p_code;
$$;

-- 6) A saved copy keeps the picture place (same file, no new upload).
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

  insert into public.cards (set_id, user_id, term, definition, position, image_path)
  select v_new, auth.uid(), term, definition, position, image_path
    from public.cards where set_id = v_src;

  return v_new;
end;
$$;

-- 7) Who may call what (same as before).
revoke all on function public.copy_shared_set(text) from public, anon;
grant execute on function public.copy_shared_set(text) to authenticated;

revoke all on function public.get_shared_set(text) from public, anon;
grant execute on function public.get_shared_set(text) to anon, authenticated;

-- CHECK (optional): run these after the script.
--   select id, public, file_size_limit from storage.buckets where id = 'card-images';
--   select column_name from information_schema.columns
--    where table_name = 'cards' and column_name = 'image_path';