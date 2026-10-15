import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorProfileReal } from "@/components/student-dashboard/live/tutor-profile-real";
import { StudentTutorDetailClient } from "@/components/student-dashboard/tutors/student-tutor-detail-client";
import { myTutors } from "@/lib/student-dashboard-data";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getPlatformNowMs } from "@/lib/platform-time";
import { listApprovedTutors, loadTutorProfile } from "@/lib/tutor-directory-server";

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
  const [{ data: saved }, { count: lessons }, { count: discovery }, directory] = await Promise.all([
    admin.from("saved_tutors").select("tutor_id").eq("student_id", profile.id),
    admin.from("private_lessons").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("tutor_id", id),
    admin.from("discovery_sessions").select("id", { count: "exact", head: true }).eq("student_id", profile.id).eq("tutor_id", id),
    listApprovedTutors(),
  ]);
  const canMessage = tutor.acceptsNewMessages || (lessons ?? 0) + (discovery ?? 0) > 0;
  const savedIds = (saved ?? []).map((s) => s.tutor_id as string);
  // Other tutors who teach at least one of the same subjects, best match first.
  const similarTutors = directory
    .filter((t) => t.id !== id)
    .map((t) => ({ t, shared: t.subjects.filter((s) => tutor.subjects.includes(s)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.t.rating ?? 0) - (a.t.rating ?? 0))
    .slice(0, 8)
    .map((x) => x.t);
  return <TutorProfileReal tutor={tutor} initiallySaved={savedIds.includes(id)} canMessage={canMessage} nowMs={getPlatformNowMs()} similarTutors={similarTutors} savedIds={savedIds} />;
}
