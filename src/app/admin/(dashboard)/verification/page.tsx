import { Suspense } from "react";

import { AdminTutorVerificationClient } from "@/components/admin/admin-tutor-verification-client";
import { TutorList } from "@/components/admin/real/tutor-list";
import { loadTutors } from "@/lib/admin-registrations";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Real tutor applications from Supabase (Needs Verification / Verified /
// Resubmission Required / Rejected); the demo queue when Supabase isn't set up.
export default async function AdminVerificationPage() {
  if (isSupabaseConfigured()) {
    const tutors = await loadTutors();
    return (
      <Suspense fallback={null}>
        <TutorList tutors={tutors} mode="verification" />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={null}>
      <AdminTutorVerificationClient />
    </Suspense>
  );
}
