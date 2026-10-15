-- Extends the restriction enforcement RPCs introduced in the
-- phase6_admin_moderation migration (applied directly to the live project,
-- not previously saved to this repo's migrations folder).
--
-- Closes two gaps needed to wire the frontend's admin restriction workflow
-- (src/lib/moderation-store.ts) onto this real backend instead of its
-- previous localStorage-only ledger:
--
-- 1. apply_account_restriction had no way to atomically supersede a prior
--    restriction (an admin's manual decision replacing an automatic interim
--    one) or to back/forward-date a restriction's start.
-- 2. There was no self-service path for a restricted user to mark their own
--    restriction "under review" after filing an appeal ticket.

create or replace function public.apply_account_restriction(
  p_actor_id uuid,
  p_type text,
  p_reason text,
  p_end_at timestamptz default null,
  p_duration_label text default null,
  p_case_report_id uuid default null,
  p_supersedes_id uuid default null,
  p_start_at timestamptz default now()
)
returns account_restrictions
language plpgsql
security definer
set search_path = 'public', 'private'
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

  insert into public.account_restrictions (actor_id, type, reason, violation_count_at_time, start_at, end_at, duration_label, created_by, case_report_id, supersedes_id)
    values (p_actor_id, p_type, p_reason, violation_count, coalesce(p_start_at, now()), p_end_at, p_duration_label, uid, p_case_report_id, p_supersedes_id)
    returning * into restriction;

  if p_supersedes_id is not null then
    update public.account_restrictions
      set status = 'reversed', resolved_by = uid, resolved_at = now(), resolution_reason = 'Superseded by a new admin action'
      where id = p_supersedes_id and status = 'active';
  end if;

  return restriction;
end;
$$;

alter table public.account_restrictions add column if not exists appeal_ticket_ref text;

create or replace function public.mark_restriction_under_review(
  p_restriction_id uuid,
  p_appeal_ticket_ref text
)
returns account_restrictions
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  uid uuid := (select auth.uid());
  restriction public.account_restrictions;
begin
  update public.account_restrictions
    set status = case when status = 'active' then 'under_review' else status end,
        appeal_ticket_ref = p_appeal_ticket_ref
    where id = p_restriction_id and actor_id = uid
    returning * into restriction;

  if restriction is null then
    raise exception 'Restriction not found or not owned by the caller';
  end if;

  return restriction;
end;
$$;
