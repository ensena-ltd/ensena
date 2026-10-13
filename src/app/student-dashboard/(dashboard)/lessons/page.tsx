import type { Metadata } from "next";
import { Suspense } from "react";

import { MyClassesReal } from "@/components/student-dashboard/live/my-classes-real";
import { MyClassesClient } from "@/components/student-dashboard/lessons/my-lessons-client";
import { loadStudentLearning } from "@/lib/student-learning-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "My Classes | Ensena Student Dashboard",
};

export default async function MyLessonsPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  return <Suspense fallback={null}>{profile ? <MyClassesReal data={await loadStudentLearning(profile.id)} /> : <MyClassesClient />}</Suspense>;
}
