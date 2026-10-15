-- 0017: live student dashboard + My Classes.
--
-- 1. Fix group_class_sessions_select. Its enrolled-student branch compared
--    e.cohort_id to itself (always true), so a student enrolled in ANY
--    cohort could read the sessions of EVERY cohort, published or not.
-- 2. A student can leave at most one review per booking.

drop policy if exists group_class_sessions_select on public.group_class_sessions;
create policy group_class_sessions_select on public.group_class_sessions
  for select to authenticated
  using (
    exists (
      select 1
      from public.group_class_cohorts c
      join public.group_classes gc on gc.id = c.group_class_id
      where c.id = group_class_sessions.cohort_id
        and (gc.tutor_id = (select auth.uid()) or gc.status = 'Published')
    )
    or exists (
      select 1
      from public.group_class_enrollments e
      where e.cohort_id = group_class_sessions.cohort_id
        and e.student_id = (select auth.uid())
    )
    or (select private.is_admin())
    or (select private.has_permission('group_classes', 'view'))
  );

create unique index if not exists reviews_one_per_booking
  on public.reviews (reviewer_id, booking_id)
  where booking_id is not null;
