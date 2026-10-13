import type { Metadata } from "next";

import { StudentProfileClient } from "@/components/student-dashboard/profile/student-profile-client";
import { StudentProfileReal } from "@/components/student-dashboard/profile/student-profile-real";
import { loadReviewsAboutStudent } from "@/lib/student-profile-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Profile | Ensena Student Dashboard",
};

// Real profile (Supabase) for signed-in students; the demo profile when
// Supabase isn't configured.
export default async function StudentProfilePage() {
  if (!isSupabaseConfigured()) return <StudentProfileClient />;
  const profile = await requireRole("student");
  const reviews = profile ? await loadReviewsAboutStudent(profile.id) : [];
  return <StudentProfileReal reviews={reviews} />;
}
