"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Flag, MessageSquare } from "lucide-react";

import { ClassListPageShell } from "@/components/student-dashboard/lessons/class-list-page-shell";
import type { ClassListItem } from "@/components/student-dashboard/lessons/class-list-row";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { ReportProblemModal } from "@/components/shared/report-problem-modal";
import { useAllAttendance } from "@/hooks/use-attendance";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { completionStatus, useEscrowConfirmFlow } from "@/hooks/use-escrow-confirm-flow";
import { useReviews } from "@/hooks/use-reviews";
import { buildBookingReference } from "@/lib/booking-reference";
import type { AttendanceRecord } from "@/lib/class-attendance-store";
import { parseDateTimeMs } from "@/lib/class-list-helpers";
import { formatClassDate, formatClassTime } from "@/lib/class-date-format";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import type { Review } from "@/lib/reviews-data";
import { dashboardStudent, studentLessons } from "@/lib/student-dashboard-data";

// Never shown for a Discovery Session — reviews only apply to Private and
// Group classes (see the spec this whole review system was built from).
function reviewBadgeFor(allReviews: Review[], tutor: string, rawId: string): ClassListItem["reviewBadge"] {
  const reviewed = allReviews.some((r) => r.direction === "student-to-tutor" && r.bookingId === rawId && r.reviewerName === dashboardStudent.name && r.recipientName === tutor);
  return reviewed ? { label: "Reviewed", tint: "bg-emerald-100 text-emerald-700" } : { label: "Review Pending", tint: "bg-amber-100 text-amber-700" };
}

// Omitted for the common "both showed up" case — not worth flagging in a
// list row. classroomId is `${kind}:${rawId}` (classroom-data.ts's own
// scheme), the same id class-attendance-store.ts's classroom-shell.tsx
// wiring writes real join/leave records under. `classroomId` is nullable —
// a pre-seeded LessonConfirmation (id like "lc-5") never had a real
// matching classroom route in this session (only a runtime-created one,
// id "lc-cls-private-<realLessonId>", does), so there's nothing true to
// report and the badge is correctly omitted rather than guessed.
function attendanceBadgeFor(allAttendance: AttendanceRecord[], classroomId: string | null): ClassListItem["attendanceBadge"] {
  if (!classroomId) return undefined;
  const records = allAttendance.filter((r) => r.classroomId === classroomId);
  const studentAttended = records.some((r) => r.participantRole === "student");
  const tutorAttended = records.some((r) => r.participantRole === "tutor");
  if (studentAttended && tutorAttended) return undefined;
  if (!studentAttended) return { label: "You missed this class", tint: "bg-rose-100 text-rose-700" };
  return { label: "Tutor didn't join", tint: "bg-rose-100 text-rose-700" };
}

// Only a runtime-created escrow record's id encodes the real lesson/session
// id a classroom was ever actually reachable at (see startLessonConfirmation
// in classroom-shell.tsx: `lc-cls-${kind}-${session.id}`) — every pre-seeded
// LessonConfirmation ("lc-1", "lc-5", ...) is a standalone fabricated
// record with no real classroom counterpart at all.
function classroomIdForEscrow(l: { id: string; type: "Private" | "Group" }): string | null {
  const match = l.id.match(/^lc-cls-(private|group)-(.+)$/);
  return match ? `${match[1]}:${match[2]}` : null;
}

const DISCOVERY_STUDENT_NAME = "Sarah Johnson";

