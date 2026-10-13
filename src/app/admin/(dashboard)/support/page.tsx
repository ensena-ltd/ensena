import { Suspense } from "react";

import { AdminSupportClient } from "@/components/admin/admin-support-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadAllSupportRequests } from "@/lib/support-server";

export default async function AdminSupportPage() {
  const profile = isSupabaseConfigured() ? await requireRole("admin") : null;
  const live = profile ? await loadAllSupportRequests() : undefined;
  return (
    <Suspense fallback={null}>
      <AdminSupportClient live={live} />
    </Suspense>
  );
}
