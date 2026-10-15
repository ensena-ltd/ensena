-- Phase 4 of the dashboard-data migration: wallet ledger, payment plans/
-- subscriptions/refunds, escrow (lesson_confirmations is the real money
-- source of truth), and payouts. Ledger-only — no real payment processor
-- is wired up here (no Stripe/Paystack credential exists anywhere in
-- this project); balances are computed from these tables at query time,
-- never stored as a mutable running total.

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  description text not null,
  type text not null,
  amount numeric(10, 2) not null,
  direction text not null check (direction in ('credit', 'debit')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_id_idx on public.wallet_transactions (user_id);

alter table public.wallet_transactions enable row level security;

create policy wallet_transactions_select on public.wallet_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('payments', 'view')));

revoke insert, update, delete on public.wallet_transactions from anon, authenticated;

create table public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Private', 'Group')),
  booking_id uuid,
  student_id uuid not null references public.profiles(id),
  scope text not null check (scope in ('session', 'week', 'month', 'full', 'installment')),
  covers_session_ids jsonb not null default '[]'::jsonb,
  amount numeric(10, 2) not null,
  mode text not null default 'oneTime' check (mode in ('oneTime', 'recurring')),
  subscription_id uuid,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'partiallyRefunded', 'cancelled')),
  paid_at timestamptz not null default now(),
  refunded_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index payment_plans_student_id_idx on public.payment_plans (student_id);
create index payment_plans_subscription_id_idx on public.payment_plans (subscription_id);

alter table public.payment_plans enable row level security;

create policy payment_plans_select on public.payment_plans
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('payments', 'view')));

revoke insert, update, delete on public.payment_plans from anon, authenticated;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Private', 'Group')),
  booking_id uuid,
  student_id uuid not null references public.profiles(id),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  amount_per_charge numeric(10, 2) not null,
  next_charge_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'pastDue', 'cancelled')),
  payment_method_ref text,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index subscriptions_student_id_idx on public.subscriptions (student_id);

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('payments', 'view')));

revoke insert, update, delete on public.subscriptions from anon, authenticated;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  payment_plan_id uuid references public.payment_plans(id),
  student_id uuid not null references public.profiles(id),
  amount numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  reason text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_reason text
);

create index refunds_student_id_idx on public.refunds (student_id);
create index refunds_payment_plan_id_idx on public.refunds (payment_plan_id);

alter table public.refunds enable row level security;

create policy refunds_select on public.refunds
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('payments', 'view')));

revoke insert, update, delete on public.refunds from anon, authenticated;

-- =======================================================================
-- Escrow — lesson_confirmations is the real money source of truth
-- =======================================================================
create table public.lesson_confirmations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  tutor_id uuid not null references public.profiles(id),
  subject text not null,
  type text not null check (type in ('Private', 'Group')),
  amount_gross numeric(10, 2) not null,
  completed_at timestamptz not null default now(),
  auto_release_at timestamptz not null,
  confirmation_status text not null default 'Pending' check (confirmation_status in ('Pending', 'Confirmed', 'Disputed')),
  escrow_status text not null default 'Held' check (escrow_status in ('Held', 'Released', 'Frozen')),
  dispute_reason text,
  disputed_at timestamptz,
  created_at timestamptz not null default now()
);

create index lesson_confirmations_student_id_idx on public.lesson_confirmations (student_id);
create index lesson_confirmations_tutor_id_idx on public.lesson_confirmations (tutor_id);

create table public.group_attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_confirmation_id uuid not null references public.lesson_confirmations(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  attended boolean not null default true,
  created_at timestamptz not null default now()
);

create index group_attendance_lesson_confirmation_id_idx on public.group_attendance (lesson_confirmation_id);
create index group_attendance_student_id_idx on public.group_attendance (student_id);

create table public.dispute_resolutions (
  id uuid primary key default gen_random_uuid(),
  lesson_confirmation_id uuid not null unique references public.lesson_confirmations(id) on delete cascade,
  resolved_by uuid references public.profiles(id),
  resolution text not null,
  note text,
  resolved_at timestamptz not null default now()
);

create index dispute_resolutions_resolved_by_idx on public.dispute_resolutions (resolved_by);

alter table public.lesson_confirmations enable row level security;
alter table public.group_attendance enable row level security;
alter table public.dispute_resolutions enable row level security;

create policy lesson_confirmations_select on public.lesson_confirmations
  for select to authenticated
  using (
    student_id = (select auth.uid()) or tutor_id = (select auth.uid())
    or (select private.is_admin()) or (select private.has_permission('payments', 'view'))
  );

-- No direct client insert/update — created by the booking-completion
-- flow (service-role) and mutated only through confirm_lesson_completion
-- / dispute_lesson / release_escrow below.
revoke insert, update, delete on public.lesson_confirmations from anon, authenticated;

