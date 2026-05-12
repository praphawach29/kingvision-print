-- Fix blog RLS admin permissions and stabilize is_admin() lookup.
-- Run this in Supabase SQL Editor.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

drop policy if exists "Allow public read access on blog_posts" on public.blog_posts;
drop policy if exists "Allow admins to manage blog_posts" on public.blog_posts;
drop policy if exists "blog_posts_public_read" on public.blog_posts;
drop policy if exists "blog_posts_admin_all" on public.blog_posts;

alter table public.blog_posts enable row level security;

create policy "blog_posts_public_read"
on public.blog_posts
for select
to public
using ((published = true) or public.is_admin());

create policy "blog_posts_admin_all"
on public.blog_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;

notify pgrst, 'reload schema';

