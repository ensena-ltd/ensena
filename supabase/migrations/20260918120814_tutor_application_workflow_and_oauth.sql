-- Phase 3 of the backend migration (see 0002/0005 for Phase 1: auth +
-- role, 0003 for Phase 2: classroom). This phase finishes authentication +
-- authorization end-to-end:
--   1. Closes a real privilege-escalation hole: tutor_profiles_update_own
--      (0005/0009) lets a signed-in tutor UPDATE their own row with no
--      column restriction, which -- because application_status lives on
--      that same row -- meant a tutor could self-approve their own
--      application with a plain PostgREST PATCH. Column-level GRANTs fix
--      this without touching the row-level policy: a tutor keeps the
--      ability to edit their own application_data (bio, pricing,
--      availability, etc.), but application_status can now only move
--      through admin_set_tutor_application_status() below.
--   2. Gives the admin tutor-verification screen a real, audited RPC to
--      approve/reject/suspend a tutor through instead of a raw UPDATE.
--   3. Lets a brand-new Google sign-in claim "student" or "tutor" once,
--      right after OAuth (Google never sends us a role).
--   4. Adds a server-persisted transactional email log for the tutor
--      "application received" / "approved" / "rejected" emails.

revoke update on public.tutor_profiles from authenticated;
grant update (phone, date_of_birth, application_data) on public.tutor_profiles to authenticated;

create or replace function public.admin_set_tutor_application_status(
  target_id uuid,
  new_status text,
  note text default null
)
returns public.tutor_profiles
language plpgsql
security definer
set search_path = public, private
as $$
declare
  allowed boolean;
  updated public.tutor_profiles;
begin
  allowed := (select private.is_admin()) or (select private.has_permission('tutor_verification', 'approve'));
  if not allowed then
    raise exception 'Not authorized to review tutor applications';
  end if;

  if new_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'Invalid application status: %', new_status;
  end if;

  update public.tutor_profiles
    set application_status = new_status,
        application_data = case
          when note is not null then jsonb_set(coalesce(application_data, '{}'::jsonb), '{adminNote}', to_jsonb(note))
          else application_data
        end
    where id = target_id
    returning * into updated;

  if not found then
    raise exception 'No tutor application found for %', target_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'tutor_application_' || new_status,
    'tutor_profile',
    target_id::text,
    jsonb_build_object('note', note)
  );

  return updated;
end;
$$;

revoke all on function public.admin_set_tutor_application_status(uuid, text, text) from public;
grant execute on function public.admin_set_tutor_application_status(uuid, text, text) to authenticated;

create or replace function public.claim_oauth_signup_role(new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  prof public.profiles;
  has_sub_profile boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if new_role not in ('student', 'tutor') then
    raise exception 'Invalid role: %', new_role;
  end if;

  select * into prof from public.profiles where id = uid;
  if prof is null then
    raise exception 'Profile not found for %', uid;
  end if;

  if prof.role = new_role then
    return prof;
  end if;

  select exists(select 1 from public.student_profiles where id = uid)
      or exists(select 1 from public.tutor_profiles where id = uid)
    into has_sub_profile;
  if has_sub_profile then
    raise exception 'This account has already completed sign-up';
  end if;
  if prof.created_at < now() - interval '30 minutes' then
    raise exception 'Signup window has expired';
  end if;
  if prof.role <> 'student' then
    raise exception 'This account cannot change role';
  end if;

  update public.profiles set role = new_role, updated_at = now() where id = uid
    returning * into prof;

  return prof;
end;
$$;

revoke all on function public.claim_oauth_signup_role(text) from public;
grant execute on function public.claim_oauth_signup_role(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone, date_of_birth, avatar_url)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data->>'role','') in ('student','tutor','counsellor') then new.raw_user_meta_data->>'role' else 'student' end,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end,
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'), '')
  )
  on conflict (id) do update set
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed', 'skipped_no_provider')),
  provider text,
  error text,
  related_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;

create policy email_log_admin_select on public.email_log
  for select to authenticated
  using ((select private.is_admin()) or (select private.has_permission('communications', 'manage')));

revoke all on public.email_log from anon;
grant select on public.email_log to authenticated;

create index if not exists email_log_related_user_id_idx on public.email_log (related_user_id);
create index if not exists tutor_profiles_application_status_idx on public.tutor_profiles (application_status);
