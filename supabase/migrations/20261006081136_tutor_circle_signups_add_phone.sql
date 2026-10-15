alter table public.tutor_circle_signups
  add column phone_country text check (phone_country ~ '^[A-Z]{2}$'),
  add column phone text check (phone ~ '^\+[0-9]{8,15}$');

grant insert (full_name, email, source, phone_country, phone) on public.tutor_circle_signups to anon, authenticated;

comment on column public.tutor_circle_signups.phone is 'Full international number, e.g. +2348012345678';
comment on column public.tutor_circle_signups.phone_country is 'ISO country code chosen in the form, e.g. NG';
