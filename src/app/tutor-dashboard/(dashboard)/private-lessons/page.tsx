import type { Metadata } from "next";
import { Suspense } from "react";

import { MyLessonsHubClient } from "@/components/tutor-dashboard/lessons-hub/my-lessons-hub-client";
import { TutorClassesReal } from "@/components/tutor-dashboard/live/tutor-classes-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "My Lessons | Ensena Tutor Dashboard",
};

export default async function PrivateLessonsPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  return (
    <Suspense fallback={null}>{profile ? <TutorClassesReal data={await loadTutorTeaching(profile.id)} /> : <MyLessonsHubClient />}</Suspense>
  );
}
