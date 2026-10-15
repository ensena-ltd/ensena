create table public.student_waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(btrim(first_name)) between 2 and 80),
  email text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[0-9]{8,15}$'),
  level text not null check (char_length(level) <= 40),
  needs text[] not null default '{}' check (cardinality(needs) <= 12),
  source text not null default 'student_waitlist_landing' check (char_length(source) <= 60),
  created_at timestamptz not null default now()
);
comment on table public.student_waitlist_signups is 'Sign-ups from the Ensena Student Waitlist landing page. Insert-only for the public; read via dashboard/service role.';
alter table public.student_waitlist_signups enable row level security;
create policy "Public can join the student waitlist" on public.student_waitlist_signups
  for insert to anon, authenticated with check (true);
grant insert on public.student_waitlist_signups to anon, authenticated;