create policy group_attendance_select on public.group_attendance
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.lesson_confirmations lc where lc.id = lesson_confirmation_id and lc.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('payments', 'view'))
  );

create policy dispute_resolutions_select on public.dispute_resolutions
  for select to authenticated
  using (
    exists (
      select 1 from public.lesson_confirmations lc where lc.id = lesson_confirmation_id
        and (lc.student_id = (select auth.uid()) or lc.tutor_id = (select auth.uid()))
    )
    or (select private.is_admin()) or (select private.has_permission('payments', 'view'))
  );

-- Student confirms a completed lesson — moves escrow to Released so it
-- counts toward the tutor's available balance.
create or replace function public.confirm_lesson_completion(p_lesson_confirmation_id uuid)
returns public.lesson_confirmations
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  lc public.lesson_confirmations;
begin
  select * into lc from public.lesson_confirmations where id = p_lesson_confirmation_id for update;
  if lc is null then
    raise exception 'Lesson confirmation not found';
  end if;
  if uid <> lc.student_id and not (private.is_admin() or private.has_permission('payments', 'manage')) then
    raise exception 'Not authorized to confirm this lesson';
  end if;
  if lc.confirmation_status = 'Disputed' then
    raise exception 'This lesson is under dispute';
  end if;

  update public.lesson_confirmations
    set confirmation_status = 'Confirmed', escrow_status = 'Released'
    where id = p_lesson_confirmation_id
    returning * into lc;

  insert into public.wallet_transactions (user_id, description, type, amount, direction, status)
    values (lc.tutor_id, 'Lesson completed: ' || lc.subject, 'lesson_earning', lc.amount_gross, 'credit', 'completed');

  return lc;
end;
$$;

create or replace function public.dispute_lesson_completion(p_lesson_confirmation_id uuid, p_reason text)
returns public.lesson_confirmations
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  lc public.lesson_confirmations;
begin
  select * into lc from public.lesson_confirmations where id = p_lesson_confirmation_id for update;
  if lc is null then
    raise exception 'Lesson confirmation not found';
  end if;
  if uid <> lc.student_id and uid <> lc.tutor_id and not private.is_admin() then
    raise exception 'Not authorized to dispute this lesson';
  end if;

  update public.lesson_confirmations
    set confirmation_status = 'Disputed', escrow_status = 'Frozen', dispute_reason = p_reason, disputed_at = now()
    where id = p_lesson_confirmation_id
    returning * into lc;

  return lc;
end;
$$;

-- Admin/finance-staff-only dispute resolution — the only path back from
-- Frozen to Released or Held-reversed-as-refund.
create or replace function public.resolve_lesson_dispute(p_lesson_confirmation_id uuid, p_resolution text, p_note text default null, p_release_to_tutor boolean default true)
returns public.lesson_confirmations
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  lc public.lesson_confirmations;
begin
  if not (private.is_admin() or private.has_permission('payments', 'manage')) then
    raise exception 'Not authorized to resolve disputes';
  end if;

  select * into lc from public.lesson_confirmations where id = p_lesson_confirmation_id for update;
  if lc is null then
    raise exception 'Lesson confirmation not found';
  end if;

  update public.lesson_confirmations
    set escrow_status = case when p_release_to_tutor then 'Released' else 'Held' end,
        confirmation_status = 'Confirmed'
    where id = p_lesson_confirmation_id
    returning * into lc;

  insert into public.dispute_resolutions (lesson_confirmation_id, resolved_by, resolution, note)
    values (p_lesson_confirmation_id, uid, p_resolution, p_note);

  if p_release_to_tutor then
    insert into public.wallet_transactions (user_id, description, type, amount, direction, status)
      values (lc.tutor_id, 'Dispute resolved: ' || lc.subject, 'lesson_earning', lc.amount_gross, 'credit', 'completed');
  end if;

  return lc;
end;
$$;

revoke execute on function public.confirm_lesson_completion(uuid) from public, anon;
revoke execute on function public.dispute_lesson_completion(uuid, text) from public, anon;
revoke execute on function public.resolve_lesson_dispute(uuid, text, text, boolean) from public, anon;
grant execute on function public.confirm_lesson_completion(uuid) to authenticated;
grant execute on function public.dispute_lesson_completion(uuid, text) to authenticated;
grant execute on function public.resolve_lesson_dispute(uuid, text, text, boolean) to authenticated;

-- =======================================================================
-- Payouts
-- =======================================================================
create table public.tutor_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

create index tutor_bank_accounts_tutor_id_idx on public.tutor_bank_accounts (tutor_id);

alter table public.tutor_bank_accounts enable row level security;

