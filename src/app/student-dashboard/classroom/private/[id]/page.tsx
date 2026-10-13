import type { Metadata } from "next";

import { PrivateClassroomPageClient } from "@/components/classroom/private-classroom-page-client";
import { LiveClassroomPage } from "@/components/classroom/live-classroom-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  // Real lesson data only exists client-side (see PrivateClassroomPageClient's
  // own doc comment) — a Server Component genuinely cannot resolve it for a
  // real booking, so metadata stays generic rather than risking a wrong
  // title for the one case that matters most (a real, non-seed lesson).
  return { title: "Classroom | Ensena" };
}

export default async function StudentPrivateClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) return <LiveClassroomPage kind="private" id={id} role="student" leaveHref={"/student-dashboard/lessons?tab=Completed"} />;
  return <PrivateClassroomPageClient role="student" id={id} />;
}
