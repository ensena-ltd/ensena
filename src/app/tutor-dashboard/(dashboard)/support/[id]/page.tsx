import type { Metadata } from "next";

import { TutorSupportDetailClient } from "@/components/tutor-dashboard/support/tutor-support-detail-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportRequestForUser } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Support Request | Ensena Tutor Dashboard",
};

export default async function TutorSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <TutorSupportDetailClient id={id} />;
  const request = /^[A-Z0-9]{4,16}$/i.test(id) ? await loadSupportRequestForUser(profile.id, id) : null;
  return <TutorSupportDetailClient id={id} live={request} userName={profile.fullName} />;
}
