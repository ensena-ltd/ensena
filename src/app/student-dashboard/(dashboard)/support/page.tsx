import type { Metadata } from "next";

import { StudentSupportListClient } from "@/components/student-dashboard/support/student-support-list-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportRequestsForUser } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Support | Ensena Student Dashboard",
};

export default async function StudentSupportPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <StudentSupportListClient />;
  return <StudentSupportListClient live={await loadSupportRequestsForUser(profile.id)} />;
}
