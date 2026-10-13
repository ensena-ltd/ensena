import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminSupportNewClient } from "@/components/admin/admin-support-new-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportDirectory, loadSupportStaff } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Contact Support | Ensena Admin",
};

export default async function AdminSupportNewPage() {
  const profile = isSupabaseConfigured() ? await requireRole("admin") : null;
  const live = profile ? { directory: await loadSupportDirectory(), staff: await loadSupportStaff() } : undefined;
  return (
    <Suspense fallback={null}>
      <AdminSupportNewClient live={live} />
    </Suspense>
  );
}
