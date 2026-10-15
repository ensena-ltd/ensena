-- Cleanup pass on Phase 1 + the classroom backfill, driven by the
-- security/performance advisors immediately after applying them.

-- 1. Mutable search_path on the 4 new/backfilled trigger & helper
--    functions (they were missing `set search_path`, unlike private.*'s
--    functions which all have it).
create or replace function public.handle_classroom_session_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_whiteboard_document_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_private_lesson_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.private_lesson_week_number(p_booking_group_id uuid, p_scheduled_at timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when p_booking_group_id is null then 1
    else 1 + floor(
      (p_scheduled_at::date - (
        select min(pl.scheduled_at::date) from public.private_lessons pl where pl.booking_group_id = p_booking_group_id
      )) / 7.0
    )::integer
  end;
$$;

-- 2. Missing FK-covering indexes.
create index booking_events_actor_id_idx on public.booking_events (actor_id);
create index booking_events_group_class_enrollment_id_idx on public.booking_events (group_class_enrollment_id);
create index cancellations_cancelled_by_idx on public.cancellations (cancelled_by);
create index cancellations_group_class_enrollment_id_idx on public.cancellations (group_class_enrollment_id);
create index group_class_sessions_classroom_session_id_idx on public.group_class_sessions (classroom_session_id);
create index reschedules_requested_by_idx on public.reschedules (requested_by);
create index whiteboard_documents_updated_by_idx on public.whiteboard_documents (updated_by);

-- 3. classroom_sessions/whiteboard_documents policies (backfilled
--    verbatim from the never-applied 0003_classroom.sql) used bare
--    auth.uid() — wrap it. The multiple-permissive-policy overlap on
--    these two tables (Tutor's "for all" vs Student's/Admin's "for
--    select") is left as-is for Phase 5 (classroom extensions), which
--    will restructure this table's policies anyway when adding chat/
--    attendance/tool-instance tables alongside it.
drop policy "Tutor can manage their own classroom sessions" on public.classroom_sessions;
drop policy "Student can view and update their own classroom sessions" on public.classroom_sessions;
drop policy "Student can update student_editing-relevant fields" on public.classroom_sessions;
drop policy "Admins can view all classroom sessions" on public.classroom_sessions;

create policy "Tutor can manage their own classroom sessions"
  on public.classroom_sessions for all
  using ((select auth.uid()) = tutor_id)
  with check ((select auth.uid()) = tutor_id);

create policy "Student can view and update their own classroom sessions"
  on public.classroom_sessions for select
  using ((select auth.uid()) = student_id);

create policy "Student can update student_editing-relevant fields"
  on public.classroom_sessions for update
  using ((select auth.uid()) = student_id);

create policy "Admins can view all classroom sessions"
  on public.classroom_sessions for select
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy "Classroom participants can view whiteboard documents" on public.whiteboard_documents;
drop policy "Classroom participants can upsert whiteboard documents" on public.whiteboard_documents;
drop policy "Classroom participants can update whiteboard documents" on public.whiteboard_documents;

create policy "Classroom participants can view whiteboard documents"
  on public.whiteboard_documents for select
  using (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid()))
    )
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "Classroom participants can upsert whiteboard documents"
  on public.whiteboard_documents for insert
  with check (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = (select auth.uid()) or (cs.student_id = (select auth.uid()) and cs.student_editing_enabled))
    )
  );

create policy "Classroom participants can update whiteboard documents"
  on public.whiteboard_documents for update
  using (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = (select auth.uid()) or (cs.student_id = (select auth.uid()) and cs.student_editing_enabled))
    )
  );

-- 4. Multiple-permissive-policy cleanup on the new Phase 1 tables.
-- private_lessons: drop the broad admin "for all" policy — staff/admin
-- edits to booking fields beyond notes go through service-role server
-- actions (bypassing RLS entirely, same pattern as signUpStudent's
-- service-role writes), not a direct-client RLS path, so this policy
-- had no practical effect beyond tripping the lint (the column-level
-- GRANT already restricts authenticated to the notes column).
drop policy private_lessons_admin_manage on public.private_lessons;

-- group_class_enrollments: same reasoning — normal enroll/cancel already
-- goes through the RPCs (which run as definer, bypassing RLS), so a
-- direct-client "staff manage" policy isn't needed yet.
drop policy group_class_enrollments_staff_manage on public.group_class_enrollments;

-- group_classes: tutor self-service create/edit is real functionality
-- (not just an admin path), so replace the single "for all" policy with
-- three write-only policies (no SELECT) plus one merged select policy,
-- instead of just dropping it.
drop policy group_classes_select_published on public.group_classes;
drop policy group_classes_select_own_or_staff on public.group_classes;
drop policy group_classes_tutor_manage on public.group_classes;

create policy group_classes_select on public.group_classes
  for select to anon, authenticated
  using (
    status = 'Published'
    or (select auth.uid()) = tutor_id
    or (select private.is_admin())
    or (select private.has_permission('group_classes', 'view'))
  );

create policy group_classes_insert on public.group_classes
  for insert to authenticated
  with check ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')));

create policy group_classes_update on public.group_classes
  for update to authenticated
  using ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')))
  with check ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')));

create policy group_classes_delete on public.group_classes
  for delete to authenticated
  using ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')));

drop policy group_class_cohorts_tutor_manage on public.group_class_cohorts;

create policy group_class_cohorts_insert on public.group_class_cohorts
  for insert to authenticated
  with check (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_cohorts_update on public.group_class_cohorts
  for update to authenticated
  using (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  )
  with check (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_cohorts_delete on public.group_class_cohorts
  for delete to authenticated
  using (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

drop policy group_class_sessions_tutor_manage on public.group_class_sessions;

create policy group_class_sessions_insert on public.group_class_sessions
  for insert to authenticated
  with check (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_sessions_update on public.group_class_sessions
  for update to authenticated
  using (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  )
  with check (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_sessions_delete on public.group_class_sessions
  for delete to authenticated
  using (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

drop policy tutor_weekly_availability_manage on public.tutor_weekly_availability;

create policy tutor_weekly_availability_insert on public.tutor_weekly_availability
  for insert to authenticated
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy tutor_weekly_availability_update on public.tutor_weekly_availability
  for update to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')))
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy tutor_weekly_availability_delete on public.tutor_weekly_availability
  for delete to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

drop policy tutor_blocked_time_manage on public.tutor_blocked_time;

create policy tutor_blocked_time_insert on public.tutor_blocked_time
  for insert to authenticated
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy tutor_blocked_time_update on public.tutor_blocked_time
  for update to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')))
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy tutor_blocked_time_delete on public.tutor_blocked_time
  for delete to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

drop policy counsellor_availability_manage on public.counsellor_availability;

create policy counsellor_availability_insert on public.counsellor_availability
  for insert to authenticated
  with check (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')));

create policy counsellor_availability_update on public.counsellor_availability
  for update to authenticated
  using (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')))
  with check (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')));

create policy counsellor_availability_delete on public.counsellor_availability
  for delete to authenticated
  using (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')));
