-- Support requests ("Submit a Ticket", "Report an Issue", manual tickets
-- filed by staff) — replaces the browser-only localStorage store so every
-- request actually reaches the Admin Support inbox.
--
-- All writes go through server actions using the service-role client
-- (src/lib/actions/support.ts), which check who the caller is first. RLS
-- here only lets a signed-in requester READ their own requests and the
-- non-internal messages on them.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  requester_id uuid references public.profiles(id) on delete set null,
  requester_name text not null,
  requester_email text,
  requester_phone text,
  requester_role text not null check (requester_role in ('Guest', 'Student', 'Tutor', 'Admin')),
  is_existing_user boolean,
  context text not null,
  category text not null,
  subcategory text,
  subject text not null,
  message text not null,
  source text not null default 'Ticket' check (source in ('Ticket', 'Report', 'Email', 'Live Chat', 'Manual')),
  channel text,
  filed_by_id uuid references public.profiles(id) on delete set null,
  filed_by_name text,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed')),
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_name text,
  related_record_type text,
  related_record_id text,
  related_record_label text,
  -- Signed-out visitors using the Benny live chat: a random key kept in
  -- their browser, so they can keep reading replies to their own chat.
  guest_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_requests_requester_idx on public.support_requests (requester_id, created_at desc);
create index if not exists support_requests_status_idx on public.support_requests (status, updated_at desc);
create index if not exists support_requests_guest_token_idx on public.support_requests (guest_token) where guest_token is not null;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author text not null check (author in ('user', 'staff')),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null default '',
  is_internal boolean not null default false,
  -- [{ "name": "...", "size": 1234, "mimeType": "...", "path": "<storage path>" }]
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_request_idx on public.support_messages (request_id, created_at);

create table if not exists public.support_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_activity_request_idx on public.support_activity (request_id, created_at);

alter table public.support_requests enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_activity enable row level security;

drop policy if exists "support_requests_read_own" on public.support_requests;
create policy "support_requests_read_own" on public.support_requests
  for select to authenticated using (requester_id = auth.uid());

drop policy if exists "support_messages_read_own" on public.support_messages;
create policy "support_messages_read_own" on public.support_messages
  for select to authenticated using (
    not is_internal
    and exists (select 1 from public.support_requests r where r.id = request_id and r.requester_id = auth.uid())
  );

-- Private bucket for ticket attachments. Uploads use signed upload URLs
-- handed out by the server, and files are only ever read back through
-- short-lived signed URLs, so no storage policies are needed.
insert into storage.buckets (id, name, public, file_size_limit)
values ('support-attachments', 'support-attachments', false, 5242880)
on conflict (id) do nothing;
