"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { useAdminSession } from "@/hooks/use-admin-session";
import { canAccessPath } from "@/lib/admin-session";

// The client-side route guard: every admin page renders inside this via the
// (dashboard) layout. There is no backend/server session anywhere in this
// app (see admin-session.ts's own doc comment) so this can't be a real
// security boundary — but it genuinely blocks the rendered UI for a session
// that lacks access, rather than only hiding the sidebar link, which is the
// documented, accepted scope for this build.
export function AdminAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useAdminSession();

  if (canAccessPath(session, pathname)) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600"><ShieldAlert className="size-7" /></span>
      <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Access Denied</h1>
      <p className="mt-1.5 max-w-sm text-sm text-ensena-muted">
        Your role ({session.role}) doesn&apos;t have permission to view this section. Contact your Super Admin if you believe this is a mistake.
      </p>
      <Link href="/admin/dashboard" className="mt-4 rounded-full bg-ensena-primary px-5 py-2 text-sm font-semibold text-white hover:bg-ensena-primary-hover">Back to Dashboard</Link>
    </div>
  );
}
