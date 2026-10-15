-- Phase 1 of the dashboard-data migration: the core booking entities that
-- unblock the most-used dashboard pages (lessons, group classes, discovery
-- sessions, counselling). See supabase/migrations/0011_* for Phase 0 and
-- the plan this follows for the full 8-phase breakdown.
--
-- Write paths that involve business rules (availability conflicts,
-- multi-row consistency, fee/refund calculation) go through SECURITY
-- DEFINER RPCs — the same pattern already established by
-- admin_set_tutor_application_status()/claim_oauth_signup_role() in
-- 0010_tutor_application_workflow_and_oauth.sql — rather than raw
-- INSERT/UPDATE policies, so a client can never bypass those rules with a
-- direct PostgREST call. Simple self-service field edits (notes, etc.)
-- get a plain column-scoped UPDATE policy instead.

create table public.private_lessons (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  subject text not null,
  academic_level text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  mode text not null default 'Online' check (mode in ('Online', 'Physical', 'Hybrid')),
  status text not null default 'Pending' check (status in ('Upcoming', 'Pending', 'Completed', 'Cancelled')),
  price numeric(10, 2) not null default 0,
  frequency text check (frequency in ('oneTime', 'weekly', 'monthly')),
  booking_group_id uuid,
  session_number integer,
  total_sessions integer,
  notes text,
  materials jsonb not null default '[]'::jsonb,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded', 'partially_refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text
);

create index private_lessons_student_id_idx on public.private_lessons (student_id);
create index private_lessons_tutor_id_idx on public.private_lessons (tutor_id);
create index private_lessons_booking_group_id_idx on public.private_lessons (booking_group_id);
create index private_lessons_scheduled_at_idx on public.private_lessons (scheduled_at);

create or replace function public.private_lesson_week_number(p_booking_group_id uuid, p_scheduled_at timestamptz)
returns integer
language sql
stable
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

alter table public.private_lessons enable row level security;

create policy private_lessons_select on public.private_lessons
  for select to authenticated
  using (
    (select auth.uid()) = student_id
    or (select auth.uid()) = tutor_id
    or (select private.is_admin())
    or (select private.has_permission('bookings', 'view'))
  );

grant update (notes) on public.private_lessons to authenticated;

create policy private_lessons_update_notes on public.private_lessons
  for update to authenticated
  using ((select auth.uid()) = student_id or (select auth.uid()) = tutor_id)
  with check ((select auth.uid()) = student_id or (select auth.uid()) = tutor_id);

create policy private_lessons_admin_manage on public.private_lessons
  for all to authenticated
  using ((select private.is_admin()) or (select private.has_permission('bookings', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('bookings', 'manage')));

create or replace function public.handle_private_lesson_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_private_lesson_updated
  before update on public.private_lessons
  for each row execute function public.handle_private_lesson_updated_at();

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  private_lesson_id uuid references public.private_lessons(id) on delete cascade,
  group_class_enrollment_id uuid,
  event_type text not null,
  actor_id uuid references public.profiles(id),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_events_exactly_one_target check (
    (private_lesson_id is not null)::int + (group_class_enrollment_id is not null)::int = 1
  )
);

create table public.cancellations (
  id uuid primary key default gen_random_uuid(),
  private_lesson_id uuid references public.private_lessons(id) on delete cascade,
  group_class_enrollment_id uuid,
  cancelled_by uuid references public.profiles(id),
  reason text,
  fee numeric(10, 2) not null default 0,
  refund_amount numeric(10, 2) not null default 0,
  policy_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cancellations_exactly_one_target check (
    (private_lesson_id is not null)::int + (group_class_enrollment_id is not null)::int = 1
  )
);

