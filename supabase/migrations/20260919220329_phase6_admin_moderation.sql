-- Phase 6 of the dashboard-data migration: admin/moderation (reports,
-- moderation violations, account restrictions — the single source for
-- both admin moderation AND the student/tutor "effective account
-- status" account-status-store.ts currently fakes), communications,
-- featured placements, staff invitations, and lightweight analytics
-- events. Community (posts/comments) is explicitly out of scope per the
-- plan — feature-flagged off, not reachable from any live page.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  reported_user_id uuid references public.profiles(id),
  reporter_id uuid references public.profiles(id),
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  booking_id uuid,
  timeline jsonb not null default '[]'::jsonb,
  resolution jsonb not null default '{}'::jsonb,
  escalation jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index reports_reported_user_id_idx on public.reports (reported_user_id);
create index reports_reporter_id_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

create policy reports_select on public.reports
  for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('moderation', 'view'))
  );

create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy reports_update_staff on public.reports
  for update to authenticated
  using ((select private.is_admin()) or (select private.has_permission('moderation', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('moderation', 'manage')));

create table public.moderation_violations (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  category text not null,
  confidence numeric(4, 3),
  channel text not null,
  confirmed boolean not null default false,
  report_id uuid references public.reports(id),
  evidence_snippet text,
  from_context_window boolean not null default false,
  occurred_at timestamptz not null default now()
);

create index moderation_violations_actor_id_idx on public.moderation_violations (actor_id);
create index moderation_violations_report_id_idx on public.moderation_violations (report_id);

alter table public.moderation_violations enable row level security;

create policy moderation_violations_select on public.moderation_violations
  for select to authenticated
  using ((select private.is_admin()) or (select private.has_permission('moderation', 'view')));

-- System/service-role inserted only (automated content scanning) — no
-- client insert policy.
revoke insert, update, delete on public.moderation_violations from anon, authenticated;

create table public.account_restrictions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  type text not null check (type in ('Warning', 'MessagingRestriction', 'Suspension')),
  reason text not null,
  violation_count_at_time integer not null default 0,
  status text not null default 'active' check (status in ('active', 'expired', 'reversed', 'under_review')),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  duration_label text,
  created_by uuid references public.profiles(id),
  case_report_id uuid references public.reports(id),
  supersedes_id uuid references public.account_restrictions(id),
  appeal_ticket_id uuid,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_reason text
);

create index account_restrictions_actor_id_idx on public.account_restrictions (actor_id);
create index account_restrictions_created_by_idx on public.account_restrictions (created_by);
create index account_restrictions_case_report_id_idx on public.account_restrictions (case_report_id);
create index account_restrictions_supersedes_id_idx on public.account_restrictions (supersedes_id);
create index account_restrictions_resolved_by_idx on public.account_restrictions (resolved_by);

alter table public.account_restrictions enable row level security;

-- The affected user can see their own restriction history (needed for
-- the account-status banner), on top of staff visibility.
create policy account_restrictions_select on public.account_restrictions
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('moderation', 'view'))
  );

revoke insert, update, delete on public.account_restrictions from anon, authenticated;

create or replace function public.apply_account_restriction(p_actor_id uuid, p_type text, p_reason text, p_end_at timestamptz default null, p_duration_label text default null, p_case_report_id uuid default null)
returns public.account_restrictions
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  violation_count integer;
  restriction public.account_restrictions;
begin
  if not (private.is_admin() or private.has_permission('moderation', 'manage')) then
    raise exception 'Not authorized to apply restrictions';
  end if;
  if p_type not in ('Warning', 'MessagingRestriction', 'Suspension') then
    raise exception 'Invalid restriction type: %', p_type;
  end if;

  select count(*) into violation_count from public.moderation_violations where actor_id = p_actor_id and confirmed = true;

  insert into public.account_restrictions (actor_id, type, reason, violation_count_at_time, end_at, duration_label, created_by, case_report_id)
    values (p_actor_id, p_type, p_reason, violation_count, p_end_at, p_duration_label, uid, p_case_report_id)
    returning * into restriction;

  return restriction;
end;
$$;

create or replace function public.resolve_account_restriction(p_restriction_id uuid, p_resolution_reason text)
returns public.account_restrictions
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  restriction public.account_restrictions;
begin
  if not (private.is_admin() or private.has_permission('moderation', 'manage')) then
    raise exception 'Not authorized to resolve restrictions';
  end if;

  update public.account_restrictions
    set status = 'reversed', resolved_by = uid, resolved_at = now(), resolution_reason = p_resolution_reason
    where id = p_restriction_id
    returning * into restriction;

  if restriction is null then
    raise exception 'Restriction not found';
  end if;

  return restriction;
end;
$$;

revoke execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid) from public, anon;
revoke execute on function public.resolve_account_restriction(uuid, text) from public, anon;
grant execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid) to authenticated;
grant execute on function public.resolve_account_restriction(uuid, text) to authenticated;

