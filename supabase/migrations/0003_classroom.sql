-- Phase 2 of the backend migration (see 0002_profiles_and_auth.sql for
-- Phase 1: authentication + role). This phase adds the Ensena Classroom /
-- Interactive Whiteboard's own real tables — it deliberately does NOT
-- attempt to migrate bookings/lessons/tutors/students/payments in the same
-- pass; those remain on the existing mock/localStorage system
-- (src/lib/*-data.ts, src/lib/*-store.ts) until their own migration phase.
--
-- Because lessons/bookings aren't real Postgres rows yet, `lesson_id` below
-- is a plain text reference to the existing mock lesson identity
-- (ClassroomSession.classroomId, e.g. "private:pl-3" — see
-- src/lib/classroom-data.ts) rather than a foreign key into a `lessons`
-- table. Once lessons migrate to Postgres in a later phase, add a real FK
-- column and backfill from this one — never rename it out from under
-- whatever's already been saved.
--
-- tutor_id/student_id DO reference real profiles(id) rows, since auth
-- already migrated in Phase 1 — a classroom session only makes sense
-- between two real, authenticated accounts.

create table if not exists public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  tutor_id uuid not null references public.profiles(id),
  student_id uuid references public.profiles(id),
  subject text not null,
  title text not null,
  student_editing_enabled boolean not null default true,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One classroom session per lesson — getOrCreateClassroomSession() upserts
-- against this so repeated "Start Classroom" clicks on the same lesson
-- reuse the same session/whiteboard instead of forking a new one.
create unique index if not exists classroom_sessions_lesson_id_key
  on public.classroom_sessions (lesson_id);

create index if not exists classroom_sessions_tutor_id_idx on public.classroom_sessions (tutor_id);
create index if not exists classroom_sessions_student_id_idx on public.classroom_sessions (student_id);

alter table public.classroom_sessions enable row level security;

create policy "Tutor can manage their own classroom sessions"
  on public.classroom_sessions for all
  using (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

create policy "Student can view and update their own classroom sessions"
  on public.classroom_sessions for select
  using (auth.uid() = student_id);

create policy "Student can update student_editing-relevant fields"
  on public.classroom_sessions for update
  using (auth.uid() = student_id);

create policy "Admins can view all classroom sessions"
  on public.classroom_sessions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create or replace function public.handle_classroom_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_classroom_session_updated on public.classroom_sessions;
create trigger on_classroom_session_updated
  before update on public.classroom_sessions
  for each row execute function public.handle_classroom_session_updated_at();

-- The actual whiteboard content. `board_key` supports multiple named
-- boards/pages per classroom session (default: "default") without needing
-- a separate table — the Excalidraw scene (elements + a small appState
-- subset) is stored as-is, since Excalidraw's own scene format is already
-- a well-defined, versioned JSON shape designed to round-trip losslessly.
create table if not exists public.whiteboard_documents (
  id uuid primary key default gen_random_uuid(),
  classroom_session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  board_key text not null default 'default',
  scene_data jsonb not null default '{"elements":[],"appState":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create unique index if not exists whiteboard_documents_session_board_key
  on public.whiteboard_documents (classroom_session_id, board_key);

alter table public.whiteboard_documents enable row level security;

-- Whiteboard access follows classroom_sessions access exactly — whoever can
-- see the session (tutor, student, or admin) can read/write its board(s).
create policy "Classroom participants can view whiteboard documents"
  on public.whiteboard_documents for select
  using (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = auth.uid() or cs.student_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Classroom participants can upsert whiteboard documents"
  on public.whiteboard_documents for insert
  with check (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = auth.uid() or (cs.student_id = auth.uid() and cs.student_editing_enabled))
    )
  );

create policy "Classroom participants can update whiteboard documents"
  on public.whiteboard_documents for update
  using (
    exists (
      select 1 from public.classroom_sessions cs
      where cs.id = classroom_session_id
        and (cs.tutor_id = auth.uid() or (cs.student_id = auth.uid() and cs.student_editing_enabled))
    )
  );

create or replace function public.handle_whiteboard_document_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_whiteboard_document_updated on public.whiteboard_documents;
create trigger on_whiteboard_document_updated
  before update on public.whiteboard_documents
  for each row execute function public.handle_whiteboard_document_updated_at();
