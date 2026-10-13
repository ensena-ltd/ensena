import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import { getClassroomSession } from "@/lib/classroom-data";
import { LiveClassroomPage } from "@/components/classroom/live-classroom-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) return { title: "Classroom | Ensena" };
  const session = getClassroomSession("student", "counselling", id);
  return { title: session ? `Counselling with ${session.tutorName} | Ensena` : "Counselling Session | Ensena" };
}

export default async function StudentCounsellingClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) return <LiveClassroomPage kind="counselling" id={id} role="student" leaveHref={"/student-dashboard/lessons"} />;
  const session = getClassroomSession("student", "counselling", id);
  if (!session) notFound();
  return <ClassroomShell role="student" session={session} leaveHref={`/student-dashboard/counselling/${id}`} />;
}
