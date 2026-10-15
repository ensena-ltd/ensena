-- Parent/guardian attached to a student who signed up with "My child".
-- One guardian per student. The guardian is emailed a Supabase invite
-- (consent request); guardian_user_id is filled when that invite creates
-- their account, and consent_status flips to 'confirmed' when they accept.
create table if not exists public.student_guardians (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  relationship text not null,
  email text not null,
  phone text not null,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'confirmed')),
  guardian_user_id uuid references public.profiles(id) on delete set null,
  consent_requested_at timestamptz,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_guardians_guardian_user_id_idx on public.student_guardians (guardian_user_id);
create index if not exists student_guardians_email_idx on public.student_guardians (lower(email));

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists student_guardians_updated_at on public.student_guardians;
create trigger student_guardians_updated_at
  before update on public.student_guardians
  for each row execute function private.touch_updated_at();

alter table public.student_guardians enable row level security;

create policy student_guardians_select on public.student_guardians
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or guardian_user_id = (select auth.uid())
    or (select private.is_admin())
    or (select private.has_permission('students'::text, 'view'::text))
  );

create policy student_guardians_insert_own on public.student_guardians
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
  );

create policy student_guardians_update_own on public.student_guardians
  for update to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (student_id = (select auth.uid()) and consent_status = (select sg.consent_status from public.student_guardians sg where sg.student_id = (select auth.uid())))
    or (select private.is_admin())
  );

create or replace function public.confirm_guardian_consent()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_email text;
  n integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select email into v_email from auth.users where id = uid;
  update public.student_guardians
     set consent_status = 'confirmed', consented_at = now(), guardian_user_id = uid
   where lower(email) = lower(v_email) and consent_status = 'pending';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.confirm_guardian_consent() from public, anon;
grant execute on function public.confirm_guardian_consent() to authenticated;

-- handle_new_user: guardians no longer get a student_profiles row (the
-- student now has their own account); an invited guardian is linked to the
-- student who requested consent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
  v_role_explicit boolean;
  v_full_name text;
  v_student_id uuid;
begin
  v_role_explicit := coalesce(new.raw_user_meta_data->>'role','') in ('student','tutor','counsellor','guardian');
  v_role := case when v_role_explicit then new.raw_user_meta_data->>'role' else 'student' end;

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'name',''),
    nullif(trim(concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')), ''),
    new.email
  );

  insert into public.profiles (id, role, full_name, email, phone, date_of_birth, avatar_url)
  values (
    new.id,
    v_role,
    v_full_name,
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end,
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'), '')
  )
  on conflict (id) do update set
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  if v_role_explicit and v_role = 'student' then
    insert into public.student_profiles (id, date_of_birth, phone, learning_for, academic_level, academic_detail, subjects, goal)
    values (
      new.id,
      case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end,
      nullif(new.raw_user_meta_data->>'phone',''),
      nullif(new.raw_user_meta_data->>'learning_for',''),
      nullif(new.raw_user_meta_data->>'academic_level',''),
      nullif(new.raw_user_meta_data->>'academic_detail',''),
      '{}'::text[],
      null
    )
    on conflict (id) do nothing;
  elsif v_role_explicit and v_role = 'guardian' then
    if (new.raw_user_meta_data->>'guardian_for_student_id') ~ '^[0-9a-fA-F-]{36}$' then
      v_student_id := (new.raw_user_meta_data->>'guardian_for_student_id')::uuid;
      update public.student_guardians
         set guardian_user_id = new.id
       where student_id = v_student_id and lower(email) = lower(new.email);
    end if;
  elsif v_role_explicit and v_role = 'tutor' then
    insert into public.tutor_profiles (id, date_of_birth, phone)
    values (
      new.id,
      case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end,
      nullif(new.raw_user_meta_data->>'phone','')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$function$;
