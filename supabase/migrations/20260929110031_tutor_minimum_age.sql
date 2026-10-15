-- Tutors must be at least 18. Checked when a tutor profile is created or
-- its date of birth changes (a CHECK constraint can't use current_date).
create or replace function private.enforce_tutor_min_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_of_birth is not null
     and (tg_op = 'INSERT' or new.date_of_birth is distinct from old.date_of_birth)
     and new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Tutors must be at least 18 years old.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists tutor_profiles_min_age on public.tutor_profiles;
create trigger tutor_profiles_min_age
  before insert or update of date_of_birth on public.tutor_profiles
  for each row execute function private.enforce_tutor_min_age();
