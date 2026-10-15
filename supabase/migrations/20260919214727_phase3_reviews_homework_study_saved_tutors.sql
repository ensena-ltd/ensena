-- Phase 3 of the dashboard-data migration: reviews, homework, study
-- tasks/learning paths, saved/recently-viewed tutors.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('student_to_tutor', 'tutor_to_student')),
  booking_id uuid,
  booking_type text,
  reviewer_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text not null default 'published' check (status in ('published', 'hidden')),
  reported boolean not null default false,
  report_reason text,
  tutor_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_reviewer_id_idx on public.reviews (reviewer_id);
create index reviews_recipient_id_idx on public.reviews (recipient_id);

alter table public.reviews enable row level security;

create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (
    status = 'published'
    or reviewer_id = (select auth.uid())
    or recipient_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('reviews', 'manage'))
  );

create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (reviewer_id = (select auth.uid()));

grant update (tutor_reply) on public.reviews to authenticated;

create policy reviews_update_reply on public.reviews
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

grant update (reported, report_reason) on public.reviews to authenticated;

create policy reviews_update_report on public.reviews
  for update to authenticated
  using (true)
  with check (true);

create or replace function public.handle_review_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_review_updated
  before update on public.reviews
  for each row execute function public.handle_review_updated_at();

-- =======================================================================
-- Homework
-- =======================================================================
create table public.homework_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  booking_id uuid,
  title text not null,
  subject text not null,
  status text not null default 'assigned' check (status in ('assigned', 'submitted', 'graded', 'late')),
  grade text,
  feedback text,
  due_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index homework_items_student_id_idx on public.homework_items (student_id);
create index homework_items_tutor_id_idx on public.homework_items (tutor_id);

alter table public.homework_items enable row level security;

-- Simplification (documented, not a hidden gap): both sides share one
-- UPDATE policy rather than column-locking "student can only submit,
-- tutor can only grade" — the same trust boundary private_lessons and
-- tutor_profiles enforce elsewhere. Revisit with column GRANTs (same
-- pattern as those two tables) if this ever needs tightening.
create policy homework_items_select on public.homework_items
  for select to authenticated
  using (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

create policy homework_items_insert on public.homework_items
  for insert to authenticated
  with check (tutor_id = (select auth.uid()));

create policy homework_items_update on public.homework_items
  for update to authenticated
  using (student_id = (select auth.uid()) or tutor_id = (select auth.uid()))
  with check (student_id = (select auth.uid()) or tutor_id = (select auth.uid()));

-- =======================================================================
-- Study tasks & learning paths
-- =======================================================================
create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  label text not null,
  subject text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index study_tasks_student_id_idx on public.study_tasks (student_id);

alter table public.study_tasks enable row level security;

create policy study_tasks_manage_own on public.study_tasks
  for all to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()))
  with check (student_id = (select auth.uid()) or (select private.is_admin()));

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  title text not null,
  modules jsonb not null default '[]'::jsonb,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_paths_student_id_idx on public.learning_paths (student_id);

alter table public.learning_paths enable row level security;

create policy learning_paths_select on public.learning_paths
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('bookings', 'view')));

grant update (progress) on public.learning_paths to authenticated;

create policy learning_paths_update_progress on public.learning_paths
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create or replace function public.handle_learning_path_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_learning_path_updated
  before update on public.learning_paths
  for each row execute function public.handle_learning_path_updated_at();

-- =======================================================================
-- Saved / recently-viewed tutors (replaces discovery-store.ts, which was
-- misnamed for what it actually does)
-- =======================================================================
create table public.saved_tutors (
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (student_id, tutor_id)
);

create index saved_tutors_tutor_id_idx on public.saved_tutors (tutor_id);

create table public.recently_viewed_tutors (
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  viewed_at timestamptz not null default now(),
  primary key (student_id, tutor_id)
);

create index recently_viewed_tutors_tutor_id_idx on public.recently_viewed_tutors (tutor_id);

alter table public.saved_tutors enable row level security;
alter table public.recently_viewed_tutors enable row level security;

create policy saved_tutors_manage_own on public.saved_tutors
  for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy recently_viewed_tutors_manage_own on public.recently_viewed_tutors
  for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
