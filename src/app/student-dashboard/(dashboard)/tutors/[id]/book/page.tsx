import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BookTutorReal } from "@/components/student-dashboard/live/book-tutor-real";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorProfile } from "@/lib/tutor-directory-server";
import { getPlatformNowMs } from "@/lib/platform-time";

export const metadata: Metadata = {
  title: "Book a Lesson | Ensena Student Dashboard",
};

export default async function BookTutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect("/student-dashboard/find-a-tutor");
  const profile = await requireRole("student");
  if (!profile) redirect("/sign-in");
  const tutor = await loadTutorProfile(id);
  if (!tutor) notFound();
  if (!tutor.pricePerHour || tutor.onVacation) redirect(`/student-dashboard/tutors/${id}`);
  const { data: student } = await getServiceRoleClient().from("student_profiles").select("subjects").eq("id", profile.id).maybeSingle();
  return <BookTutorReal tutor={tutor} generatedAtMs={getPlatformNowMs()} studentSubjects={(student?.subjects as string[] | null) ?? []} />;
}
