-- Promotional campaigns shown to students on /student-dashboard/promotions.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  code text,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'amount', 'none')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  applies_to text not null default 'all' check (applies_to in ('all', 'private', 'group', 'counselling')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists promotions_active_window_idx on public.promotions (active, starts_at, ends_at);
create index if not exists promotions_created_by_idx on public.promotions (created_by);

alter table public.promotions enable row level security;

-- Signed-in users see campaigns that are live right now; staff with the
-- promotions permission (or admins) see and manage all of them.
create policy promotions_select on public.promotions
  for select to authenticated
  using (
    (active and starts_at <= now() and (ends_at is null or ends_at > now()))
    or (select private.is_admin())
    or (select private.has_permission('promotions', 'view'))
  );
create policy promotions_insert on public.promotions
  for insert to authenticated
  with check ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));
create policy promotions_update on public.promotions
  for update to authenticated
  using ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));
create policy promotions_delete on public.promotions
  for delete to authenticated
  using ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));
