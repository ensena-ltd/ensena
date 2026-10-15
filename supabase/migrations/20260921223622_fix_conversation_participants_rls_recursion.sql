create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_participant(uuid) from public;
grant execute on function private.is_conversation_participant(uuid) to authenticated;

drop policy if exists "conversation_participants_select" on public.conversation_participants;
create policy "conversation_participants_select" on public.conversation_participants
for select
using (
  private.is_conversation_participant(conversation_id)
  or (select private.is_admin())
  or (select private.has_permission('messages', 'view'))
);