-- Effective status: the most recent active, non-expired restriction —
-- replaces account-status-store.ts's derivation.
create or replace function public.get_effective_account_status(p_actor_id uuid)
returns public.account_restrictions
language sql
stable
set search_path = public
as $$
  select * from public.account_restrictions
  where actor_id = p_actor_id and status = 'active' and (end_at is null or end_at > now())
  order by start_at desc
  limit 1;
$$;

revoke execute on function public.get_effective_account_status(uuid) from public, anon;
grant execute on function public.get_effective_account_status(uuid) to authenticated;

-- =======================================================================
-- Communications
-- =======================================================================
create table public.admin_communications_sent (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references public.profiles(id),
  audience_label text not null,
  recipient_count integer not null default 0,
  channels jsonb not null default '[]'::jsonb,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

create index admin_communications_sent_sent_by_idx on public.admin_communications_sent (sent_by);

create table public.admin_communications_scheduled (
  id uuid primary key default gen_random_uuid(),
  scheduled_by uuid references public.profiles(id),
  audience_label text not null,
  recipient_count integer not null default 0,
  channels jsonb not null default '[]'::jsonb,
  subject text not null,
  body text not null,
  scheduled_for timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'sent')),
  created_at timestamptz not null default now()
);

create index admin_communications_scheduled_scheduled_by_idx on public.admin_communications_scheduled (scheduled_by);

alter table public.admin_communications_sent enable row level security;
alter table public.admin_communications_scheduled enable row level security;

create policy admin_communications_sent_manage on public.admin_communications_sent
  for all to authenticated
  using ((select private.is_admin()) or (select private.has_permission('communications', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('communications', 'manage')));

create policy admin_communications_scheduled_manage on public.admin_communications_scheduled
  for all to authenticated
  using ((select private.is_admin()) or (select private.has_permission('communications', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('communications', 'manage')));

-- =======================================================================
-- Featured placements
-- =======================================================================
create table public.featured_tutors (
  tutor_id uuid primary key references public.profiles(id),
  featured_from timestamptz not null default now(),
  featured_until timestamptz
);

create table public.featured_group_classes (
  group_class_id uuid primary key references public.group_classes(id),
  featured_from timestamptz not null default now(),
  featured_until timestamptz
);

alter table public.featured_tutors enable row level security;
alter table public.featured_group_classes enable row level security;

create policy featured_tutors_select on public.featured_tutors
  for select to anon, authenticated using (true);

create policy featured_tutors_insert on public.featured_tutors
  for insert to authenticated
  with check ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));

create policy featured_tutors_delete on public.featured_tutors
  for delete to authenticated
  using ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));

create policy featured_group_classes_select on public.featured_group_classes
  for select to anon, authenticated using (true);

create policy featured_group_classes_insert on public.featured_group_classes
  for insert to authenticated
  with check ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));

create policy featured_group_classes_delete on public.featured_group_classes
  for delete to authenticated
  using ((select private.is_admin()) or (select private.has_permission('promotions', 'manage')));

-- =======================================================================
-- Staff invitations — the one net-new piece of "Team Management"; the
-- account/role linkage itself already exists via profiles + staff_roles
-- + user_staff_roles (migrations 0007/0008).
-- =======================================================================
create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  email text not null,
  role_id uuid not null references public.staff_roles(id),
  custom_permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.profiles(id),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked'))
);

create index staff_invitations_role_id_idx on public.staff_invitations (role_id);
create index staff_invitations_invited_by_idx on public.staff_invitations (invited_by);

alter table public.staff_invitations enable row level security;

create policy staff_invitations_manage on public.staff_invitations
  for all to authenticated
  using ((select private.is_admin()) or (select private.has_permission('staff', 'manage')))
  with check ((select private.is_admin()) or (select private.has_permission('staff', 'manage')));

-- =======================================================================
-- Lightweight analytics events
-- =======================================================================
create table public.signup_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  role text not null check (role in ('student', 'tutor')),
  occurred_at timestamptz not null default now()
);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  page_category text,
  page_title text,
  entity_id text,
  device text,
  visitor_id text,
  session_id text,
  logged_in boolean not null default false,
  occurred_at timestamptz not null default now()
);

create index page_views_occurred_at_idx on public.page_views (occurred_at);

alter table public.signup_events enable row level security;
alter table public.page_views enable row level security;

-- Recorded at real signup/pageview time, including by logged-out
-- visitors — insertable by anyone, but only readable by staff analytics.
create policy signup_events_insert on public.signup_events
  for insert to anon, authenticated with check (true);

create policy signup_events_select on public.signup_events
  for select to authenticated
  using ((select private.is_admin()) or (select private.has_permission('analytics', 'view')));

create policy page_views_insert on public.page_views
  for insert to anon, authenticated with check (true);

create policy page_views_select on public.page_views
  for select to authenticated
  using ((select private.is_admin()) or (select private.has_permission('analytics', 'view')));
