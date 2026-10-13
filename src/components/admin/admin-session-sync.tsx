"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import { ServerAdminSessionContext } from "@/hooks/use-admin-session";
import { getCurrentAdminSession, setCurrentAdminSession, type AdminSession } from "@/lib/admin-session";
import type { ResolvedAdminSession } from "@/lib/supabase/require-role";

// Bridges the real, server-resolved Platform User identity (resolveAdminSession,
// read in the admin layout from user_staff_roles) into the client-side
// AdminSession every admin component reads (admin-access-gate.tsx,
// use-admin-session.ts, the sidebar, the topbar):
//  - as context, so even the server-rendered HTML shows the real admin;
//  - into localStorage, for the older code paths that read it directly.
// Without this a real Platform User would fall back to the demo Super Admin
// persona — showing a restricted staff member the owner-level dashboard.
export function AdminSessionSync({ session, children }: { session: ResolvedAdminSession | null; children: ReactNode }) {
  const next = useMemo<AdminSession | null>(
    () => (session ? { userId: session.userId, name: session.name, email: session.email, image: session.image, role: session.role, customSections: session.customSections } : null),
    [session]
  );

  useEffect(() => {
    if (!next) return;
    const current = getCurrentAdminSession();
    const same =
      current.userId === next.userId &&
      current.role === next.role &&
      current.name === next.name &&
      JSON.stringify(current.customSections) === JSON.stringify(next.customSections);
    if (!same) setCurrentAdminSession(next);
  }, [next]);

  return <ServerAdminSessionContext.Provider value={next}>{children}</ServerAdminSessionContext.Provider>;
}
