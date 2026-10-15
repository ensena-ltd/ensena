-- Phase 0 of the dashboard-data migration: fix the security/performance
-- advisor findings on the existing auth tables before adding any new ones.
--
-- 1. Several policies called auth.uid()/private.*() unwrapped, so Postgres
--    re-evaluates them per row instead of once per statement (the
--    auth_rls_initplan lint). 2. profiles/student_profiles/tutor_profiles
--    each had two overlapping permissive policies for the same
--    action/role doing equivalent authorization checks against different
--    helper functions (is_admin() vs has_permission()) — the
--    multiple_permissive_policies lint. Both are fixed together by
--    merging each pair into one policy with an OR'd, (select ...)-wrapped
--    condition — mathematically identical to Postgres's own OR-combination
--    of multiple permissive policies' USING/WITH CHECK clauses
--    independently, so this changes nothing about who can do what.

-- ---------------------------------------------------------------------
-- profiles: merge profiles_update_own_safe + profiles_admin_update
-- ---------------------------------------------------------------------
drop policy if exists profiles_update_own_safe on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;

create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()))
  with check (
    ((select auth.uid()) = id and role = (select private.current_user_role()))
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------
-- student_profiles: merge the is_admin()-based and has_permission()-based
-- select/update policy pairs
-- ---------------------------------------------------------------------
drop policy if exists student_profiles_select on public.student_profiles;
drop policy if exists student_profiles_select_own_or_permitted on public.student_profiles;

create policy student_profiles_select_v2 on public.student_profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
    or (select private.has_permission('users', 'view'))
    or (select private.has_permission('students', 'view'))
  );

drop policy if exists student_profiles_update on public.student_profiles;
drop policy if exists student_profiles_update_own_or_permitted on public.student_profiles;

create policy student_profiles_update_v2 on public.student_profiles
  for update to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
    or (select private.has_permission('users', 'edit'))
    or (select private.has_permission('students', 'edit'))
  )
  with check (
    (select auth.uid()) = id
    or (select private.is_admin())
    or (select private.has_permission('users', 'edit'))
    or (select private.has_permission('students', 'edit'))
  );

-- ---------------------------------------------------------------------
-- tutor_profiles: merge the select pair the same way. The update pair is
-- NOT a duplicate — tutor_profiles_update_self_excl_review deliberately
-- blocks a tutor from changing their own application_status/reviewed_by
-- (see 0006_lock_down_rls_helper_function.sql's comment on this exact
-- privilege-escalation hole), while tutor_profiles_update_staff lets
-- admin/tutor_verification staff change anything. Preserve that split
-- inside a single policy's WITH CHECK (OR'd, same semantics as two
-- policies) rather than collapsing the security boundary. Also scopes
-- both from the old "public" role to "authenticated" explicitly — the
-- column-level GRANTs already block anon, but "for public" was tripping
-- the multiple_permissive_policies lint across every internal Postgres
-- role Supabase's linter enumerates.
-- ---------------------------------------------------------------------
drop policy if exists tutor_profiles_select on public.tutor_profiles;
drop policy if exists tutor_profiles_select_own_or_permitted on public.tutor_profiles;

create policy tutor_profiles_select_v2 on public.tutor_profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
    or (select private.has_permission('users', 'view'))
    or (select private.has_permission('tutors', 'view'))
  );

drop policy if exists tutor_profiles_update_self_excl_review on public.tutor_profiles;
drop policy if exists tutor_profiles_update_staff on public.tutor_profiles;

create policy tutor_profiles_update_v2 on public.tutor_profiles
  for update to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
    or (select private.has_permission('tutor_verification', 'approve'))
  )
  with check (
    (
      (select auth.uid()) = id
      and application_status = (select private.tutor_application_status(id))
      and not (reviewed_by is distinct from (select private.tutor_reviewed_by(id)))
    )
    or (select private.is_admin())
    or (select private.has_permission('tutor_verification', 'approve'))
  );

-- ---------------------------------------------------------------------
-- subscribers: wrap the remaining unwrapped auth.uid()
-- ---------------------------------------------------------------------
drop policy if exists subscribers_select_own_or_finance on public.subscribers;

create policy subscribers_select_own_or_finance on public.subscribers
  for select to authenticated
  using (
    email = (select email from auth.users where id = (select auth.uid()))
    or (select private.has_permission('payments', 'view'))
    or (select private.has_permission('finance', 'view'))
  );

-- ---------------------------------------------------------------------
-- Missing FK-covering indexes (performance advisor)
-- ---------------------------------------------------------------------
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists contact_messages_user_id_idx on public.contact_messages (user_id);
create index if not exists staff_role_permissions_permission_id_idx on public.staff_role_permissions (permission_id);
create index if not exists tutor_profiles_reviewed_by_idx on public.tutor_profiles (reviewed_by);
create index if not exists user_staff_roles_assigned_by_idx on public.user_staff_roles (assigned_by);
create index if not exists user_staff_roles_role_id_idx on public.user_staff_roles (role_id);
