-- Degree programme for Undergraduate/Masters/PhD students, chosen on the
-- onboarding "What course are you studying?" step (free text for "Other").
alter table public.student_profiles add column if not exists course text;
comment on column public.student_profiles.course is 'Degree programme for Undergraduate/Masters/PhD students (chosen during onboarding; free text when "Other").';
