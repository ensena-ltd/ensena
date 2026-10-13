-- Student profile details edited on /student-dashboard/profile.
--   bio            — "Bio"
--   support_types  — "What do you usually need help with?" (ids from
--                    src/lib/academic-support-types.ts)
--   learning_goals — "Learning Goals" (the old single `goal` from
--                    onboarding is copied in as the first goal)
alter table public.student_profiles add column if not exists bio text;
alter table public.student_profiles add column if not exists support_types text[] not null default '{}';
alter table public.student_profiles add column if not exists learning_goals text[] not null default '{}';

update public.student_profiles
   set learning_goals = array_remove(regexp_split_to_array(goal, E'\n'), '')
 where goal is not null and trim(goal) <> '' and cardinality(learning_goals) = 0;
