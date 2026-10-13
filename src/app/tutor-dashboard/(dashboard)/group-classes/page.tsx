import type { Metadata } from "next";
import { Suspense } from "react";

import { GroupClassesClient } from "@/components/tutor-dashboard/group-classes/group-classes-client";
import { TutorClassesReal } from "@/components/tutor-dashboard/live/tutor-classes-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "Group Classes | Ensena Tutor Dashboard",
};

export default async function GroupClassesPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <GroupClassesClient />;
  return (
    <Suspense fallback={null}>
      <TutorClassesReal data={await loadTutorTeaching(profile.id)} defaultTab="Group Classes" />
    </Suspense>
  );
}