create table public.reschedules (
  id uuid primary key default gen_random_uuid(),
  private_lesson_id uuid not null references public.private_lessons(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  old_scheduled_at timestamptz not null,
  new_scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create index booking_events_private_lesson_id_idx on public.booking_events (private_lesson_id);
create index cancellations_private_lesson_id_idx on public.cancellations (private_lesson_id);
create index reschedules_private_lesson_id_idx on public.reschedules (private_lesson_id);

alter table public.booking_events enable row level security;
alter table public.cancellations enable row level security;
alter table public.reschedules enable row level security;

create policy booking_events_select on public.booking_events
  for select to authenticated
  using (
    exists (select 1 from public.private_lessons pl where pl.id = private_lesson_id and (pl.student_id = (select auth.uid()) or pl.tutor_id = (select auth.uid())))
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

create policy cancellations_select on public.cancellations
  for select to authenticated
  using (
    exists (select 1 from public.private_lessons pl where pl.id = private_lesson_id and (pl.student_id = (select auth.uid()) or pl.tutor_id = (select auth.uid())))
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

create policy reschedules_select on public.reschedules
  for select to authenticated
  using (
    exists (select 1 from public.private_lessons pl where pl.id = private_lesson_id and (pl.student_id = (select auth.uid()) or pl.tutor_id = (select auth.uid())))
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

revoke all on public.booking_events, public.cancellations, public.reschedules from anon, authenticated;
grant select on public.booking_events, public.cancellations, public.reschedules to authenticated;

create or replace function public.cancel_private_lesson(
  p_lesson_id uuid,
  p_reason text default null
)
returns public.private_lessons
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  lesson public.private_lessons;
  hours_until numeric;
  fee_amount numeric(10, 2) := 0;
  refund_amount numeric(10, 2);
begin
  select * into lesson from public.private_lessons where id = p_lesson_id;
  if lesson is null then
    raise exception 'Lesson not found';
  end if;
  if uid <> lesson.student_id and uid <> lesson.tutor_id and not (private.is_admin() or private.has_permission('bookings', 'manage')) then
    raise exception 'Not authorized to cancel this lesson';
  end if;
  if lesson.status in ('Completed', 'Cancelled') then
    raise exception 'This lesson can no longer be cancelled';
  end if;

  hours_until := extract(epoch from (lesson.scheduled_at - now())) / 3600;
  if hours_until < 24 then
    fee_amount := round(lesson.price * 0.5, 2);
  end if;
  refund_amount := lesson.price - fee_amount;

  update public.private_lessons
    set status = 'Cancelled', cancelled_at = now(), cancellation_reason = p_reason
    where id = p_lesson_id
    returning * into lesson;

  insert into public.cancellations (private_lesson_id, cancelled_by, reason, fee, refund_amount, policy_snapshot)
    values (p_lesson_id, uid, p_reason, fee_amount, refund_amount, jsonb_build_object('hoursUntil', hours_until));

  insert into public.booking_events (private_lesson_id, event_type, actor_id, note)
    values (p_lesson_id, 'cancelled', uid, p_reason);

  return lesson;
end;
$$;

create or replace function public.reschedule_private_lesson(
  p_lesson_id uuid,
  p_new_scheduled_at timestamptz
)
returns public.private_lessons
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  lesson public.private_lessons;
begin
  select * into lesson from public.private_lessons where id = p_lesson_id;
  if lesson is null then
    raise exception 'Lesson not found';
  end if;
  if uid <> lesson.student_id and uid <> lesson.tutor_id and not (private.is_admin() or private.has_permission('bookings', 'manage')) then
    raise exception 'Not authorized to reschedule this lesson';
  end if;
  if lesson.status in ('Completed', 'Cancelled') then
    raise exception 'This lesson can no longer be rescheduled';
  end if;
  if exists (
    select 1 from public.private_lessons other
    where other.tutor_id = lesson.tutor_id
      and other.id <> lesson.id
      and other.status not in ('Cancelled', 'Completed')
      and other.scheduled_at < p_new_scheduled_at + (lesson.duration_minutes || ' minutes')::interval
      and other.scheduled_at + (other.duration_minutes || ' minutes')::interval > p_new_scheduled_at
  ) then
    raise exception 'Tutor is not available at the requested time';
  end if;

  insert into public.reschedules (private_lesson_id, requested_by, old_scheduled_at, new_scheduled_at, status)
    values (p_lesson_id, uid, lesson.scheduled_at, p_new_scheduled_at, 'confirmed');

  update public.private_lessons set scheduled_at = p_new_scheduled_at where id = p_lesson_id returning * into lesson;

  insert into public.booking_events (private_lesson_id, event_type, actor_id)
    values (p_lesson_id, 'rescheduled', uid);

  return lesson;
end;
$$;

revoke execute on function public.cancel_private_lesson(uuid, text) from public, anon;
revoke execute on function public.reschedule_private_lesson(uuid, timestamptz) from public, anon;
grant execute on function public.cancel_private_lesson(uuid, text) to authenticated;
grant execute on function public.reschedule_private_lesson(uuid, timestamptz) to authenticated;

create table public.group_classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  tutor_id uuid not null references public.profiles(id),
  title text not null,
  subject text not null,
  academic_level text,
  class_grade text,
  mode text not null default 'Online' check (mode in ('Online', 'Physical', 'Hybrid')),
  language text not null default 'English',
  description text,
  learning_outcomes jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  banner_url text,
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_class_cohorts (
  id uuid primary key default gen_random_uuid(),
  group_class_id uuid not null references public.group_classes(id) on delete cascade,
  cohort_index integer not null,
  start_date date not null,
  end_date date,
  schedule jsonb not null default '{}'::jsonb,
  seats_total integer not null default 0,
  seats_filled integer not null default 0,
  price numeric(10, 2) not null default 0,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'InProgress', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  unique (group_class_id, cohort_index)
);

create table public.group_class_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.group_class_cohorts(id) on delete cascade,
  session_number integer not null,
  week_number integer not null,
  scheduled_at timestamptz not null,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Completed', 'Cancelled')),
  classroom_session_id uuid references public.classroom_sessions(id),
  created_at timestamptz not null default now(),
  unique (cohort_id, session_number)
);

create table public.group_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  cohort_id uuid not null references public.group_class_cohorts(id),
  student_id uuid not null references public.profiles(id),
  plan text,
  status text not null default 'Active' check (status in ('Active', 'Waitlisted', 'Cancelled', 'Completed')),
  waitlist_position integer,
  enrolled_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (cohort_id, student_id)
);

alter table public.booking_events
  add constraint booking_events_group_class_enrollment_id_fkey
  foreign key (group_class_enrollment_id) references public.group_class_enrollments(id) on delete cascade;
alter table public.cancellations
  add constraint cancellations_group_class_enrollment_id_fkey
  foreign key (group_class_enrollment_id) references public.group_class_enrollments(id) on delete cascade;

create index group_class_cohorts_group_class_id_idx on public.group_class_cohorts (group_class_id);
create index group_class_sessions_cohort_id_idx on public.group_class_sessions (cohort_id);
create index group_class_enrollments_cohort_id_idx on public.group_class_enrollments (cohort_id);
create index group_class_enrollments_student_id_idx on public.group_class_enrollments (student_id);
create index group_classes_tutor_id_idx on public.group_classes (tutor_id);

alter table public.group_classes enable row level security;
alter table public.group_class_cohorts enable row level security;
alter table public.group_class_sessions enable row level security;
alter table public.group_class_enrollments enable row level security;

create policy group_classes_select_published on public.group_classes
  for select to anon, authenticated
  using (status = 'Published');

create policy group_classes_select_own_or_staff on public.group_classes
  for select to authenticated
  using ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'view')));

