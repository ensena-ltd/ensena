-- Tables backing the two public forms that actually write to the database
-- today (src/lib/actions/newsletter.ts, src/lib/actions/contact.ts). Run
-- this in the Supabase SQL editor, or via `supabase db push`, before those
-- forms will work.
--
-- Both tables have RLS enabled with no policies: only the service-role key
-- (used server-side in the actions above) can read or write them — see the
-- comment in src/lib/supabase.ts for why.

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'SUBSCRIBED' check (status in ('SUBSCRIBED', 'UNSUBSCRIBED')),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscriptions enable row level security;

-- Submissions from the public /contact form. user_id is set only once real
-- auth exists and a signed-in visitor submits the form — see the comment in
-- src/lib/actions/contact.ts.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  email text not null,
  role text not null,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'NEW' check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
