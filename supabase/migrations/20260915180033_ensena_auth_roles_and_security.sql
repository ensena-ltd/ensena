DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student','tutor','guardian','admin')); END IF; END $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
ALTER FUNCTION public.handle_profile_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_student_profile_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_tutor_profile_updated_at() SET search_path = public;
