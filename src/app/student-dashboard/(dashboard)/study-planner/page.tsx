import type { Metadata } from "next";

import { StudyPlannerReal } from "@/components/student-dashboard/live/study-planner-real";
import { StudyPlannerClient } from "@/components/student-dashboard/study-planner/study-planner-client";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Study Planner | Ensena Student Dashboard",
};

export default async function StudyPlannerPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <StudyPlannerClient />;
  return <StudyPlannerReal data={await loadStudentLearning(profile.id)} />;
}
