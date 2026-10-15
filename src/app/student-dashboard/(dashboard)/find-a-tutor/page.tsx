import type { Metadata } from "next";
import { Suspense } from "react";

import { FindATutorClient } from "@/components/student-dashboard/find-a-tutor/find-a-tutor-client";
import { FindATutorReal } from "@/components/student-dashboard/live/find-a-tutor-real";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getPlatformNowMs } from "@/lib/platform-time";
import { listApprovedTutors } from "@/lib/tutor-directory-server";

export const metadata: Metadata = {
  title: "Find a Tutor | Ensena Student Dashboard",
};

export default async function FindATutorPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) {
    return (
      <Suspense fallback={null}>
        <FindATutorClient />
      </Suspense>
    );
  }
  const admin = getServiceRoleClient();
  const [tutors, { data: saved }, { data: student }] = await Promise.all([
    listApprovedTutors(),
    admin.from("saved_tutors").select("tutor_id").eq("student_id", profile.id),
    admin.from("student_profiles").select("subjects, course").eq("id", profile.id).maybeSingle(),
  ]);
  const studentSubjects = [...((student?.subjects as string[] | null) ?? []), ...(student?.course ? [student.course as string] : [])];
  return (
    <Suspense fallback={null}>
      <FindATutorReal tutors={tutors} savedIds={(saved ?? []).map((s) => s.tutor_id as string)} studentSubjects={studentSubjects} generatedAtMs={getPlatformNowMs()} />
    </Suspense>
  );
}
