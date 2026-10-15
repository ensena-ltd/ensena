-- Lets a Super Admin suspend a Platform User's access without deleting
-- their account or role assignment — checked at real sign-in time
-- (signInWithSupabase) so a suspended staff member is rejected there, the
-- same way the old local-only demo check did for admin-platform-users-store.
alter table public.user_staff_roles
  add column if not exists status text not null default 'active' check (status in ('active', 'suspended'));
