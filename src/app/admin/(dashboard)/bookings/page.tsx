import { Suspense } from "react";

import { AdminBookingsClient } from "@/components/admin/admin-bookings-client";

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminBookingsClient />
    </Suspense>
  );
}
