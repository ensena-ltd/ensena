import { notFound } from "next/navigation";

import { StudentDetail } from "@/components/admin/real/student-detail";
import { StudentFullDetailsClient } from "@/components/admin/student-full-details-client";
import { loadStudent } from "@/lib/admin-registrations";
import { initialAdminStudents } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminStudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const student = await loadStudent(id);
    if (!student) notFound();
    return <StudentDetail student={student} />;
  }
  const student = initialAdminStudents.find((s) => s.id === id);
  if (!student) notFound();
  return <StudentFullDetailsClient studentId={id} />;
}
