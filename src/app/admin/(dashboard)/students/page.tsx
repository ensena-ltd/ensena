import { Suspense } from "react";

import { AdminStudentsClient } from "@/components/admin/admin-students-client";
import { StudentList } from "@/components/admin/real/student-list";
import { loadStudents } from "@/lib/admin-registrations";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminStudentsPage() {
  if (isSupabaseConfigured()) {
    const students = await loadStudents();
    return <StudentList students={students} />;
  }
  return (
    <Suspense fallback={null}>
      <AdminStudentsClient />
    </Suspense>
  );
}
