import { Suspense } from "react";

import { AdminCounsellingDashboardClient } from "@/components/admin/admin-counselling-dashboard-client";

export default function AdminCounsellingPage() {
  return (
    <Suspense fallback={null}>
      <AdminCounsellingDashboardClient />
    </Suspense>
  );
}
