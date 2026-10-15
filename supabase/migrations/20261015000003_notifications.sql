-- Notification preferences, web-push subscriptions and a send log.
--
-- notification_preferences — per user: email (Resend, from
--   noreply@ensena.co), SMS (not used yet) and push. No row = defaults
--   (email on, push off).
-- push_subscriptions — one row per browser/device that turned push on.
-- notification_log — what was already sent (lesson reminders, homework), so
--   the scheduled job never sends the same thing twice.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

-- Only the server (service role) reads/writes the log.
alter table public.notification_log enable row level security;
