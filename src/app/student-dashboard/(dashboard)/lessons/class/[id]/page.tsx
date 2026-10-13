import type { Metadata } from "next";

import { ClassDetailClient } from "@/components/student-dashboard/lessons/class-detail-client";
import { discoverySessions } from "@/lib/discovery-sessions-data";
import { initialLessonConfirmations } from "@/lib/escrow-release";
import { studentLessons } from "@/lib/student-dashboard-data";

export function generateStaticParams() {
  const ids = [
    ...initialLessonConfirmations.map((l) => l.id),
    ...studentLessons.map((l) => l.id),
    ...discoverySessions.map((d) => d.id),
  ];
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = initialLessonConfirmations.find((c) => c.id === id) ?? studentLessons.find((c) => c.id === id);
  return { title: l ? `${l.subject} | Ensena Student Dashboard` : "Class Details | Ensena" };
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassDetailClient id={id} />;
}
