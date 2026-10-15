-- Login alerts: each new-device sign-in can be confirmed ("this was me")
-- or reported ("this wasn't me") from the alert email.
alter table public.known_devices
  add column if not exists status text not null default 'trusted',
  add column if not exists review_token text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists ip text,
  add column if not exists location text;
alter table public.known_devices drop constraint if exists known_devices_status_check;
alter table public.known_devices add constraint known_devices_status_check check (status in ('trusted', 'pending', 'denied'));
create unique index if not exists known_devices_review_token_key on public.known_devices (review_token) where review_token is not null;

-- Account deletion keeps lesson/payment history intact but anonymises the person.
alter table public.profiles add column if not exists deleted_at timestamptz;

-- Signs a user out everywhere (used when they report a sign-in that wasn't them).
create or replace function public.revoke_all_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;
revoke all on function public.revoke_all_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_all_sessions(uuid) to service_role;

-- Paid group-class enrollment, only callable by the server after payment.
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
  select * into enrollment from public.group_class_enrollments
    where cohort_id = p_cohort_id and student_id = p_student_id and status = 'Active';
  if enrollment is not null then
    return enrollment;
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

-- The old self-service RPC enrolled without payment; only the server may enroll now.
revoke execute on function public.enroll_in_group_class(uuid, text) from public, anon, authenticated;
