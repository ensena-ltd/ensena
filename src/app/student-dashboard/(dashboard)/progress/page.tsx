import type { Metadata } from "next";

import { ProgressReal } from "@/components/student-dashboard/live/progress-real";
import { StudentProgressClient } from "@/components/student-dashboard/progress/student-progress-client";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Progress | Ensena Student Dashboard",
};

export default async function StudentProgressPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <StudentProgressClient />;
  return <ProgressReal data={await loadStudentLearning(profile.id)} />;
}
