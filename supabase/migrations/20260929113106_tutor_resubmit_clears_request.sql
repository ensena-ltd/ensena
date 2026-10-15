-- When a tutor resubmits, clear the admin's previous request (the history
-- stays in audit_logs).
create or replace function public.tutor_submit_for_review()
returns public.tutor_profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated public.tutor_profiles;
  previous_note text;
  previous_fields text[];
begin
  select rejection_reason, resubmission_fields into previous_note, previous_fields
    from public.tutor_profiles where id = (select auth.uid());

  update public.tutor_profiles
     set application_status = 'pending',
         rejection_reason = null,
         resubmission_fields = '{}',
         submitted_for_review_at = now(),
         updated_at = now()
   where id = (select auth.uid())
     and application_status in ('resubmission_required', 'rejected')
   returning * into updated;
  if not found then
    raise exception 'There is nothing to resubmit.';
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'tutor_application_resubmitted', 'tutor_profile', (select auth.uid())::text,
          jsonb_build_object('previous_note', previous_note, 'previous_fields', previous_fields));
  return updated;
end;
$function$;
