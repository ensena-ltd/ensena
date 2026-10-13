"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import { BrandedLoader } from "@/components/shared/branded-loader";
import { getClassroomSession, type ClassroomRole, type ClassroomSession } from "@/lib/classroom-data";

// Root-cause fix for the "Enter Class 404" bug: session.tsx/page.tsx used to
// be a Server Component that called getClassroomSession() (and notFound())
// during SSR. A real, student-booked lesson only ever exists in the
// browser's localStorage (see private-lessons-store.ts) — a Server
// Component genuinely cannot see it, no matter how it's structured, so
// getClassroomSession() silently fell back to seed-only data and 404'd
// every real booking. Resolution now happens here, client-side, after
// mount — the one place real localStorage is actually visible — via a
// plain resolve-on-mount effect (not useSyncExternalStore: this only needs
// to resolve ONCE per visit, not stay reactive to later changes).
//
// The brief `session === undefined` window renders a lightweight loading
// state on both server and first client paint (so there's no hydration
// mismatch), then the effect re-resolves against real data. Only after
// that real check comes back empty does this call notFound() — safe to do
// from a Client Component effect (Next.js's not-found boundary catches it
// the same way it would from a Server Component).
export function PrivateClassroomPageClient({ role, id }: { role: ClassroomRole; id: string }) {
  const [session, setSession] = useState<ClassroomSession | null | undefined>(undefined);

  useEffect(() => {
    // Reading real localStorage data (via getClassroomSession) is exactly
    // the kind of "synchronize with an external system" case this rule
    // exists to allow — same justification as classroom-shell.tsx's own
    // screen-share effect — never a derivable render value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getClassroomSession(role, "private", id));
  }, [role, id]);

  if (session === undefined) {
    return <BrandedLoader />;
  }

  if (session === null) {
    notFound();
    return null;
  }

  const leaveHref =
    role === "tutor"
      ? session.studentName
        ? `/tutor-dashboard/private-lessons?tab=Lessons&reviewLessonId=${encodeURIComponent(session.id)}&reviewStudent=${encodeURIComponent(session.studentName)}&reviewSubject=${encodeURIComponent(session.subject)}`
        : "/tutor-dashboard/private-lessons?tab=Lessons"
      : `/student-dashboard/lessons/class/${id}`;

  return <ClassroomShell role={role} session={session} leaveHref={leaveHref} />;
}