// Every row here hands off to the shared Class Details page
// (/student-dashboard/lessons/class/[id]) — the same page Upcoming and
// Active also link to, and the one that owns the actual confirm/dispute
// flow (via useEscrowConfirmFlow), so this list is just the entry point,
// per "My Classes → Completed → View Details".
export function CompletedClassesClient() {
  const router = useRouter();
  const discoverySessions = useAllDiscoverySessions();
  const { myConfirmations, openConfirm, openDispute, modals } = useEscrowConfirmFlow();
  const allReviews = useReviews();
  const allAttendance = useAllAttendance();
  const [manageItemId, setManageItemId] = useState<string | null>(null);
  const [reportingDiscoveryId, setReportingDiscoveryId] = useState<string | null>(null);

  function messageTutor(name: string) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(name)}`);
  }

  const items: ClassListItem[] = [];

  myConfirmations.forEach((l) => {
    const status = completionStatus(l);
    items.push({
      id: `escrow-${l.id}`,
      kind: l.type === "Private" ? "Private Lesson" : "Group Class",
      title: l.subject,
      tutor: l.tutor,
      tutorImage: "/teacher-1.jpg.png",
      dateLabel: formatClassDate(new Date(l.completedAt)),
      timeLabel: formatClassTime(new Date(l.completedAt)),
      sortTime: l.completedAt,
      detailsHref: `/student-dashboard/lessons/class/${l.id}`,
      bookingIdLabel: "Booking ID",
      bookingId: buildBookingReference(l.type === "Private" ? "private" : "group", l.id),
      statusPill: status.action === "confirm" ? { label: "Awaiting Confirmation", tint: "bg-amber-100 text-amber-700" } : { label: status.label, tint: status.tint },
      reviewBadge: status.action === "confirm" ? undefined : reviewBadgeFor(allReviews, l.tutor, l.id),
      attendanceBadge: status.action === "confirm" ? undefined : attendanceBadgeFor(allAttendance, classroomIdForEscrow(l)),
      actionLabel: status.action === "confirm" ? "Confirm Lesson" : "View Details",
      actionHref: `/student-dashboard/lessons/class/${l.id}`,
      onKebab: () => setManageItemId(`escrow-${l.id}`),
    });
  });

  studentLessons
    .filter((l) => l.status === "Completed")
    .forEach((l) => {
      items.push({
        id: `lesson-${l.id}`,
        kind: l.type === "Private" ? "Private Lesson" : "Group Class",
        title: l.subject,
        tutor: l.tutor,
        tutorImage: l.tutorImage,
        dateLabel: l.date,
        timeLabel: `${l.time} · ${l.duration}`,
        sortTime: parseDateTimeMs(l.date, l.time),
        detailsHref: `/student-dashboard/lessons/class/${l.id}`,
        bookingIdLabel: "Booking ID",
        bookingId: buildBookingReference(l.type === "Private" ? "private" : "group", l.id),
        statusPill: { label: "Confirmed", tint: "bg-emerald-100 text-emerald-700" },
        reviewBadge: reviewBadgeFor(allReviews, l.tutor, l.id),
        attendanceBadge: attendanceBadgeFor(allAttendance, `${l.type === "Private" ? "private" : "group"}:${l.id}`),
        actionLabel: "View Details",
        actionHref: `/student-dashboard/lessons/class/${l.id}`,
        onKebab: () => setManageItemId(`lesson-${l.id}`),
      });
    });

  discoverySessions
    .filter((d) => d.student === DISCOVERY_STUDENT_NAME && d.status === "Completed")
    .forEach((d) => {
      items.push({
        id: `discovery-${d.id}`,
        kind: "Discovery Session",
        title: "Discovery Session",
        tutor: d.tutor,
        tutorImage: d.tutorImage,
        dateLabel: d.date,
        timeLabel: `${d.time} · ${d.durationMins} min`,
        sortTime: parseDateTimeMs(d.date, d.time),
        extraLine: d.subject,
        detailsHref: `/student-dashboard/lessons/class/${d.id}`,
        bookingIdLabel: "Booking ID",
        bookingId: d.bookingReference,
        statusPill: { label: "Confirmed", tint: "bg-emerald-100 text-emerald-700" },
        attendanceBadge: attendanceBadgeFor(allAttendance, `discovery:${d.id}`),
        actionLabel: "View Details",
        actionHref: `/student-dashboard/lessons/class/${d.id}`,
        onKebab: () => setManageItemId(`discovery-${d.id}`),
      });
    });

  function buildManageData(itemId: string): ManageLessonData | null {
    const [kind, ...rest] = itemId.split("-");
    const rawId = rest.join("-");
    if (kind === "escrow" || kind === "lesson") {
      const confirmation = myConfirmations.find((c) => c.id === rawId);
      if (confirmation) {
        return { sheetTitle: "Manage Lesson", title: confirmation.subject, subtitle: confirmation.tutor, statusLabel: completionStatus(confirmation).label, bookingRef: buildBookingReference(confirmation.type === "Private" ? "private" : "group", confirmation.id), infoRows: [{ label: "Amount", value: `₦${confirmation.amountGross.toLocaleString()}` }] };
      }
      const l = studentLessons.find((x) => x.id === rawId);
      if (!l) return null;
      return { sheetTitle: "Manage Lesson", title: l.subject, subtitle: l.tutor, image: l.tutorImage, statusLabel: l.status, bookingRef: buildBookingReference(l.type === "Private" ? "private" : "group", l.id), infoRows: [{ label: "Date", value: l.date }, { label: "Time", value: l.time }] };
    }
    const d = discoverySessions.find((x) => x.id === rawId);
    if (!d) return null;
    return { sheetTitle: "Manage Discovery Session", title: "Discovery Session", subtitle: d.tutor, image: d.tutorImage, statusLabel: d.status, bookingRef: d.bookingReference, infoRows: [{ label: "Date", value: d.date }, { label: "Time", value: d.time }] };
  }

  function buildManageActions(itemId: string): ManageLessonAction[] {
    const [kind, ...rest] = itemId.split("-");
    const rawId = rest.join("-");
    const actions: ManageLessonAction[] = [];
    if (kind === "escrow" || kind === "lesson") {
      const confirmation = kind === "escrow" ? myConfirmations.find((c) => c.id === rawId) : undefined;
      const l = studentLessons.find((x) => x.id === rawId);
      const tutor = confirmation?.tutor ?? l?.tutor;
      if (!tutor) return actions;
      actions.push({ key: "view", label: "View Class", icon: Calendar, onClick: () => { setManageItemId(null); router.push(`/student-dashboard/lessons/class/${rawId}`); } });
      actions.push({ key: "message", label: "Message Teacher", icon: MessageSquare, onClick: () => { setManageItemId(null); messageTutor(tutor); } });
      if (confirmation) {
        const status = completionStatus(confirmation);
        if (status.action === "confirm") {
          actions.unshift({ key: "confirm", label: "Confirm Lesson", icon: CheckCircle2, variant: "primary", onClick: () => { setManageItemId(null); openConfirm(confirmation.id); } });
        }
        if (confirmation.confirmationStatus !== "Disputed") {
          actions.push({ key: "report", label: "Report a Problem", icon: Flag, variant: "danger", onClick: () => { setManageItemId(null); openDispute(confirmation.id); } });
        }
      }
    } else {
      const d = discoverySessions.find((x) => x.id === rawId);
      if (!d) return actions;
      actions.push({ key: "view", label: "View Class", icon: Calendar, onClick: () => { setManageItemId(null); router.push(`/student-dashboard/lessons/class/${d.id}`); } });
      actions.push({ key: "message", label: "Message Teacher", icon: MessageSquare, onClick: () => { setManageItemId(null); messageTutor(d.tutor); } });
      actions.push({ key: "report", label: "Report a Problem", icon: Flag, variant: "danger", onClick: () => { setManageItemId(null); setReportingDiscoveryId(d.id); } });
    }
    return actions;
  }

  const reportingDiscovery = discoverySessions.find((d) => d.id === reportingDiscoveryId) ?? null;

  return (
    <>
      <ClassListPageShell
        title="Completed Classes"
        subtitle="Your completed lessons and classes."
        kinds={["Private Lesson", "Group Class", "Discovery Session"]}
        items={items}
        emptyLabel="No completed classes yet."
      />
      <ManageLessonSheet
        open={manageItemId !== null}
        data={manageItemId ? buildManageData(manageItemId) : null}
        actions={manageItemId ? buildManageActions(manageItemId) : []}
        onClose={() => setManageItemId(null)}
      />
      <ReportProblemModal
        open={reportingDiscovery !== null}
        onClose={() => setReportingDiscoveryId(null)}
        context="booking"
        relatedRecordType="booking"
        relatedRecordId={reportingDiscovery?.bookingReference ?? ""}
        relatedRecordLabel={`Discovery Session with ${reportingDiscovery?.tutor ?? ""}`}
      />
      {modals}
    </>
  );
}
