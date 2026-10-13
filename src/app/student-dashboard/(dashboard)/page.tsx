import type { Metadata } from "next";

import { StudentDashboardClient } from "@/components/student-dashboard/student-dashboard-client";
import { StudentDashboardReal } from "@/components/student-dashboard/live/student-dashboard-real";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Student Dashboard | Ensena",
  description: "Manage your lessons, tutors, homework and progress on Ensena.",
};

export default async function StudentDashboardPage() {
  if (!isSupabaseConfigured()) return <StudentDashboardClient />;
  const profile = await requireRole("student");
  if (!profile) return <StudentDashboardClient />;
  return <StudentDashboardReal data={await loadStudentLearning(profile.id)} />;
}
