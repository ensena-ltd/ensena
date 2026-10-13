-- Create (or upgrade) an Ensena admin account.
--
-- Run in: Supabase Dashboard -> SQL Editor (runs as postgres).
-- Safe to re-run: if the email already exists, it resets the password,
-- confirms the email and makes the account an admin instead of creating a
-- duplicate.
--
-- The account signs in with email + password on /sign-in and lands on
-- /admin. With no row in public.user_staff_roles it's treated as the owner
-- ("Super Admin") — see resolveAdminSession in src/lib/supabase/require-role.ts.
--
-- SECURITY: this file contains a password. Don't commit it with a real
-- password in it, and change the password after the first sign-in.

do $$
declare
  v_email    text := lower('chideraulu@gmail.com');
  v_password text := 'Qwerty@1';
  v_name     text := 'Chidera Ulu';
  v_id       uuid;
begin
  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    -- Token/change columns must be '' (not NULL) or Supabase Auth fails to
    -- sign the user in.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name, 'email_verified', true),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );
    -- (the handle_new_user trigger creates the public.profiles row here)
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           banned_until       = null,
           updated_at         = now()
     where id = v_id;
  end if;

  -- Email/password identity (needed to sign in with a password; an account
  -- that only ever used Google won't have one).
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  )
  on conflict (provider_id, provider) do nothing;

  -- Make it an admin.
  insert into public.profiles (id, role, full_name, email)
  values (v_id, 'admin', v_name, v_email)
  on conflict (id) do update
    set role = 'admin',
        full_name = coalesce(nullif(public.profiles.full_name, public.profiles.email), excluded.full_name),
        updated_at = now();

  -- Full (Super Admin) access: no restricted staff-role assignment.
  delete from public.user_staff_roles where user_id = v_id;

  raise notice 'Admin account ready: % (id %)', v_email, v_id;
end $$;
