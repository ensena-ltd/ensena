import { Suspense } from "react";

import { AdminBookingsClient } from "@/components/admin/admin-bookings-client";
import { BookingsList } from "@/components/admin/real/bookings-list";
import { loadBookings } from "@/lib/admin-people-bookings";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminBookingsPage() {
  if (isSupabaseConfigured()) {
    const bookings = await loadBookings();
    return (
      <Suspense fallback={null}>
        <BookingsList bookings={bookings} nowMs={getPlatformNowMs()} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={null}>
      <AdminBookingsClient />
    </Suspense>
  );
}
