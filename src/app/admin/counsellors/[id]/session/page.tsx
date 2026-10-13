import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import { getClassroomSession } from "@/lib/classroom-data";
import { initialCounsellingAppointments } from "@/lib/admin-counselling-data";

export function generateStaticParams() {
  return initialCounsellingAppointments.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = getClassroomSession("tutor", "counselling", id);
  return { title: session ? `Counselling with ${session.studentName} | Ensena` : "Counselling Session | Ensena" };
}

export default async function AdminCounsellingClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getClassroomSession("tutor", "counselling", id);
  if (!session) notFound();
  return <ClassroomShell role="tutor" session={session} leaveHref={`/admin/counsellors/${id}?entered=1`} />;
}
