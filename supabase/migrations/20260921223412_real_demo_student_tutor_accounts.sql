do $$
declare
  v_student_id uuid := gen_random_uuid();
  v_tutor_id uuid := gen_random_uuid();
  v_password text := 'password123';
begin
  if not exists (select 1 from auth.users where email = 'student@ensena.co') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated',
      'student@ensena.co', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student","full_name":"Cynthia Ejie"}'::jsonb,
      now(), now(), '', '', '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(), v_student_id::text, v_student_id,
      jsonb_build_object('sub', v_student_id::text, 'email', 'student@ensena.co'),
      'email', now(), now(), now()
    );
  end if;

  if not exists (select 1 from auth.users where email = 'tutor@ensena.co') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_tutor_id, 'authenticated', 'authenticated',
      'tutor@ensena.co', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"tutor","full_name":"Adaeze Okonkwo"}'::jsonb,
      now(), now(), '', '', '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(), v_tutor_id::text, v_tutor_id,
      jsonb_build_object('sub', v_tutor_id::text, 'email', 'tutor@ensena.co'),
      'email', now(), now(), now()
    );
  end if;
end $$;
