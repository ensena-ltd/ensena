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
