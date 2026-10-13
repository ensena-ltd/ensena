import type { Metadata } from "next";

import { TutorSupportListClient } from "@/components/tutor-dashboard/support/tutor-support-list-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportRequestsForUser } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Support | Ensena Tutor Dashboard",
};

export default async function TutorSupportPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <TutorSupportListClient />;
  return <TutorSupportListClient live={await loadSupportRequestsForUser(profile.id)} />;
}
