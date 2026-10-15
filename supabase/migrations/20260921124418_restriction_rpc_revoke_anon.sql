-- Supabase's default-privileges setup grants EXECUTE to anon explicitly
-- (not just via PUBLIC), so `revoke all ... from public` alone didn't
-- remove it. Revoke the explicit anon grant too, matching
-- resolve_account_restriction/get_effective_account_status.
revoke execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) from anon;
revoke execute on function public.mark_restriction_under_review(uuid, text) from anon;
