create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','tutor','admin','counsellor'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone, date_of_birth)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data->>'role','') in ('student','tutor','counsellor') then new.raw_user_meta_data->>'role' else 'student' end,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\\d{4}-\\d{2}-\\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Replace unsafe policies.
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy profiles_select_own_or_admin on public.profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_admin()));
create policy profiles_update_own_safe on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and role = (select role from public.profiles where id = (select auth.uid())));
create policy profiles_admin_update on public.profiles for update to authenticated using ((select private.is_admin())) with check (true);

-- Registration profile policies.
drop policy if exists "Admins can view all student registration profiles" on public.student_profiles;
drop policy if exists "Students can insert their own registration profile" on public.student_profiles;
drop policy if exists "Students can update their own registration profile" on public.student_profiles;
drop policy if exists "Students can view their own registration profile" on public.student_profiles;
create policy student_profiles_select on public.student_profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_admin()));
create policy student_profiles_insert on public.student_profiles for insert to authenticated with check ((select auth.uid()) = id and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='student'));
create policy student_profiles_update on public.student_profiles for update to authenticated using ((select auth.uid()) = id or (select private.is_admin())) with check ((select auth.uid()) = id or (select private.is_admin()));

drop policy if exists "Admins can view all tutor registration profiles" on public.tutor_profiles;
drop policy if exists "Tutors can insert their own registration profile" on public.tutor_profiles;
drop policy if exists "Tutors can view their own registration profile" on public.tutor_profiles;
create policy tutor_profiles_select on public.tutor_profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_admin()));
create policy tutor_profiles_insert on public.tutor_profiles for insert to authenticated with check ((select auth.uid()) = id and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='tutor'));
create policy tutor_profiles_update on public.tutor_profiles for update to authenticated using ((select auth.uid()) = id or (select private.is_admin())) with check ((select auth.uid()) = id or (select private.is_admin()));

create policy audit_logs_admin_select on public.audit_logs for select to authenticated using ((select private.is_admin()));
create policy audit_logs_insert_authenticated on public.audit_logs for insert to authenticated with check ((select auth.uid()) = actor_id);

revoke all on public.audit_logs from anon;
grant select, insert on public.audit_logs to authenticated;
