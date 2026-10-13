import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminCommunityClient } from "@/components/admin/admin-community-client";
import { isFeatureEnabled } from "@/lib/feature-flags";

// Conditional — see the matching note in /community/ask/page.tsx.
export function generateMetadata(): Metadata {
  return isFeatureEnabled("community") ? { title: "Community | Ensena Admin" } : {};
}

// Not linked from admin-sidebar.tsx and not part of
// admin-permissions-data.ts's allSections while Community is disabled — see
// the matching note in admin-community-client.tsx. 404s outright for
// anyone who navigates here directly while the flag is off.
export default function AdminCommunityPage() {
  if (!isFeatureEnabled("community")) notFound();
  return <AdminCommunityClient />;
}
