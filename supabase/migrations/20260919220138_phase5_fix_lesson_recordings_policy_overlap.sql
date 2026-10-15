drop policy lesson_recordings_tutor_manage on public.lesson_recordings;

create policy lesson_recordings_insert on public.lesson_recordings
  for insert to authenticated
  with check (exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and cs.tutor_id = (select auth.uid())));

create policy lesson_recordings_update on public.lesson_recordings
  for update to authenticated
  using (exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and cs.tutor_id = (select auth.uid())))
  with check (exists (select 1 from public.classroom_sessions cs where cs.id = classroom_session_id and cs.tutor_id = (select auth.uid())));
