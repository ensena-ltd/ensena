-- Links staff_invitations to the real auth.users row created for it (via
-- auth.admin.inviteUserByEmail), so resend/revoke can find and act on that
-- user. Also carries a Custom-role invite's per-user permission overrides
-- through to the accepted assignment, mirroring staff_invitations'
-- own custom_permissions column.
alter table public.staff_invitations
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.user_staff_roles
  add column if not exists custom_permissions jsonb not null default '{}'::jsonb;
