
revoke execute on function public.admin_set_tutor_application_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_tutor_application_status(uuid, text, text) to authenticated;

revoke execute on function public.claim_oauth_signup_role(text) from public, anon, authenticated;
grant execute on function public.claim_oauth_signup_role(text) to authenticated;