create policy group_classes_tutor_manage on public.group_classes
  for all to authenticated
  using ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')))
  with check ((select auth.uid()) = tutor_id or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage')));

create policy group_class_cohorts_select on public.group_class_cohorts
  for select to anon, authenticated
  using (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.status = 'Published')
    or exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'view'))
  );

create policy group_class_cohorts_tutor_manage on public.group_class_cohorts
  for all to authenticated
  using (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  )
  with check (
    exists (select 1 from public.group_classes gc where gc.id = group_class_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_sessions_select on public.group_class_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id
      where c.id = cohort_id and (gc.tutor_id = (select auth.uid()) or gc.status = 'Published')
    )
    or exists (select 1 from public.group_class_enrollments e where e.cohort_id = cohort_id and e.student_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'view'))
  );

create policy group_class_sessions_tutor_manage on public.group_class_sessions
  for all to authenticated
  using (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  )
  with check (
    exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'manage'))
  );

create policy group_class_enrollments_select on public.group_class_enrollments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.group_class_cohorts c join public.group_classes gc on gc.id = c.group_class_id where c.id = cohort_id and gc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('group_classes', 'view'))
  );

create policy group_class_enrollments_staff_manage on public.group_class_enrollments
  for all to authenticated
  using ((select private.is_admin()) or (select private.has_permission('group_classes', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('group_classes', 'manage')));

create or replace function public.enroll_in_group_class(p_cohort_id uuid, p_plan text default null)
returns public.group_class_enrollments
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  cohort public.group_class_cohorts;
  enrollment public.group_class_enrollments;
  ref text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into cohort from public.group_class_cohorts where id = p_cohort_id for update;
  if cohort is null then
    raise exception 'Cohort not found';
  end if;
  if exists (select 1 from public.group_class_enrollments where cohort_id = p_cohort_id and student_id = uid and status in ('Active', 'Waitlisted')) then
    raise exception 'Already enrolled in this class';
  end if;

  ref := 'GC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  if cohort.seats_filled < cohort.seats_total then
    update public.group_class_cohorts set seats_filled = seats_filled + 1 where id = p_cohort_id;
    insert into public.group_class_enrollments (booking_reference, cohort_id, student_id, plan, status)
      values (ref, p_cohort_id, uid, p_plan, 'Active') returning * into enrollment;
  else
    insert into public.group_class_enrollments (booking_reference, cohort_id, student_id, plan, status, waitlist_position)
      values (
        ref, p_cohort_id, uid, p_plan, 'Waitlisted',
        coalesce((select max(waitlist_position) + 1 from public.group_class_enrollments where cohort_id = p_cohort_id and status = 'Waitlisted'), 1)
      )
      returning * into enrollment;
  end if;

  return enrollment;
end;
$$;

create or replace function public.cancel_group_class_enrollment(p_enrollment_id uuid, p_reason text default null)
returns public.group_class_enrollments
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  enrollment public.group_class_enrollments;
begin
  select * into enrollment from public.group_class_enrollments where id = p_enrollment_id for update;
  if enrollment is null then
    raise exception 'Enrollment not found';
  end if;
  if enrollment.student_id <> uid and not (private.is_admin() or private.has_permission('group_classes', 'manage')) then
    raise exception 'Not authorized to cancel this enrollment';
  end if;

  if enrollment.status = 'Active' then
    update public.group_class_cohorts set seats_filled = greatest(seats_filled - 1, 0) where id = enrollment.cohort_id;
  end if;

  update public.group_class_enrollments set status = 'Cancelled', cancelled_at = now() where id = p_enrollment_id returning * into enrollment;

  insert into public.cancellations (group_class_enrollment_id, cancelled_by, reason)
    values (p_enrollment_id, uid, p_reason);
  insert into public.booking_events (group_class_enrollment_id, event_type, actor_id, note)
    values (p_enrollment_id, 'cancelled', uid, p_reason);

  return enrollment;
end;
$$;

revoke execute on function public.enroll_in_group_class(uuid, text) from public, anon;
revoke execute on function public.cancel_group_class_enrollment(uuid, text) from public, anon;
grant execute on function public.enroll_in_group_class(uuid, text) to authenticated;
grant execute on function public.cancel_group_class_enrollment(uuid, text) to authenticated;

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  student_id uuid not null references public.profiles(id),
  tutor_id uuid references public.profiles(id),
  subject text not null,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  price numeric(10, 2) not null default 0,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Completed', 'Cancelled', 'NoShow')),
  fit_rating integer check (fit_rating between 1 and 5),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  funnel_stage text,
  conversion_status text,
  conversion_channel text,
  conversion_outcome text,
  tutor_selection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discovery_sessions_student_id_idx on public.discovery_sessions (student_id);
create index discovery_sessions_tutor_id_idx on public.discovery_sessions (tutor_id);

alter table public.discovery_sessions enable row level security;

create policy discovery_sessions_select on public.discovery_sessions
  for select to authenticated
  using (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

create policy discovery_sessions_insert_own on public.discovery_sessions
  for insert to authenticated
  with check (student_id = (select auth.uid()));

create policy discovery_sessions_update on public.discovery_sessions
  for update to authenticated
  using (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('bookings', 'manage'))
  )
  with check (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('bookings', 'manage'))
  );

