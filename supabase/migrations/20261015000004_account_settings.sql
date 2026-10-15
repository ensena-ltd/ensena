-- 0016: real Privacy / Security / Calendar / Theme settings.
--
--   student_profiles.profile_public                — tutors can view the student's
--                                                    profile before any booking
--   student_profiles.share_progress_with_guardian  — linked guardian can see the
--                                                    student's learning plan & progress
--   account_settings                               — per-user: login alerts, theme,
--                                                    private calendar-feed token
--   known_devices                                  — browsers a user has signed in
--                                                    from (for "new device" alerts)

alter table public.student_profiles
  add column if not exists profile_public boolean not null default false,
  add column if not exists share_progress_with_guardian boolean not null default true;

create table if not exists public.account_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  login_alerts boolean not null default true,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  calendar_token text unique,
  updated_at timestamptz not null default now()
);

alter table public.account_settings enable row level security;

drop policy if exists "account_settings own row" on public.account_settings;
create policy "account_settings own row" on public.account_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.known_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- Written only by the server (service role); no client policies.
alter table public.known_devices enable row level security;
