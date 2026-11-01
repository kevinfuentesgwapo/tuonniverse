-- TUONIVERSE: FIX for picture uploads (400 "database schema is invalid").
-- Cause: the upload rule counted rows in storage.objects INSIDE a rule on
-- storage.objects. That makes the rule call itself again and again.
-- Fix: do the counting in a small helper function that skips the rules.
-- Safe to run more than once. Paste all of it in Supabase > SQL Editor > Run.

-- 1) Helper: how many pictures does the logged-in person have?
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

-- 2) The upload rule again, now without the loop.
drop policy if exists "card images insert own" on storage.objects;

create policy "card images insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and public.my_picture_count() < 100
  );