create trigger on_discovery_session_updated
  before update on public.discovery_sessions
  for each row execute function public.handle_private_lesson_updated_at();

create table public.counselling_appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  student_id uuid not null references public.profiles(id),
  counsellor_id uuid references public.profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Completed', 'Cancelled', 'NoShow')),
  intake jsonb not null default '{}'::jsonb,
  ai_summary text,
  session_notes text,
  outcome text,
  recommendation text,
  follow_up jsonb not null default '{}'::jsonb,
  action_plan jsonb not null default '{}'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  counsellor_notes text,
  contact jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index counselling_appointments_student_id_idx on public.counselling_appointments (student_id);
create index counselling_appointments_counsellor_id_idx on public.counselling_appointments (counsellor_id);

alter table public.counselling_appointments enable row level security;

create policy counselling_appointments_select on public.counselling_appointments
  for select to authenticated
  using (
    student_id = (select auth.uid()) or counsellor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('counselling', 'view'))
  );

create policy counselling_appointments_insert_own on public.counselling_appointments
  for insert to authenticated
  with check (student_id = (select auth.uid()));

create policy counselling_appointments_update on public.counselling_appointments
  for update to authenticated
  using (
    student_id = (select auth.uid()) or counsellor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('counselling', 'manage'))
  )
  with check (
    student_id = (select auth.uid()) or counsellor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('counselling', 'manage'))
  );

