import type { Metadata } from "next";

import { GroupClassroomClient } from "@/components/classroom/group-classroom-client";
import { LiveClassroomPage } from "@/components/classroom/live-classroom-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  // Real group-class data (a tutor-approved submission, or a student's real
  // enrollment) only exists client-side (see GroupClassroomClient's own doc
  // comment) — a Server Component genuinely cannot resolve it, so metadata
  // stays generic rather than risking a wrong title for the case that
  // matters most (a real, non-seed class).
  return { title: "Classroom | Ensena" };
}

export default async function TutorGroupClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) return <LiveClassroomPage kind="group" id={id} role="tutor" leaveHref={"/tutor-dashboard/group-classes"} />;
  return <GroupClassroomClient role="tutor" id={id} fallbackLeaveHref="/tutor-dashboard/group-classes" />;
}
