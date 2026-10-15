-- A guardian can read the profile + learning profile of each student linked
-- to them in student_guardians (and nobody else's). Security definer so the
-- check doesn't recurse through RLS on the tables it protects.
create or replace function private.is_guardian_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_guardians sg
    where sg.student_id = p_student_id and sg.guardian_user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_guardian_of(uuid) from public, anon;
grant execute on function private.is_guardian_of(uuid) to authenticated;

create policy profiles_select_linked_child on public.profiles
  for select to authenticated
  using ((select private.is_guardian_of(id)));

create policy student_profiles_select_linked_child on public.student_profiles
  for select to authenticated
  using ((select private.is_guardian_of(id)));
