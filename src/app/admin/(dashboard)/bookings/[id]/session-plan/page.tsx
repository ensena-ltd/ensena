import { notFound } from "next/navigation";

import { AdminSessionPlanClient } from "@/components/admin/admin-session-plan-client";
import { initialBookings } from "@/lib/admin-bookings-data";

export function generateStaticParams() {
  return initialBookings.map((b) => ({ id: b.id }));
}

export default async function AdminSessionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = initialBookings.find((b) => b.id === id);
  if (!booking) notFound();

  return <AdminSessionPlanClient booking={booking} />;
}
