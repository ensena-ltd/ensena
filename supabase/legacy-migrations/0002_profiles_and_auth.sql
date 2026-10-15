-- Real user identity, backing the first phase of the backend migration
-- described in the architecture audit: authentication + role.
--
-- Scope note: `role` here is the coarse 3-way split the whole frontend is
-- already built around (student / tutor / admin — see src/lib/demo-auth.ts).
-- The more granular Platform User staff roles (Super Admin, Customer
-- Support, Finance, ...) already modeled in src/lib/admin-permissions-data.ts
-- stay a separate concern for a later migration — this table only answers
-- "which of the three dashboards does this person get."

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'tutor', 'admin')),
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user can read and update their own profile row.
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can read every profile (needed for the Admin dashboard's
-- Students/Tutors/Platform Users screens once they read from this table
-- instead of the current mock data).
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-creates a profile row whenever a new auth.users row is created.
-- `role` and `full_name` are expected in the signup call's user metadata,
-- e.g. supabase.auth.signUp({ email, password, options: { data: { role:
-- 'student', full_name: 'Cynthia Ejie' } } }) — see src/lib/actions/auth.ts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps `updated_at` current on every profile edit.
create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_profile_updated_at();
