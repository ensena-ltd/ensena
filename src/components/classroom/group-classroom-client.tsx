"use client";

import { useMemo } from "react";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import { buildFromMyGroupClass, buildFromMyGroupClassAsStudent, buildFromStudentGroupClass, type ClassroomRole } from "@/lib/classroom-data";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useGroupClassSubmissions } from "@/hooks/use-group-class-submissions";
import { useTodayISO } from "@/hooks/use-today-iso";
import { submissionToMyGroupClass } from "@/lib/group-class-submission-store";
import { enrollmentToStudentGroupClass } from "@/lib/student-booking-adapters";
import { studentGroupClasses } from "@/lib/student-dashboard-data";
import { dashboardTutor, initialMyGroupClasses, slugifyTitle } from "@/lib/tutor-dashboard-data";

// A real Group Class — a tutor's own class approved via
// group-class-submission-store.ts, or a student's real enrollment via
// group-class-enrollment-store.ts — lives only in the browser's
// localStorage. resolveClassroomSession() in classroom-data.ts only ever
// checked the static initialMyGroupClasses/studentGroupClasses seed arrays,
// so a genuinely real (non-seed) Group Class 404'd exactly like the Private
// lesson bug this mirrors. Fixed the same way: resolve reactively, client-
// side, via the SAME real stores the tutor's Group Classes list
// (group-classes-client.tsx) and student's enrollment pages already use —
// so the classroom agrees with whatever the list page already shows as
// real — rather than a second, independently-reimplemented lookup.
export function GroupClassroomClient({ role, id, fallbackLeaveHref }: { role: ClassroomRole; id: string; fallbackLeaveHref: string }) {
  const enrollments = useGroupClassEnrollments();
  const submissions = useGroupClassSubmissions();
  const todayISO = useTodayISO();

  const session = useMemo(() => {
    if (role === "tutor") {
      const seedMatch = initialMyGroupClasses.find((c) => c.id === id);
      if (seedMatch) return buildFromMyGroupClass(seedMatch);
      const mySubmission = submissions.find((s) => s.id === id && s.tutorName === dashboardTutor.name);
      return mySubmission ? buildFromMyGroupClass(submissionToMyGroupClass(mySubmission)) : null;
    }
    const seedMatch = studentGroupClasses.find((c) => c.id === id);
    if (seedMatch) return buildFromStudentGroupClass(seedMatch);
    const enrollment = enrollments.find((e) => e.id === id);
    const real = enrollment ? enrollmentToStudentGroupClass(enrollment, todayISO) : null;
    if (real) return buildFromStudentGroupClass(real);
    // Same fallback resolveClassroomSession always had — a student route
    // hit with a tutor-shaped id.
    return buildFromMyGroupClassAsStudent(initialMyGroupClasses.find((c) => c.id === id));
  }, [role, id, enrollments, submissions, todayISO]);

  const resolved = session ? { ...session, classroomId: `group:${id}` } : null;

  if (!resolved) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-ensena-ink px-6 text-center">
        <p className="text-sm text-white/70">We couldn&apos;t find that Group Class.</p>
      </div>
    );
  }

  // The tutor's real detail route is slug-based
  // (/tutor-dashboard/group-classes/[slug]) — computed here, from the
  // resolved session's own real title, so a real (non-seed) approved class
  // lands back on its own page instead of the generic list fallback a
  // Server Component could offer (it can't resolve real class data either).
  const leaveHref = role === "tutor" ? `/tutor-dashboard/group-classes/${slugifyTitle(resolved.title)}` : fallbackLeaveHref;

  return <ClassroomShell role={role} session={resolved} leaveHref={leaveHref} />;
}
