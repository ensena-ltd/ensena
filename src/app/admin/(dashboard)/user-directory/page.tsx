import { AdminUserDirectoryClient } from "@/components/admin/admin-user-directory-client";
import { UserDirectory } from "@/components/admin/real/user-directory";
import { loadDirectory } from "@/lib/admin-people-bookings";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminUserDirectoryPage() {
  if (isSupabaseConfigured()) {
    const users = await loadDirectory();
    return <UserDirectory users={users} nowMs={getPlatformNowMs()} />;
  }
  return <AdminUserDirectoryClient />;
}
