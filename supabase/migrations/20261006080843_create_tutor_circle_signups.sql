create table public.tutor_circle_signups (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  source text not null default 'tutor_circle_landing' check (char_length(source) <= 60),
  created_at timestamptz not null default now()
);

create unique index tutor_circle_signups_email_key on public.tutor_circle_signups (lower(email));

alter table public.tutor_circle_signups enable row level security;

revoke all on public.tutor_circle_signups from anon, authenticated;
grant insert (full_name, email, source) on public.tutor_circle_signups to anon, authenticated;

create policy "Public can sign up for Tutor Circle"
  on public.tutor_circle_signups
  for insert
  to anon, authenticated
  with check (true);

comment on table public.tutor_circle_signups is 'Name and email captured on the Tutor Circle landing page before joining the WhatsApp community. Insert-only for the public; read via dashboard/service role.';
