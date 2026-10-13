import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorProfileReal } from "@/components/student-dashboard/live/tutor-profile-real";
import { StudentTutorDetailClient } from "@/components/student-dashboard/tutors/student-tutor-detail-client";
import { myTutors } from "@/lib/student-dashboard-data";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getPlatformNowMs } from "@/lib/platform-time";
import { loadTutorProfile } from "@/lib/tutor-directory-server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = isSupabaseConfigured() ? (await loadTutorProfile(id))?.name : myTutors.find((t) => t.id === id)?.name;
  return { title: name ? `${name} | Ensena Student Dashboard` : "Tutor | Ensena" };
}

export default async function StudentTutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) {
    const tutor = myTutors.find((t) => t.id === id);
    if (!tutor) notFound();
    return <StudentTutorDetailClient tutor={tutor} />;
  }
  const tutor = await loadTutorProfile(id);
  if (!tutor) notFound();
  const admin = getServiceRoleClient();
  const [{ count }, { count: lessons }, { count: discovery }] = await Promise.all([
    admin.from("saved_tutors").select("tutor_id", { count: "exact", head: true }).eq("student_id", profile.id).eq("tutor_id", id),
    admin.from("private_lessons").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("tutor_id", id),
    admin.from("discovery_sessions").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("tutor_id", id),
  ]);
  const canMessage = tutor.acceptsNewMessages || (lessons ?? 0) + (discovery ?? 0) > 0;
  return <TutorProfileReal tutor={tutor} initiallySaved={(count ?? 0) > 0} canMessage={canMessage} nowMs={getPlatformNowMs()} />;
}
