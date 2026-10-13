import type { Metadata } from "next";
import { Suspense } from "react";

import { TutorSupportNewClient } from "@/components/tutor-dashboard/support/tutor-support-new-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Contact Support | Ensena Tutor Dashboard",
};

export default async function TutorSupportNewPage() {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  return (
    <Suspense fallback={null}>
      <TutorSupportNewClient live={Boolean(profile)} userName={profile?.fullName} />
    </Suspense>
  );
}
