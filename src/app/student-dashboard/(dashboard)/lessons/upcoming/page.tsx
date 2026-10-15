import type { Metadata } from "next";

import { UpcomingClassesClient } from "@/components/student-dashboard/lessons/upcoming-classes-client";
import { UpcomingClassesReal } from "@/components/student-dashboard/live/class-lists-real";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Upcoming Classes | Ensena Student Dashboard",
};

export default async function Page() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <UpcomingClassesClient />;
  return <UpcomingClassesReal data={await loadStudentLearning(profile.id)} />;
}
