import type { Metadata } from "next";
import { Suspense } from "react";

import { FindGroupClassesClient } from "@/components/student-dashboard/group-classes/find-group-classes-client";
import { loadPublishedGroupClasses } from "@/lib/group-classes-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Group Classes | Ensena Student Dashboard",
};

// Real published classes for signed-in students; the demo catalogue when
// Supabase isn't configured.
export default async function StudentGroupClassesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <Suspense fallback={null}>
        <FindGroupClassesClient />
      </Suspense>
    );
  }
  const profile = await requireRole("student");
  const listings = await loadPublishedGroupClasses(profile?.id ?? null);
  return (
    <Suspense fallback={null}>
      <FindGroupClassesClient listings={listings} />
    </Suspense>
  );
}
