-- 0018: real tutor Settings (Privacy / Calendar) and Availability.
--
--   tutor_profiles.profile_public              — listed in Find a Tutor / recommendations
--   tutor_profiles.show_last_active            — students see "Active 2h ago" on the profile
--   tutor_profiles.allow_new_student_messages  — students without a booking can start a chat
--   tutor_profiles.vacation_mode               — pauses all new bookings
--   account_settings.default_lesson_duration   — preselected length on the booking page
--   profiles.last_seen_at                      — refreshed as the user moves around a dashboard

alter table public.tutor_profiles
  add column if not exists profile_public boolean not null default true,
  add column if not exists show_last_active boolean not null default true,
  add column if not exists allow_new_student_messages boolean not null default true,
  add column if not exists vacation_mode boolean not null default false;

alter table public.account_settings
  add column if not exists default_lesson_duration integer not null default 60
    check (default_lesson_duration in (30, 45, 60, 90));

alter table public.profiles
  add column if not exists last_seen_at timestamptz;
