import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminHelpCenterClient } from "@/components/admin/admin-help-center-client";

export const metadata: Metadata = {
  title: "Help Center | Ensena Admin",
};

export default function AdminHelpCenterPage() {
  return (
    <Suspense fallback={null}>
      <AdminHelpCenterClient />
    </Suspense>
  );
}
