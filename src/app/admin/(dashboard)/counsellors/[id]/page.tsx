import { notFound } from "next/navigation";

import { CounsellingSessionClient } from "@/components/admin/counselling-session-client";
import { initialCounsellingAppointments } from "@/lib/admin-counselling-data";

export function generateStaticParams() {
  return initialCounsellingAppointments.map((a) => ({ id: a.id }));
}

export default async function AdminCounsellingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appointment = initialCounsellingAppointments.find((a) => a.id === id);
  if (!appointment) notFound();

  return <CounsellingSessionClient appointmentId={id} />;
}
