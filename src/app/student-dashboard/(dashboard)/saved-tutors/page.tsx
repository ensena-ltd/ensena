import type { Metadata } from "next";

import { SavedTutorsClient } from "@/components/student-dashboard/saved-tutors/saved-tutors-client";
import { SavedTutorsReal } from "@/components/student-dashboard/saved-tutors/saved-tutors-real";
import { loadSavedTutors } from "@/lib/student-profile-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Saved Tutors | Ensena Student Dashboard",
};

export default async function SavedTutorsPage() {
  if (!isSupabaseConfigured()) return <SavedTutorsClient />;
  const profile = await requireRole("student");
  const tutors = profile ? await loadSavedTutors(profile.id) : [];
  return <SavedTutorsReal tutors={tutors} />;
}
