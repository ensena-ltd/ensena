import type { ReactNode } from "react";
import { Suspense } from "react";

import { AdminAccessGate } from "@/components/admin/admin-access-gate";
import { AdminSessionSync } from "@/components/admin/admin-session-sync";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole, resolveAdminSession } from "@/lib/supabase/require-role";

// See the matching comment in student-dashboard's layout — no-ops until
// Supabase is configured, then becomes a real server-side gate confirming
// this is genuinely an authenticated "admin" account. <AdminAccessGate>
// below is a SEPARATE, narrower check (which admin SECTIONS this specific
// Platform User role may see — still client-side, since that finer-grained
// staff-permission model hasn't migrated to the backend yet) — this layout
// only answers "is this person an admin at all," and (once configured)
// <AdminSessionSync> feeds that same client-side check real data instead of
// always defaulting to the Super Admin demo persona.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("admin");
  const adminSession = profile && isSupabaseConfigured() ? await resolveAdminSession(profile) : null;

  return (
    <AdminSessionSync session={adminSession}>
    <div className="flex min-h-screen flex-col bg-ensena-bg-soft lg:flex-row">
      <Suspense fallback={<div className="h-16 border-b border-ensena-border bg-ensena-surface lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r" />}>
        <AdminSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <AdminTopbar />
          <div className="mt-5"><AdminAccessGate>{children}</AdminAccessGate></div>
        </div>
      </main>
    </div>
    </AdminSessionSync>
  );
}
