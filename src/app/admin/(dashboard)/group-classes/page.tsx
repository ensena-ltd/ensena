import { Suspense } from "react";

import { AdminGroupClassesClient } from "@/components/admin/admin-group-classes-client";

export default function AdminGroupClassesPage() {
  return (
    <Suspense fallback={null}>
      <AdminGroupClassesClient />
    </Suspense>
  );
}
