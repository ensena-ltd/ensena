import type { Metadata } from "next";

import { CompletedClassesClient } from "@/components/student-dashboard/lessons/completed-classes-client";
import { CompletedClassesReal } from "@/components/student-dashboard/live/class-lists-real";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Completed Classes | Ensena Student Dashboard",
};

export default async function Page() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <CompletedClassesClient />;
  return <CompletedClassesReal data={await loadStudentLearning(profile.id)} />;
}
