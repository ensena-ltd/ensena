import type { Metadata } from "next";

import { NeedsAttentionReal } from "@/components/tutor-dashboard/live/students-real";
import { NeedsAttentionClient } from "@/components/tutor-dashboard/students/needs-attention-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

export const metadata: Metadata = {
  title: "Needs Attention | Ensena Tutor Dashboard",
};

export default async function NeedsAttentionPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) return <NeedsAttentionClient />;
  return <NeedsAttentionReal data={await loadTutorTeaching(profile.id)} />;
}