create policy tutor_bank_accounts_manage_own on public.tutor_bank_accounts
  for all to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()))
  with check (tutor_id = (select auth.uid()) or (select private.is_admin()));

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id),
  amount numeric(10, 2) not null,
  bank_name text not null,
  account_last4 text not null,
  account_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  available_balance_before numeric(10, 2) not null,
  earnings_breakdown jsonb not null default '[]'::jsonb,
  rejection_reason text,
  admin_note text,
  requested_at timestamptz not null default now()
);

create index payout_requests_tutor_id_idx on public.payout_requests (tutor_id);

create table public.payout_audit_entries (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.payout_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create index payout_audit_entries_payout_request_id_idx on public.payout_audit_entries (payout_request_id);
create index payout_audit_entries_actor_id_idx on public.payout_audit_entries (actor_id);

alter table public.payout_requests enable row level security;
alter table public.payout_audit_entries enable row level security;

create policy payout_requests_select on public.payout_requests
  for select to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('payouts', 'manage')));

revoke insert, update, delete on public.payout_requests from anon, authenticated;

create policy payout_audit_entries_select on public.payout_audit_entries
  for select to authenticated
  using (
    exists (select 1 from public.payout_requests pr where pr.id = payout_request_id and pr.tutor_id = (select auth.uid()))
    or (select private.is_admin()) or (select private.has_permission('payouts', 'manage'))
  );

revoke insert, update, delete on public.payout_audit_entries from anon, authenticated;

-- Balance is always computed, never stored: Released escrow minus
-- already-approved/paid payouts, matching payout-store.ts's existing
-- "compute, don't store" contract.
create or replace function public.get_tutor_balance(p_tutor_id uuid)
returns table (escrow numeric, available numeric, pending numeric)
language sql
stable
set search_path = public
as $$
  select
    coalesce((select sum(amount_gross) from public.lesson_confirmations where tutor_id = p_tutor_id and escrow_status = 'Held'), 0) as escrow,
    coalesce((select sum(amount_gross) from public.lesson_confirmations where tutor_id = p_tutor_id and escrow_status = 'Released'), 0)
      - coalesce((select sum(amount) from public.payout_requests where tutor_id = p_tutor_id and status in ('approved', 'paid')), 0) as available,
    coalesce((select sum(amount) from public.payout_requests where tutor_id = p_tutor_id and status = 'pending'), 0) as pending;
$$;

revoke execute on function public.get_tutor_balance(uuid) from public, anon;
grant execute on function public.get_tutor_balance(uuid) to authenticated;

create or replace function public.request_payout(p_amount numeric, p_bank_name text, p_account_last4 text, p_account_name text)
returns public.payout_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  bal record;
  req public.payout_requests;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Invalid payout amount';
  end if;

  select * into bal from public.get_tutor_balance(uid);
  if p_amount > bal.available then
    raise exception 'Requested amount exceeds your available balance';
  end if;

  insert into public.payout_requests (tutor_id, amount, bank_name, account_last4, account_name, available_balance_before)
    values (uid, p_amount, p_bank_name, p_account_last4, p_account_name, bal.available)
    returning * into req;

  insert into public.payout_audit_entries (payout_request_id, actor_id, action)
    values (req.id, uid, 'requested');

  return req;
end;
$$;

create or replace function public.decide_payout(p_payout_id uuid, p_action text, p_note text default null)
returns public.payout_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  uid uuid := (select auth.uid());
  req public.payout_requests;
begin
  if not (private.is_admin() or private.has_permission('payouts', 'manage')) then
    raise exception 'Not authorized to decide payouts';
  end if;
  if p_action not in ('approve', 'reject', 'mark_paid') then
    raise exception 'Invalid payout action: %', p_action;
  end if;

  select * into req from public.payout_requests where id = p_payout_id for update;
  if req is null then
    raise exception 'Payout request not found';
  end if;

  update public.payout_requests
    set status = case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'paid' end,
        rejection_reason = case when p_action = 'reject' then p_note else rejection_reason end,
        admin_note = coalesce(p_note, admin_note)
    where id = p_payout_id
    returning * into req;

  insert into public.payout_audit_entries (payout_request_id, actor_id, action, note)
    values (p_payout_id, uid, p_action, p_note);

  if p_action = 'approve' then
    insert into public.wallet_transactions (user_id, description, type, amount, direction, status)
      values (req.tutor_id, 'Payout approved', 'payout', req.amount, 'debit', 'completed');
  end if;

  return req;
end;
$$;

revoke execute on function public.request_payout(numeric, text, text, text) from public, anon;
revoke execute on function public.decide_payout(uuid, text, text) from public, anon;
grant execute on function public.request_payout(numeric, text, text, text) to authenticated;
grant execute on function public.decide_payout(uuid, text, text) to authenticated;
