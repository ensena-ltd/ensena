import type { Metadata } from "next";

import { StudentGroupClassDetailClient } from "@/components/student-dashboard/group-classes/student-group-class-detail-client";
import { studentGroupClasses } from "@/lib/student-dashboard-data";

export function generateStaticParams() {
  return studentGroupClasses.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cls = studentGroupClasses.find((c) => c.id === id);
  return { title: cls ? `${cls.title} | Ensena Student Dashboard` : "Group Class | Ensena" };
}

// Not gated with notFound() — a class enrolled in through the real booking
// flow (group-class-enrollment-store.ts) only exists in the visiting
// browser's localStorage, invisible to this server render. The client
// component re-resolves via the real enrollments + student-booking-adapters
// and renders its own not-found state if the class genuinely doesn't exist.
export default async function StudentGroupClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cls = studentGroupClasses.find((c) => c.id === id) ?? null;
  return <StudentGroupClassDetailClient id={id} initialGroupClass={cls} />;
}
