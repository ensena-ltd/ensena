-- Phase 5 of the dashboard-data migration: classroom chat, attendance,
-- tool-instance state, recording metadata, plus the label/termination
-- fields as columns on classroom_sessions (single value per session, so
-- a column fits better than the one-row-per-session tables
-- classroom-session-label-store.ts/classroom-termination-store.ts used).
--
-- Also finally resolves the multiple_permissive_policies WARN on
-- classroom_sessions that Phase 1/2/3's cleanups deliberately deferred to
-- this phase (see their migration comments) — restructuring it now that
-- this phase is adding sibling tables with the same access-check shape
-- anyway.

alter table public.classroom_sessions add column label text;
alter table public.classroom_sessions add column terminated_at timestamptz;
alter table public.classroom_sessions add column termination_message text;

drop policy "Tutor can manage their own classroom sessions" on public.classroom_sessions;
drop policy "Student can view and update their own classroom sessions" on public.classroom_sessions;
drop policy "Student can update student_editing-relevant fields" on public.classroom_sessions;
drop policy "Admins can view all classroom sessions" on public.classroom_sessions;

create policy classroom_sessions_select on public.classroom_sessions
  for select to authenticated
  using (tutor_id = (select auth.uid()) or student_id = (select auth.uid()) or (select private.is_admin()));

create policy classroom_sessions_insert on public.classroom_sessions
  for insert to authenticated
  with check (tutor_id = (select auth.uid()));

-- Preserves existing behavior exactly (neither prior policy actually
-- column-locked the student's update despite the "student_editing-
-- relevant fields" name) — just consolidated into one policy.
create policy classroom_sessions_update on public.classroom_sessions
  for update to authenticated
  using (tutor_id = (select auth.uid()) or student_id = (select auth.uid()))
  with check (tutor_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy classroom_sessions_delete on public.classroom_sessions
  for delete to authenticated
  using (tutor_id = (select auth.uid()));

create table public.classroom_chat_messages (
  id uuid primary key default gen_random_uuid(),
  classroom_session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index classroom_chat_messages_classroom_session_id_idx on public.classroom_chat_messages (classroom_session_id);
create index classroom_chat_messages_sender_id_idx on public.classroom_chat_messages (sender_id);

create table public.classroom_attendance (
  id uuid primary key default gen_random_uuid(),
  classroom_session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  participant_id uuid references public.profiles(id),
  participant_role text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index classroom_attendance_classroom_session_id_idx on public.classroom_attendance (classroom_session_id);
create index classroom_attendance_participant_id_idx on public.classroom_attendance (participant_id);

create table public.classroom_tool_instances (
  classroom_session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  board_key text not null default 'default',
  tool_instances jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (classroom_session_id, board_key)
);

create table public.lesson_recordings (
  id uuid primary key default gen_random_uuid(),
  classroom_session_id uuid not null unique references public.classroom_sessions(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'recording', 'processing', 'ready', 'failed')),
  segments jsonb not null default '[]'::jsonb,
  retention_days integer not null default 30,
  preserve_for_dispute boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classroom_chat_messages enable row level security;
alter table public.classroom_attendance enable row level security;
alter table public.classroom_tool_instances enable row level security;
alter table public.lesson_recordings enable row level security;

create policy classroom_chat_messages_select on public.classroom_chat_messages
  for select to authenticated
  using (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
    or (select private.is_admin())
  );

create policy classroom_chat_messages_insert on public.classroom_chat_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
  );

create policy classroom_attendance_select on public.classroom_attendance
  for select to authenticated
  using (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
    or (select private.is_admin())
  );

create policy classroom_attendance_insert on public.classroom_attendance
  for insert to authenticated
  with check (
    participant_id = (select auth.uid())
    and exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
  );

create policy classroom_attendance_update_own on public.classroom_attendance
  for update to authenticated
  using (participant_id = (select auth.uid()))
  with check (participant_id = (select auth.uid()));

create policy classroom_tool_instances_select on public.classroom_tool_instances
  for select to authenticated
  using (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
    or (select private.is_admin())
  );

create policy classroom_tool_instances_write on public.classroom_tool_instances
  for insert to authenticated
  with check (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or (cs.student_id = (select auth.uid()) and cs.student_editing_enabled)))
  );

create policy classroom_tool_instances_update on public.classroom_tool_instances
  for update to authenticated
  using (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or (cs.student_id = (select auth.uid()) and cs.student_editing_enabled)))
  );

create policy lesson_recordings_select on public.lesson_recordings
  for select to authenticated
  using (
    exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and (cs.tutor_id = (select auth.uid()) or cs.student_id = (select auth.uid())))
    or (select private.is_admin())
  );

create policy lesson_recordings_tutor_manage on public.lesson_recordings
  for all to authenticated
  using (exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and cs.tutor_id = (select auth.uid())))
  with check (exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and cs.tutor_id = (select auth.uid())));

create or replace function public.handle_lesson_recording_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_lesson_recording_updated
  before update on public.lesson_recordings
  for each row execute function public.handle_lesson_recording_updated_at();
