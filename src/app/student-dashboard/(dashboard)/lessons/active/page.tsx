import type { Metadata } from "next";

import { ActiveClassesClient } from "@/components/student-dashboard/lessons/active-classes-client";
import { ActiveClassesReal } from "@/components/student-dashboard/live/class-lists-real";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Active Classes | Ensena Student Dashboard",
};

export default async function Page() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <ActiveClassesClient />;
  return <ActiveClassesReal data={await loadStudentLearning(profile.id)} />;
}
