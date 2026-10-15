-- Backfills supabase/migrations/0003_classroom.sql, which existed as a
-- local file but was never actually applied to this project (confirmed:
-- absent from list_migrations and list_tables before this run). Applied
-- verbatim from the local file, no content changes.

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
