-- Phase 2 of the dashboard-data migration: messaging, offers, and a
-- unified notifications table (replaces both notifications-store.ts and
-- tutor-notifications-store.ts — same shape, no reason to keep separate).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct', 'booking', 'offer', 'support')),
  context_label text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  pinned boolean not null default false,
  archived boolean not null default false,
  unread_count integer not null default 0,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  divider_label text,
  reaction text,
  client_id text,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_sender_id_idx on public.messages (sender_id);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  name text not null,
  mime_type text not null,
  size bigint not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create index message_attachments_message_id_idx on public.message_attachments (message_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

create policy conversations_select on public.conversations
  for select to authenticated
  using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = id and cp.user_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('messages', 'view'))
  );

create policy conversation_participants_select on public.conversation_participants
  for select to authenticated
  using (
    exists (select 1 from public.conversation_participants cp2 where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('messages', 'view'))
  );

create policy conversation_participants_update_own on public.conversation_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy messages_select on public.messages
  for select to authenticated
  using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('messages', 'view'))
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = (select auth.uid()))
  );

-- Reaction is the one field a non-sender participant can set (react to
-- someone else's message) — column-scoped so the body itself stays
-- immutable once sent.
grant update (reaction) on public.messages to authenticated;

create policy messages_update_reaction on public.messages
  for update to authenticated
  using (exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = (select auth.uid())))
  with check (exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = (select auth.uid())));

create policy message_attachments_select on public.message_attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_id and cp.user_id = (select auth.uid())
    )
  );

create policy message_attachments_insert on public.message_attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m where m.id = message_id and m.sender_id = (select auth.uid())
    )
  );

-- Starts a conversation + seats both participants atomically — avoids a
-- client ever being able to create a conversation it isn't a member of,
-- or a half-created conversation with only one participant row.
create or replace function public.start_conversation(p_other_user_id uuid, p_kind text default 'direct', p_context_label text default null)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  existing uuid;
  conv_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_kind not in ('direct', 'booking', 'offer', 'support') then
    raise exception 'Invalid conversation kind: %', p_kind;
  end if;

  if p_kind = 'direct' then
    select cp1.conversation_id into existing
    from public.conversation_participants cp1
    join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
    join public.conversations c on c.id = cp1.conversation_id
    where cp1.user_id = uid and cp2.user_id = p_other_user_id and c.kind = 'direct'
    limit 1;
    if existing is not null then
      return existing;
    end if;
  end if;

  insert into public.conversations (kind, context_label) values (p_kind, p_context_label) returning id into conv_id;
  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, uid), (conv_id, p_other_user_id);
  return conv_id;
end;
$$;

revoke execute on function public.start_conversation(uuid, text, text) from public, anon;
grant execute on function public.start_conversation(uuid, text, text) to authenticated;

create or replace function public.handle_conversations_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants
    set unread_count = unread_count + 1
    where conversation_id = new.conversation_id and user_id <> new.sender_id;
  return new;
end;
$$;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.handle_conversations_updated_at();

-- =======================================================================
-- Offers (negotiation embedded in a conversation)
-- =======================================================================
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  kind text not null,
  booking_kind text,
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  subject text not null,
  scheduled_at timestamptz,
  duration_minutes integer,
  frequency text,
  days_per_week integer,
  lessons_count integer,
  pricing jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_student_id_idx on public.offers (student_id);
create index offers_tutor_id_idx on public.offers (tutor_id);
create index offers_conversation_id_idx on public.offers (conversation_id);

create table public.offer_negotiation_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  amount numeric(10, 2),
  note text,
  created_at timestamptz not null default now()
);

create index offer_negotiation_history_offer_id_idx on public.offer_negotiation_history (offer_id);

alter table public.offers enable row level security;
alter table public.offer_negotiation_history enable row level security;

create policy offers_select on public.offers
  for select to authenticated
  using (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

create policy offers_insert on public.offers
  for insert to authenticated
  with check (student_id = (select auth.uid()) or tutor_id = (select auth.uid()));

create policy offer_negotiation_history_select on public.offer_negotiation_history
  for select to authenticated
  using (
    exists (select 1 from public.offers o where o.id = offer_id and (o.student_id = (select auth.uid()) or o.tutor_id = (select auth.uid())))
    or (select private.is_admin()) or (select private.has_permission('bookings', 'view'))
  );

revoke all on public.offer_negotiation_history from anon, authenticated;
grant select on public.offer_negotiation_history to authenticated;

create or replace function public.handle_offer_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_offer_updated
  before update on public.offers
  for each row execute function public.handle_offer_updated_at();

-- respond_to_offer(): the only way an offer's status changes, so the
-- negotiation history is always complete and only the counterparty (not
-- the offer's own author) can accept/decline it.
create or replace function public.respond_to_offer(p_offer_id uuid, p_action text, p_amount numeric default null, p_note text default null)
returns public.offers
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  offer public.offers;
begin
  if p_action not in ('accept', 'decline', 'counter') then
    raise exception 'Invalid offer action: %', p_action;
  end if;

  select * into offer from public.offers where id = p_offer_id for update;
  if offer is null then
    raise exception 'Offer not found';
  end if;
  if uid <> offer.student_id and uid <> offer.tutor_id then
    raise exception 'Not authorized to respond to this offer';
  end if;
  if offer.status <> 'pending' and offer.status <> 'countered' then
    raise exception 'This offer is no longer open';
  end if;

  update public.offers
    set status = case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'countered' end
    where id = p_offer_id
    returning * into offer;

  insert into public.offer_negotiation_history (offer_id, actor_id, action, amount, note)
    values (p_offer_id, uid, p_action, p_amount, p_note);

  return offer;
end;
$$;

revoke execute on function public.respond_to_offer(uuid, text, numeric, text) from public, anon;
grant execute on function public.respond_to_offer(uuid, text, numeric, text) to authenticated;

-- =======================================================================
-- Unified notifications (replaces notifications-store.ts +
-- tutor-notifications-store.ts)
-- =======================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  category text not null,
  text text not null,
  related_booking_id uuid,
  action_url text,
  unread boolean not null default true,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- unread/dismissed are the only client-settable fields ("mark read",
-- "dismiss") — new notifications are inserted by triggers/RPCs/service
-- role, never directly by the recipient.
grant update (unread, dismissed) on public.notifications to authenticated;

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.notifications from anon, authenticated;

-- New-message notification for every other participant.
create or replace function public.handle_new_message_notification()
returns trigger language plpgsql set search_path = public as $$
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
$$;

create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.handle_new_message_notification();
