-- The name the inviter typed for this person at invite time — Supabase's
-- own auth.users row only gets it once the invitee accepts and sets their
-- own full_name, so the pending-invitations list needs its own copy to
-- display before that happens.
alter table public.staff_invitations add column if not exists name text not null default '';
