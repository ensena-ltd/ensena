import { notFound } from "next/navigation";

import { AdminPrivateClassroomObserveClient } from "@/components/admin/admin-private-classroom-observe-client";
import { initialBookings } from "@/lib/admin-bookings-data";

export function generateStaticParams() {
  return initialBookings.filter((b) => b.type === "Private Lesson").map((b) => ({ id: b.id }));
}

export default async function AdminPrivateClassroomObservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = initialBookings.find((b) => b.id === id && b.type === "Private Lesson");
  if (!booking) notFound();

  return <AdminPrivateClassroomObserveClient booking={booking} />;
}
