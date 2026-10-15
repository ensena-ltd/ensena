-- Bugfix: handle_new_user() was creating a student_profiles row even when
-- no role was explicitly supplied at signup (the OAuth case — Google
-- sign-in never sends a `role` in user metadata, only whatever Google's own
-- profile carries). That meant every brand-new Google sign-up already had
-- a student_profiles row the instant their auth.users row was created, so
-- claim_oauth_signup_role's "has this account already finished signing up?"
-- check (which looks for an existing student_profiles/tutor_profiles row)
-- always said yes — the RPC could never actually run for a real OAuth user.
--
-- Fix: only create the role-specific sub-profile when the role was
-- explicitly requested (email/password signUp always passes one). A plain
-- OAuth sign-in still gets a `profiles` row defaulted to 'student' (so
-- something always exists to redirect on), but no sub-profile — leaving
-- claim_oauth_signup_role free to set the real role once, as designed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_role_explicit boolean;
  v_full_name text;
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

  if v_role_explicit and (v_role = 'student' or v_role = 'guardian') then
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
$$;
