import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentPerformanceReal } from "@/components/tutor-dashboard/live/student-performance-real";
import { StudentPerformanceClient } from "@/components/tutor-dashboard/students/student-performance-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { students } from "@/lib/tutor-dashboard-data";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";
import { studentTeachingView } from "@/lib/tutor-teaching-view";

const UUID = /^[0-9a-f-]{36}$/i;

export function generateStaticParams() {
  return students.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const student = students.find((s) => s.id === id);
  return { title: student ? `${student.name}: Performance | Ensena Tutor Dashboard` : "Performance | Ensena" };
}

export default async function StudentPerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (UUID.test(id) && isSupabaseConfigured()) {
    const tutor = await requireRole("tutor");
    if (!tutor) notFound();
    const data = await loadTutorTeaching(tutor.id);
    const view = studentTeachingView(data, id);
    if (!view) notFound();
    return <StudentPerformanceReal view={view} generatedAtMs={data.generatedAtMs} />;
  }
  const student = students.find((s) => s.id === id);
  if (!student) notFound();
  return <StudentPerformanceClient student={student} />;
}
