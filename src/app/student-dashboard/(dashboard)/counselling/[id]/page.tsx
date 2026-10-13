import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CounsellingSessionDetailClient } from "@/components/student-dashboard/counselling/counselling-session-detail-client";
import { initialCounsellingAppointments } from "@/lib/admin-counselling-data";
import { dashboardStudent } from "@/lib/student-dashboard-data";

export function generateStaticParams() {
  return initialCounsellingAppointments.filter((a) => a.student === dashboardStudent.name).map((a) => ({ id: a.id }));
}

export const metadata: Metadata = {
  title: "My Counselling | Ensena Student Dashboard",
};

export default async function CounsellingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointment = initialCounsellingAppointments.find((a) => a.id === id && a.student === dashboardStudent.name);
  if (!appointment) notFound();
  return <CounsellingSessionDetailClient appointmentId={id} />;
}
