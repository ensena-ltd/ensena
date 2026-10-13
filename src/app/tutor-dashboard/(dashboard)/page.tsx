import type { Metadata } from "next";

import { TutorDashboardClient } from "@/components/tutor-dashboard/dashboard-client";
import { TutorDashboardReal } from "@/components/tutor-dashboard/live/tutor-dashboard-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorDashboard } from "@/lib/tutor-dashboard-server";

export const metadata: Metadata = {
  title: "Tutor Dashboard | Ensena",
  description: "Manage your lessons, students, earnings and schedule on Ensena.",
};

export default async function TutorDashboardPage() {
  if (!isSupabaseConfigured()) return <TutorDashboardClient />;
  const profile = await requireRole("tutor");
  if (!profile) return <TutorDashboardClient />;
  return <TutorDashboardReal data={await loadTutorDashboard(profile.id)} />;
}
