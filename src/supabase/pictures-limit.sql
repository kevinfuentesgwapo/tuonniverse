-- TUONIVERSE: lower the picture limit to 30 per account.
-- Why: the free Supabase plan has 1 GB of file room for everyone.
-- People who already have more than 30 pictures keep them. They just cannot
-- add new ones until they are under 30.
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.
-- If you ever run pictures.sql again, run THIS file after it.

-- 1) The helper that counts pictures (same as pictures-fix.sql).
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

-- 2) The upload rule with the new limit.
drop policy if exists "card images insert own" on storage.objects;

create policy "card images insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.my_picture_count() < 30
  );