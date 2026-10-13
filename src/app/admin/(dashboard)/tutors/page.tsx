import { Suspense } from "react";

import { AdminTutorsClient } from "@/components/admin/admin-tutors-client";
import { TutorList } from "@/components/admin/real/tutor-list";
import { loadTutors } from "@/lib/admin-registrations";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminTutorsPage() {
  if (isSupabaseConfigured()) {
    const tutors = await loadTutors();
    return (
      <Suspense fallback={null}>
        <TutorList tutors={tutors} mode="tutors" />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={null}>
      <AdminTutorsClient />
    </Suspense>
  );
}
