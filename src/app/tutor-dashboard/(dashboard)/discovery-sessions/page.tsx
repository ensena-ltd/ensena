import type { Metadata } from "next";
import { Suspense } from "react";

import { TutorDiscoverySessionsClient } from "@/components/tutor-dashboard/discovery-sessions/discovery-sessions-client";
import { TutorClassesReal } from "@/components/tutor-dashboard/live/tutor-classes-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "Discovery Sessions | Ensena Tutor Dashboard",
};

export default async function TutorDiscoverySessionsPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <TutorDiscoverySessionsClient />;
  return (
    <Suspense fallback={null}>
      <TutorClassesReal data={await loadTutorTeaching(profile.id)} defaultTab="Discovery Sessions" />
    </Suspense>
  );
}
