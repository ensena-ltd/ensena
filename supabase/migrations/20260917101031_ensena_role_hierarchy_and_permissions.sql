alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','guardian','tutor','counsellor','admin','super_admin','platform_admin','customer_support','student_support','tutor_support','finance','content_manager','communications_manager','custom'));

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  description text,
  unique(resource, action)
);
create table if not exists public.staff_role_permissions (
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key(role_id, permission_id)
);
create table if not exists public.user_staff_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role_id uuid not null references public.staff_roles(id),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.staff_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.user_staff_roles enable row level security;

create policy staff_roles_admin_manage on public.staff_roles for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy permissions_admin_manage on public.permissions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy staff_role_permissions_admin_manage on public.staff_role_permissions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy user_staff_roles_admin_manage on public.user_staff_roles for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

insert into public.staff_roles(name,description) values
('Super Admin','Full platform access'),('Platform Admin','Broad operational access'),('Customer Support','General support'),('Student Support','Student support'),('Tutor Support','Tutor onboarding and support'),('Finance','Payments and payouts'),('Counsellor','Counselling workspace'),('Content Manager','Academic and knowledge content'),('Communications Manager','Communications'),('Custom','Custom permissions') on conflict(name) do nothing;

insert into public.permissions(resource,action) values
('users','view'),('users','edit'),('users','restrict'),('users','ban'),('tutor_verification','review'),('tutor_verification','approve'),('group_classes','manage'),('bookings','view'),('bookings','manage'),('counselling','view'),('counselling','manage'),('payments','view'),('payments','manage'),('reports','view'),('reports','manage'),('support','view'),('support','manage'),('reviews','manage'),('communications','manage'),('analytics','view'),('platform','manage'),('knowledge_base','manage'),('settings','manage'),('audit_logs','view') on conflict(resource,action) do nothing;

revoke all on public.staff_roles, public.permissions, public.staff_role_permissions, public.user_staff_roles from anon;
grant select on public.staff_roles, public.permissions, public.staff_role_permissions, public.user_staff_roles to authenticated;