create trigger on_counselling_appointment_updated
  before update on public.counselling_appointments
  for each row execute function public.handle_private_lesson_updated_at();

create table public.tutor_weekly_availability (
  tutor_id uuid not null references public.profiles(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  enabled boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  primary key (tutor_id, day_of_week)
);

create table public.tutor_blocked_time (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index tutor_blocked_time_tutor_id_idx on public.tutor_blocked_time (tutor_id);

create table public.counsellor_availability (
  counsellor_id uuid primary key references public.profiles(id),
  weekly_schedule jsonb not null default '{}'::jsonb,
  blocked_dates jsonb not null default '[]'::jsonb,
  special_dates jsonb not null default '[]'::jsonb,
  session_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tutor_weekly_availability enable row level security;
alter table public.tutor_blocked_time enable row level security;
alter table public.counsellor_availability enable row level security;

create policy tutor_weekly_availability_select on public.tutor_weekly_availability
  for select to anon, authenticated using (true);

create policy tutor_weekly_availability_manage on public.tutor_weekly_availability
  for all to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')))
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy tutor_blocked_time_select on public.tutor_blocked_time
  for select to anon, authenticated using (true);

create policy tutor_blocked_time_manage on public.tutor_blocked_time
  for all to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')))
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutors', 'edit')));

create policy counsellor_availability_select on public.counsellor_availability
  for select to anon, authenticated using (true);

create policy counsellor_availability_manage on public.counsellor_availability
  for all to authenticated
  using (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')))
  with check (counsellor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('counselling', 'manage')));

alter table public.classroom_sessions add column private_lesson_id uuid references public.private_lessons(id);
create index classroom_sessions_private_lesson_id_idx on public.classroom_sessions (private_lesson_id);
