import { Suspense } from "react";

import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AccountList } from "@/components/admin/real/account-list";
import { loadAccounts } from "@/lib/admin-registrations";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminUsersPage() {
  if (isSupabaseConfigured()) {
    const accounts = await loadAccounts();
    return <AccountList accounts={accounts} />;
  }
  return (
    <Suspense fallback={null}>
      <AdminUsersClient />
    </Suspense>
  );
}
