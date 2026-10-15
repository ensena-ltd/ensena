import { notFound } from "next/navigation";

import { BookingFullDetailsClient } from "@/components/admin/booking-full-details-client";
import { BookingDetail } from "@/components/admin/real/booking-detail";
import { loadBooking } from "@/lib/admin-people-bookings";
import { initialBookings } from "@/lib/admin-bookings-data";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminBookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const booking = await loadBooking(id);
    if (!booking) notFound();
    return <BookingDetail booking={booking} nowMs={getPlatformNowMs()} />;
  }
  const booking = initialBookings.find((b) => b.id === id);
  if (!booking) notFound();
  return <BookingFullDetailsClient bookingId={id} />;
}
