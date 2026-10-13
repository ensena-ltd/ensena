import type { Metadata } from "next";
import { Suspense } from "react";

import { CalendarClient } from "@/components/tutor-dashboard/calendar/calendar-client";
import { TutorClassesReal } from "@/components/tutor-dashboard/live/tutor-classes-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "Calendar | Ensena Tutor Dashboard",
};

export default async function CalendarPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <CalendarClient />;
  return (
    <Suspense fallback={null}>
      <TutorClassesReal data={await loadTutorTeaching(profile.id)} defaultTab="Schedule" />
    </Suspense>
  );
}
