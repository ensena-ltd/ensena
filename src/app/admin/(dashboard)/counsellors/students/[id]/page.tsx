import { notFound } from "next/navigation";

import { CounsellingStudentProfileClient } from "@/components/admin/counselling-student-profile-client";
import { initialCounsellingAppointments, studentSlug } from "@/lib/admin-counselling-data";

export function generateStaticParams() {
  const slugs = new Set(initialCounsellingAppointments.map((a) => studentSlug(a.student)));
  return Array.from(slugs).map((id) => ({ id }));
}

export default async function AdminCounsellingStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exists = initialCounsellingAppointments.some((a) => studentSlug(a.student) === id);
  if (!exists) notFound();

  return <CounsellingStudentProfileClient slug={id} />;
}
