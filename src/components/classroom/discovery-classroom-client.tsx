"use client";

import { useMemo } from "react";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import { buildFromDiscovery, type ClassroomRole } from "@/lib/classroom-data";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";

// A Discovery Class booked at runtime lives only in the browser's
// localStorage — the server rendering this route can never see it, so
// resolving the session (and deciding "not found") the way every other
// classroom route's plain Server Component does would 404 a session the
// student just booked seconds ago. Building the session from
// useAllDiscoverySessions() (a real useSyncExternalStore) rather than
// calling getClassroomSession()/getAllDiscoverySessions() directly is what
// actually matters here — those are plain functions that read real
// localStorage the instant they're called, which would make even this
// client component's FIRST (hydration-matching) render disagree with the
// server's prerendered "not found" HTML. useSyncExternalStore renders the
// server's empty snapshot on that first pass, then a normal, safe
// client-only re-render picks up the real session once React reconciles.
export function DiscoveryClassroomClient({ role, id, leaveHref }: { role: ClassroomRole; id: string; leaveHref: string }) {
  const sessions = useAllDiscoverySessions();
  const session = useMemo(() => {
    const raw = sessions.find((d) => d.id === id);
    const built = buildFromDiscovery(role, raw);
    return built ? { ...built, classroomId: `discovery:${id}` } : null;
  }, [role, id, sessions]);

  if (!session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-ensena-ink px-6 text-center">
        <p className="text-sm text-white/70">We couldn&apos;t find that Discovery Session.</p>
      </div>
    );
  }

  return <ClassroomShell role={role} session={session} leaveHref={leaveHref} />;
}
