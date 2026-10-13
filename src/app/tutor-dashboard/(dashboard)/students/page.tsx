import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentsReal } from "@/components/tutor-dashboard/live/students-real";
import { StudentsClient } from "@/components/tutor-dashboard/students/students-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "Students | Ensena Tutor Dashboard",
};

export default async function StudentsPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  return <Suspense fallback={null}>{profile ? <StudentsReal data={await loadTutorTeaching(profile.id)} /> : <StudentsClient />}</Suspense>;
}
