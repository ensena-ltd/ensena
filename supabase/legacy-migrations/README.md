# Legacy migrations (not run)

These are the original numbered migration files from before the project's
migration history was tracked in Supabase. Supabase never runs anything in
this folder; they're kept for reference only.

Every change in them is already in the live database and is represented in
`supabase/migrations/` under the version the database actually recorded:

| File | Recorded as |
| --- | --- |
| `0002_profiles_and_auth.sql` | Created by hand before tracking began; superseded by `20260917094628_harden_ensena_auth_and_rls` and later migrations (its old profile policies were deliberately replaced). |
| `0003_classroom.sql` | `20260919210201_backfill_classroom_foundation` |
| `0004_restriction_rpc_enhancements.sql` | `20260921124037` + `20260921124056` + `20260921124234` + `20260921124418` |
| `0005_student_profiles_course.sql` | `20260924140118_add_course_to_student_profiles` |
| `0006_student_guardians.sql` | `20260924162303_student_guardians` |
| `0018_tutor_settings_profile.sql` | `20261012142656_0018_tutor_settings_profile` |

Don't move these back into `supabase/migrations/`: `0002` and `0003` would
recreate older, less secure policies.
