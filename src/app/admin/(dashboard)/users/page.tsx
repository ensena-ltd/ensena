import { Suspense } from "react";

import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { UsersManagement } from "@/components/admin/real/users-management";
import { loadDirectory } from "@/lib/admin-people-bookings";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminUsersPage() {
  if (isSupabaseConfigured()) {
    const users = await loadDirectory();
    return <UsersManagement users={users} nowMs={getPlatformNowMs()} />;
  }
  return (
    <Suspense fallback={null}>
      <AdminUsersClient />
    </Suspense>
  );
}
