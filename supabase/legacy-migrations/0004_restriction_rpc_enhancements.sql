-- Extends the restriction enforcement RPCs introduced in the
-- phase6_admin_moderation migration (applied directly to the live project,
-- not previously saved to this repo's migrations folder — see this repo's
-- supabase/migrations/ directory, which stops at 0003_classroom.sql while
-- the live project has 20 migrations applied; reconciling that gap is a
-- separate follow-up, out of scope here).
--
-- Closes two gaps needed to wire the frontend's admin restriction workflow
-- (src/lib/moderation-store.ts) onto this real backend instead of its
-- previous localStorage-only ledger:
--
-- 1. apply_account_restriction had no way to atomically supersede a prior
--    restriction (an admin's manual decision replacing an automatic interim
--    one) or to back/forward-date a restriction's start — both of which the
--    frontend's existing applyRestriction() already supports.
-- 2. There was no self-service path for a restricted user to mark their own
--    restriction "under review" after filing an appeal ticket (only admins
--    could write to account_restrictions, via the two SECURITY DEFINER
--    functions below) — every other write on this table is intentionally
--    admin-gated, so this one new function is scoped as narrowly as
--    possible: it may only touch the caller's own row, and only to attach
--    an appeal ticket id.

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

  -- Superseding an existing restriction resolves it in the same
  -- transaction, so a new admin decision on top of an active case never
  -- leaves two rows effectively active — mirrors applyRestriction's
  -- existing supersedesId behavior on the (previous) localStorage ledger.
  if p_supersedes_id is not null then
    update public.account_restrictions
      set status = 'reversed', resolved_by = uid, resolved_at = now(), resolution_reason = 'Superseded by a new admin action'
      where id = p_supersedes_id and status = 'active';
  end if;

  return restriction;
end;
$$;

-- create or replace function on a changed signature creates a new function
-- object with Postgres' default privileges (EXECUTE granted to PUBLIC,
-- which includes anon) rather than inheriting the previous grants. Match
-- the project's existing convention for these RPCs (authenticated +
-- service_role only, no anon/PUBLIC) — resolve_account_restriction and
-- get_effective_account_status already follow this. Re-applied below once
-- the final 8-arg signature exists (the grant target must match exactly).

-- `create or replace` requires an identical argument signature to actually
-- replace a function; adding the two trailing params above created a SECOND
-- overload instead of replacing the original 6-arg version, which would
-- leave PostgREST with an ambiguous target for
-- supabase.rpc('apply_account_restriction', {...}). Drop the superseded one.
drop function if exists public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid);

-- Support tickets (src/lib/support-store.ts) are still a localStorage-mock
-- system with no matching real Postgres table, so their ids (e.g.
-- "act-171...-ab3fg") aren't valid uuids and can't populate the existing
-- appeal_ticket_id uuid column, which is reserved for a future real ticket
-- table's ids. This text column carries today's mock ticket reference
-- instead, without repurposing the typed column.
alter table public.account_restrictions add column if not exists appeal_ticket_ref text;

-- Narrow self-service write: a restricted user filing an appeal (see
-- restriction-appeal-modal.tsx) may attach their own ticket reference and
-- move their own restriction into under_review — nothing else. Every other
-- mutation on this table stays admin-only via the two functions above.
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

-- `revoke all ... from public` only strips the implicit PUBLIC grant —
-- Supabase's default-privileges setup grants EXECUTE to anon explicitly, so
-- that needs its own revoke too.
revoke all on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) from public;
revoke execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) from anon;
grant execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) to authenticated, service_role;

revoke all on function public.mark_restriction_under_review(uuid, text) from public;
revoke execute on function public.mark_restriction_under_review(uuid, text) from anon;
grant execute on function public.mark_restriction_under_review(uuid, text) to authenticated, service_role;
