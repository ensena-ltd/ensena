create or replace function public.handle_new_message_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  sender_name text;
  recipient record;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;

  for recipient in
    select user_id from public.conversation_participants where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    insert into public.notifications (user_id, category, text, action_url)
    values (recipient.user_id, 'Message', coalesce(sender_name, 'Someone') || ' sent you a message', '/messages');
  end loop;

  return new;
end;
$function$;
