import type { Metadata } from "next";

import { StudentSupportDetailClient } from "@/components/student-dashboard/support/student-support-detail-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportRequestForUser } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Support Request | Ensena Student Dashboard",
};

export default async function StudentSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) return <StudentSupportDetailClient id={id} />;
  const request = /^[A-Z0-9]{4,16}$/i.test(id) ? await loadSupportRequestForUser(profile.id, id) : null;
  return <StudentSupportDetailClient id={id} live={request} userName={profile.fullName} />;
}
