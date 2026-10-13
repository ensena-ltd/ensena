import type { ReactNode } from "react";

import { CounsellorDashboardSidebar } from "@/components/counsellor-dashboard/dashboard-sidebar";
import { requireRole } from "@/lib/supabase/require-role";

// Same real, server-side gate as the other three dashboards (student/
// tutor/admin) — a no-op until Supabase is configured (see requireRole's own
// doc comment), so this doesn't disturb the existing demo sign-in, but
// closes the one dashboard route tree that previously had no role check at
// all once real auth goes live.
export default async function CounsellorDashboardLayout({ children }: { children: ReactNode }) {
  await requireRole("counsellor");

  return (
    <div className="flex min-h-screen flex-col bg-ensena-bg-soft lg:flex-row">
      <CounsellorDashboardSidebar />
      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>
    </div>
  );
}
