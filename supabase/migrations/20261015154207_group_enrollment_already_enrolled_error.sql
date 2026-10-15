create or replace function public.enroll_student_in_group_class(p_student_id uuid, p_cohort_id uuid, p_plan text)
returns public.group_class_enrollments
language plpgsql
security definer
set search_path = public, private
as $$
declare
  cohort public.group_class_cohorts;
  enrollment public.group_class_enrollments;
begin
  select * into cohort from public.group_class_cohorts where id = p_cohort_id for update;
  if cohort is null then
    raise exception 'Cohort not found';
  end if;
  if cohort.status in ('Cancelled', 'Completed') then
    raise exception 'This cohort is no longer taking students';
  end if;
  -- Raised (not returned) so a duplicate payment callback can't record a second payment.
  if exists (select 1 from public.group_class_enrollments where cohort_id = p_cohort_id and student_id = p_student_id and status = 'Active') then
    raise exception 'ALREADY_ENROLLED';
  end if;
  if cohort.seats_filled >= cohort.seats_total then
    raise exception 'This cohort is full';
  end if;
  update public.group_class_cohorts set seats_filled = seats_filled + 1 where id = p_cohort_id;
  insert into public.group_class_enrollments (booking_reference, cohort_id, student_id, plan, status)
    values ('GC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), p_cohort_id, p_student_id, p_plan, 'Active')
    returning * into enrollment;
  return enrollment;
end;
$$;
revoke all on function public.enroll_student_in_group_class(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.enroll_student_in_group_class(uuid, uuid, text) to service_role;
