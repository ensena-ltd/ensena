-- "Resubmission Required" becomes a real application status, with the
-- admin's reason and the items the tutor must fix.
alter table public.tutor_profiles drop constraint if exists tutor_profiles_application_status_check;
alter table public.tutor_profiles
  add constraint tutor_profiles_application_status_check
  check (application_status in ('pending', 'approved', 'rejected', 'resubmission_required'));

alter table public.tutor_profiles add column if not exists resubmission_fields text[] not null default '{}';
alter table public.tutor_profiles add column if not exists submitted_for_review_at timestamptz;

-- Admin/verification staff review. Records who reviewed and when, keeps the
-- reason in rejection_reason (shown back to the tutor) and logs to audit_logs.
create or replace function public.admin_set_tutor_application_status(
  target_id uuid,
  new_status text,
  note text default null,
  fields text[] default '{}'
)
returns public.tutor_profiles
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  updated public.tutor_profiles;
begin
  if not ((select private.is_admin()) or (select private.has_permission('tutor_verification', 'approve'))) then
    raise exception 'Not authorized to review tutor applications';
  end if;
  if new_status not in ('pending', 'approved', 'rejected', 'resubmission_required') then
    raise exception 'Invalid application status: %', new_status;
  end if;
  if new_status in ('rejected', 'resubmission_required') and coalesce(trim(note), '') = '' then
    raise exception 'Please give the tutor a reason.';
  end if;

  update public.tutor_profiles
     set application_status  = new_status,
         rejection_reason    = case when new_status in ('rejected', 'resubmission_required') then trim(note) else null end,
         resubmission_fields = case when new_status = 'resubmission_required' then coalesce(fields, '{}') else '{}' end,
         reviewed_by         = (select auth.uid()),
         reviewed_at         = now(),
         updated_at          = now()
   where id = target_id
   returning * into updated;

  if not found then
    raise exception 'No tutor application found for %', target_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'tutor_application_' || new_status, 'tutor_profile', target_id::text,
          jsonb_build_object('note', note, 'fields', fields));

  return updated;
end;
$function$;

drop function if exists public.admin_set_tutor_application_status(uuid, text, text);
revoke all on function public.admin_set_tutor_application_status(uuid, text, text, text[]) from public, anon;
grant execute on function public.admin_set_tutor_application_status(uuid, text, text, text[]) to authenticated;

-- Tutor sends a "Resubmission Required" / "Rejected" application back for
-- review after fixing it.
create or replace function public.tutor_submit_for_review()
returns public.tutor_profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated public.tutor_profiles;
begin
  update public.tutor_profiles
     set application_status = 'pending',
         submitted_for_review_at = now(),
         updated_at = now()
   where id = (select auth.uid())
     and application_status in ('resubmission_required', 'rejected')
   returning * into updated;
  if not found then
    raise exception 'There is nothing to resubmit.';
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'tutor_application_resubmitted', 'tutor_profile', (select auth.uid())::text, '{}'::jsonb);
  return updated;
end;
$function$;

revoke all on function public.tutor_submit_for_review() from public, anon;
grant execute on function public.tutor_submit_for_review() to authenticated;
