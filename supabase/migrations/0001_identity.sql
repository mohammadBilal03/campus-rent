-- MODULE: identity (Member A). Run first.
create extension if not exists btree_gist;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  hostel_or_dept text,
  role text not null default 'student' check (role in ('student', 'admin')),
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_read on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users may only change these two columns (cannot make themselves admin).
revoke update on public.profiles from authenticated;
grant update (full_name, hostel_or_dept) on public.profiles to authenticated;

-- Only university emails can sign up. CHANGE THE DOMAIN BELOW to your own.
create or replace function public.enforce_university_domain()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) not like '%@nsut.ac.in' then
    raise exception 'Only @nsut.ac.in email addresses can sign up';
  end if;
  return new;
end; $$;

create trigger enforce_domain
  before insert on auth.users
  for each row execute function public.enforce_university_domain();

-- Create the profile row automatically on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
