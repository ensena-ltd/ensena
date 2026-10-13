"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Info, MessageSquare, Users, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useNowMs } from "@/hooks/use-now-ms";
import { useTodayISO } from "@/hooks/use-today-iso";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { cancelBooking, type CancellationReason } from "@/lib/booking-lifecycle-store";
import { parseLegacyDateTime } from "@/lib/class-entry-access";
import { computeCancellationPolicy } from "@/lib/cancellation-policy";
import { getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { enrollmentToStudentGroupClass } from "@/lib/student-booking-adapters";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import { dashboardStudent, studentGroupClasses as initialGroupClasses, type StudentGroupClass } from "@/lib/student-dashboard-data";

export function StudentGroupClassesClient() {
  const router = useRouter();
  const [legacyClasses, setLegacyClasses] = useState<StudentGroupClass[]>(initialGroupClasses);
  const enrollments = useGroupClassEnrollments();
  const todayISO = useTodayISO();
  const classes = useMemo(() => {
    const real = enrollments
      .filter((e) => e.studentName === dashboardStudent.name && e.status !== "cancelled")
      .map((e) => enrollmentToStudentGroupClass(e, todayISO))
      .filter((c): c is StudentGroupClass => c !== null);
    return [...legacyClasses, ...real];
  }, [legacyClasses, enrollments, todayISO]);
  const [manageId, setManageId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const manageClass = classes.find((c) => c.id === manageId) ?? null;
  const cancelingClass = classes.find((c) => c.id === cancelingId) ?? null;

  const nowMs = useNowMs();

  // The class's schedule string is "Mon, Wed · 6:00 PM – 7:00 PM" for both a
  // real enrollment and a legacy seed row — the same parseable shape
  // student-dashboard-data.ts's own getGroupSessionTimeRange assumes, except
  // this reuses parseLegacyDateTime (class-entry-access.ts) against
  // `cohortStart`, which is always a real, unambiguous ISO date on both.
  function classStartMs(cls: StudentGroupClass): number {
    const timePart = cls.schedule.split("· ")[1] ?? cls.schedule;
    const startTime = timePart.split("–")[0].trim();
    return parseLegacyDateTime(cls.cohortStart, startTime);
  }

  function cancelPreview(cls: StudentGroupClass) {
    return computeCancellationPolicy({
      amount: cls.pricePerSession,
      startMs: classStartMs(cls),
      nowMs,
      cancelledBy: "Student",
    });
  }

  function cancelEnrolment(id: string, reason: CancellationReason, notes?: string) {
    const cls = classes.find((c) => c.id === id);
    if (cls && getGroupClassEnrollments().some((e) => e.id === id)) {
      cancelBooking({
        bookingId: id,
        kind: "Group",
        cancelledBy: "Student",
        cancelledByName: dashboardStudent.name,
        otherPartyName: cls.tutor,
        subject: cls.title,
        reason,
        notes,
        originalStart: cls.cohortStart,
        originalEnd: cls.schedule,
        originalStartMs: classStartMs(cls),
        originalAmount: cls.pricePerSession,
        nowMs,
        studentDetailUrl: `/student-dashboard/group-classes/${id}`,
        // otherPartyName is the tutor here (student is cancelling) — the
        // recipient of this notification is the tutor, so the link must be
        // their own dashboard's view of this group class, keyed by the
        // class's slug (not the enrollment id the student route uses).
        tutorDetailUrl: (() => {
          const enrollment = getGroupClassEnrollments().find((e) => e.id === id);
          return enrollment ? `/tutor-dashboard/group-classes/${enrollment.slug}` : "/tutor-dashboard/private-lessons";
        })(),
      });
    } else {
      setLegacyClasses((prev) => prev.filter((c) => c.id !== id));
    }
    setCancelingId(null);
    setManageId(null);
  }

  function buildManageData(cls: StudentGroupClass): ManageLessonData {
    return {
      sheetTitle: "Manage class",
      title: cls.title,
      subtitle: cls.tutor,
      statusLabel: "Active",
      bookingRef: isValidBookingReference(cls.id) ? cls.id : buildBookingReference("group", cls.id),
      infoRows: [
        { label: "Tutor", value: cls.tutor },
        { label: "Next class", value: cls.nextClass },
        { label: "Schedule", value: cls.schedule },
        { label: "Enrolment", value: `${cls.seatsFilled}/${cls.seatsTotal} students` },
        { label: "Attendance", value: `${cls.attendancePct}%` },
      ],
    };
  }

  function buildManageActions(cls: StudentGroupClass): ManageLessonAction[] {
    return [
      {
        key: "details",
        label: "View class details",
        icon: Info,
        variant: "primary",
        onClick: () => { setManageId(null); router.push(`/student-dashboard/group-classes/${cls.id}`); },
      },
      {
        key: "curriculum",
        label: "View curriculum",
        icon: BookOpen,
        onClick: () => { setManageId(null); router.push(`/student-dashboard/group-classes/${cls.id}`); },
      },
      {
        key: "message",
        label: "Message tutor",
        icon: MessageSquare,
        onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(cls.tutor)}`); },
      },
      {
        key: "cancel",
        label: "Cancel enrolment",
        icon: XCircle,
        variant: "danger",
        onClick: () => { setManageId(null); setCancelingId(cls.id); },
      },
    ];
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Group Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">{classes.length} group classes you&apos;re enrolled in.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {classes.map((cls) => (
          <div key={cls.id} className="overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface">
            <div className="flex h-20 items-center justify-center" style={{ backgroundColor: `${cls.color}1A` }}>
              <Users className="size-7" style={{ color: cls.color }} />
            </div>
            <div className="p-4">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">{cls.title}</h2>
              <p className="mt-0.5 text-xs text-ensena-muted">{cls.tutor} · {cls.schedule}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-ensena-muted">
                <span>{cls.seatsFilled}/{cls.seatsTotal} students</span>
                <span>{cls.attendancePct}% attendance</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
                <div className="h-full rounded-full" style={{ width: `${(cls.seatsFilled / cls.seatsTotal) * 100}%`, backgroundColor: cls.color }} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <p className="text-xs text-ensena-muted">Next class: <span className="font-medium text-ensena-ink">{cls.nextClass}</span></p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManageId(cls.id)}
                    className="h-9 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    Manage
                  </button>
                  <Button
                    nativeButton={false}
                    render={<Link href={`/student-dashboard/group-classes/${cls.id}`} />}
                    className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white"
                  >
                    Open Class
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <p className="col-span-full rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">
            You&apos;re not enrolled in any group classes.
          </p>
        )}
      </div>

      <ManageLessonSheet
        open={manageClass !== null}
        data={manageClass ? buildManageData(manageClass) : null}
        actions={manageClass ? buildManageActions(manageClass) : []}
        onClose={() => setManageId(null)}
      />

      <CancelLessonModal
        open={cancelingClass !== null}
        title="Cancel enrolment?"
        summary={cancelingClass ? `${cancelingClass.title} with ${cancelingClass.tutor} (${cancelingClass.schedule})` : ""}
        policyLabel={cancelingClass ? cancelPreview(cancelingClass).policyApplied : ""}
        refundAmount={cancelingClass ? cancelPreview(cancelingClass).refundAmount : 0}
        cancellationFee={cancelingClass ? cancelPreview(cancelingClass).cancellationFee : 0}
        onKeep={() => setCancelingId(null)}
        onConfirm={(reason, notes) => cancelingId && cancelEnrolment(cancelingId, reason, notes)}
      />
    </div>
  );
}
