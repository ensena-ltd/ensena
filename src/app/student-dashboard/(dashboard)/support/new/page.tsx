import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentSupportNewClient } from "@/components/student-dashboard/support/student-support-new-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Contact Support | Ensena Student Dashboard",
};

export default async function StudentSupportNewPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  return (
    <Suspense fallback={null}>
      <StudentSupportNewClient live={Boolean(profile)} userName={profile?.fullName} />
    </Suspense>
  );
}
