-- Real Storage backing for message attachments, plus the moderation
-- columns the content-safety scan (contact-info detection) writes to.
--
-- The application tables (conversations/conversation_participants/messages/
-- message_attachments) and their row-level RLS already exist and are
-- correct — this migration only adds what was missing: a private Storage
-- bucket for the actual files, and access policies on storage.objects that
-- mirror the exact same "must be a participant in this conversation" rule
-- messages_select/message_attachments_select already enforce. Nothing here
-- makes attachments public — every read still requires proving conversation
-- membership (or admin/has_permission('messages','view')), the same as a
-- text message already does.
--
-- Storage path convention: {conversation_id}/{client_message_id}/{filename}
-- — conversation_id (not message_id) is the first path segment because the
-- real upload happens BEFORE the message row exists (the app uploads the
-- file, confirms it, THEN creates the message + attachment metadata rows —
-- never the reverse, so a failed upload can never masquerade as a sent
-- attachment). client_message_id is the same client-generated id already
-- used for messages.client_id's idempotent-send matching.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  26214400, -- 25 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

-- Upload: the first path segment (conversation_id) must be a conversation
-- the uploader is actually a participant of — matches messages_insert's own
-- "must be a participant to write into this conversation" rule.
create policy "message_attachments_storage_insert" on storage.objects
for insert
with check (
  bucket_id = 'message-attachments'
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = (storage.foldername(name))[1]::uuid
      and cp.user_id = (select auth.uid())
  )
);

-- Read/download: identical membership check, plus the same admin/
-- has_permission override messages_select and message_attachments_select
-- already grant — one consistent access rule across the whole feature,
-- not a separate, looser one for the actual files.
create policy "message_attachments_storage_select" on storage.objects
for select
using (
  bucket_id = 'message-attachments'
  and (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = (storage.foldername(name))[1]::uuid
        and cp.user_id = (select auth.uid())
    )
    or (select private.is_admin())
    or (select private.has_permission('messages', 'view'))
  )
);

-- Delete: only the uploader (Storage's own `owner` column, set
-- automatically to auth.uid() on insert) — matches "the sender can manage
-- their own sent attachment" without opening it to every participant.
create policy "message_attachments_storage_delete" on storage.objects
for delete
using (bucket_id = 'message-attachments' and owner = (select auth.uid()));

-- Content-safety scan result — written by the scan-attachment Edge
-- Function before an attachment is ever considered "sent". Every row that
-- exists here has already passed (or the row wouldn't have been created at
-- all — see the upload flow's pre-flight scan), so 'approved' is the
-- expected steady state; 'pending' covers the brief window between the
-- metadata row being written and the scan call returning, and 'blocked' is
-- kept for audit visibility even though a blocked attachment's underlying
-- file is deleted from Storage rather than left reachable.
alter table public.message_attachments
  add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'blocked')),
  add column if not exists blocked_reason text;
