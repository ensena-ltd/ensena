import type { Metadata } from "next";

import { AdminDiscoverySessionsClient } from "@/components/admin/admin-discovery-sessions-client";

export const metadata: Metadata = {
  title: "Discovery Sessions | Ensena Admin",
};

export default function AdminDiscoverySessionsPage() {
  return <AdminDiscoverySessionsClient />;
}
