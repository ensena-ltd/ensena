import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudentGroupClassDetailClient } from "@/components/student-dashboard/group-classes/student-group-class-detail-client";
import { getPlatformNowMs } from "@/lib/platform-time";
import { studentGroupClasses } from "@/lib/student-dashboard-data";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cls = studentGroupClasses.find((c) => c.id === id);
  return { title: cls ? `${cls.title} | Ensena Student Dashboard` : "Group Class | Ensena" };
}

// Real classes: an enrolled student is taken to the class in My Classes
// (next session, or the last one once the course has ended); anyone else to
// the class page to enroll. Demo mode keeps the sample class page.
export default async function StudentGroupClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured() && UUID.test(id)) {
    const profile = await requireRole("student");
    if (!profile) redirect("/sign-in");
    const admin = getServiceRoleClient();
    const { data: cls } = await admin.from("group_classes").select("id, slug").eq("id", id).maybeSingle();
    if (!cls) redirect("/student-dashboard/group-classes");
    const { data: cohorts } = await admin.from("group_class_cohorts").select("id").eq("group_class_id", id);
    const cohortIds = ((cohorts ?? []) as { id: string }[]).map((c) => c.id);
    const { data: enrollment } = cohortIds.length
      ? await admin.from("group_class_enrollments").select("cohort_id").eq("student_id", profile.id).in("cohort_id", cohortIds).neq("status", "Waitlisted").order("enrolled_at", { ascending: false }).limit(1).maybeSingle()
      : { data: null };
    if (!enrollment) redirect(`/group-classes/${cls.slug}`);
    const { data: sessions } = await admin.from("group_class_sessions").select("id, scheduled_at").eq("cohort_id", enrollment.cohort_id).neq("status", "Cancelled").order("scheduled_at");
    const list = (sessions ?? []) as { id: string; scheduled_at: string }[];
    const nowMs = getPlatformNowMs();
    const next = list.find((s) => new Date(s.scheduled_at).getTime() > nowMs) ?? list[list.length - 1];
    redirect(next ? `/student-dashboard/lessons?view=${next.id}` : "/student-dashboard/lessons");
  }
  const cls = studentGroupClasses.find((c) => c.id === id) ?? null;
  return <StudentGroupClassDetailClient id={id} initialGroupClass={cls} />;
}
