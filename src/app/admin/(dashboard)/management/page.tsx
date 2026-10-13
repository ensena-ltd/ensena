import { Suspense } from "react";

import { AdminManagementClient } from "@/components/admin/admin-management-client";

export default function AdminManagementPage() {
  return (
    <Suspense fallback={null}>
      <AdminManagementClient />
    </Suspense>
  );
}
