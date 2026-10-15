-- create or replace function on a changed signature creates a new function
-- object with Postgres' default privileges (EXECUTE granted to PUBLIC,
-- which includes anon) rather than inheriting the previous grants. Match
-- the project's existing convention for these RPCs (authenticated +
-- service_role only, no anon/PUBLIC) — resolve_account_restriction and
-- get_effective_account_status already follow this.
revoke all on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) from public;
grant execute on function public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid, uuid, timestamptz) to authenticated, service_role;

revoke all on function public.mark_restriction_under_review(uuid, text) from public;
grant execute on function public.mark_restriction_under_review(uuid, text) to authenticated, service_role;
