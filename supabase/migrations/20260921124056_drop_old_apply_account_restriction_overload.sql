-- create or replace requires an identical argument signature to actually
-- replace a function; adding trailing params created a second overload
-- instead of replacing the original, which would leave PostgREST with an
-- ambiguous target for supabase.rpc('apply_account_restriction', {...}).
-- Only the new 8-arg version (with p_supersedes_id/p_start_at) should exist.
drop function if exists public.apply_account_restriction(uuid, text, text, timestamptz, text, uuid);
