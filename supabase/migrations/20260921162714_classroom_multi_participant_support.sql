alter table public.classroom_attendance add column if not exists mic_enabled boolean not null default true;
alter table public.classroom_attendance add column if not exists camera_enabled boolean not null default true;
alter table public.classroom_attendance add column if not exists status text not null default 'joined' check (status in ('joined', 'left', 'removed'));

create or replace function private.is_classroom_participant(p_classroom_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1 from public.classroom_sessions cs
    where cs.id = p_classroom_session_id
      and (cs.tutor_id = auth.uid() or cs.student_id = auth.uid())
  )
  or exists (
    select 1 from public.classroom_attendance ca
    where ca.classroom_session_id = p_classroom_session_id
      and ca.participant_id = auth.uid()
      and ca.left_at is null
  )
  or private.is_admin();
$$;

revoke all on function private.is_classroom_participant(uuid) from public;
grant execute on function private.is_classroom_participant(uuid) to authenticated;

create or replace function private.enforce_classroom_participant_cap()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  active_student_count integer;
begin
  if new.participant_role = 'student' and new.status = 'joined' then
    select count(*) into active_student_count
      from public.classroom_attendance
      where classroom_session_id = new.classroom_session_id
        and participant_role = 'student'
        and status = 'joined'
        and left_at is null
        and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
    if active_student_count >= 10 then
      raise exception 'This class already has the maximum of 10 students connected';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_classroom_attendance_cap on public.classroom_attendance;
create trigger on_classroom_attendance_cap
  before insert or update on public.classroom_attendance
  for each row execute function private.enforce_classroom_participant_cap();

drop policy if exists classroom_attendance_select on public.classroom_attendance;
create policy classroom_attendance_select on public.classroom_attendance
  for select to authenticated
  using (private.is_classroom_participant(classroom_session_id));

drop policy if exists classroom_sessions_select on public.classroom_sessions;
create policy classroom_sessions_select on public.classroom_sessions
  for select to authenticated
  using (private.is_classroom_participant(id));

drop policy if exists classroom_sessions_update on public.classroom_sessions;
create policy classroom_sessions_update on public.classroom_sessions
  for update to authenticated
  using (tutor_id = (select auth.uid()) or student_id = (select auth.uid()))
  with check (tutor_id = (select auth.uid()) or student_id = (select auth.uid()));

drop policy if exists "Classroom participants can view whiteboard documents" on public.whiteboard_documents;
create policy "Classroom participants can view whiteboard documents"
  on public.whiteboard_documents for select
  using (private.is_classroom_participant(classroom_session_id));

drop policy if exists classroom_chat_messages_select on public.classroom_chat_messages;
create policy classroom_chat_messages_select on public.classroom_chat_messages
  for select to authenticated
  using (private.is_classroom_participant(classroom_session_id));

drop policy if exists classroom_chat_messages_insert on public.classroom_chat_messages;
create policy classroom_chat_messages_insert on public.classroom_chat_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.is_classroom_participant(classroom_session_id));

drop policy if exists classroom_tool_instances_select on public.classroom_tool_instances;
create policy classroom_tool_instances_select on public.classroom_tool_instances
  for select to authenticated
  using (private.is_classroom_participant(classroom_session_id));

drop policy if exists lesson_recordings_select on public.lesson_recordings;
create policy lesson_recordings_select on public.lesson_recordings
  for select to authenticated
  using (private.is_classroom_participant(classroom_session_id));

create index if not exists classroom_attendance_active_idx on public.classroom_attendance (classroom_session_id, participant_role) where status = 'joined' and left_at is null;
