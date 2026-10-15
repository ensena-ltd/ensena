-- Profile photos: 5MB max, images only.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';

-- handle_new_user: email/password tutor sign-ups carry their whole wizard
-- (application_data) in user metadata — store it on tutor_profiles right
-- away so nothing depends on the tutor confirming their email first.
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
    insert into public.tutor_profiles (id, date_of_birth, phone, application_data)
    values (
      new.id,
      case when (new.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then (new.raw_user_meta_data->>'date_of_birth')::date else null end,
      nullif(new.raw_user_meta_data->>'phone',''),
      case when jsonb_typeof(new.raw_user_meta_data->'application_data') = 'object' then new.raw_user_meta_data->'application_data' else '{}'::jsonb end
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$function$;
