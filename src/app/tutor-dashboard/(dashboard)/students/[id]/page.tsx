import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentTeachingPanel } from "@/components/tutor-dashboard/live/student-teaching-real";
import { StudentProfileClient } from "@/components/tutor-dashboard/students/student-profile-client";
import { StudentPrivateNotice, StudentPublicProfileView } from "@/components/tutor-dashboard/students/student-public-profile";
import { loadStudentProfileForTutor } from "@/lib/student-public-profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { students } from "@/lib/tutor-dashboard-data";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";
import { studentTeachingView } from "@/lib/tutor-teaching-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateStaticParams() {
  return students.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const student = students.find((s) => s.id === id);
  return { title: student ? `${student.name} | Ensena Tutor Dashboard` : "Student | Ensena Tutor Dashboard" };
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Real students (Supabase ids): shown only if their profile is public or
  // they've booked with this tutor — see src/lib/student-public-profile.ts.
  if (UUID.test(id) && isSupabaseConfigured()) {
    const tutor = await requireRole("tutor");
    if (!tutor) notFound();
    const [result, teaching] = await Promise.all([loadStudentProfileForTutor(tutor.id, id), loadTutorTeaching(tutor.id)]);
    if (result.status === "not-found") notFound();
    if (result.status === "private") return <StudentPrivateNotice firstName={result.firstName} />;
    const view = studentTeachingView(teaching, id);
    return (
      <>
        <StudentPublicProfileView profile={result.profile} />
        {view && <StudentTeachingPanel view={view} generatedAtMs={teaching.generatedAtMs} />}
      </>
    );
  }

  const student = students.find((s) => s.id === id);
  if (!student) notFound();
  return <StudentProfileClient student={student} />;
}
