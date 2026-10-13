import { notFound } from "next/navigation";

import { AdminPaymentDetailsClient } from "@/components/admin/admin-payment-details-client";
import { initialBookings } from "@/lib/admin-bookings-data";

export function generateStaticParams() {
  return initialBookings.map((b) => ({ id: b.id }));
}

export default async function AdminPaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = initialBookings.find((b) => b.id === id);
  if (!booking) notFound();

  return <AdminPaymentDetailsClient bookingId={id} />;
}
