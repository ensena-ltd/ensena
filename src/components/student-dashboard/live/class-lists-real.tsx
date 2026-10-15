"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, CreditCard, FileText, Flag, MessageSquare, Star, Video } from "lucide-react";
import { toast } from "sonner";

import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { ClassListPageShell } from "@/components/student-dashboard/lessons/class-list-page-shell";
import type { ClassKind, ClassListItem } from "@/components/student-dashboard/lessons/class-list-row";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { confirmLessonCompleted } from "@/lib/actions/student-learning";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { formatNaira } from "@/lib/format";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import type { CompletedLesson, LearningSession, StudentLearningSnapshot } from "@/lib/student-learning-server";

import { buildActiveArrangements, formatLongDate, formatTime, formatTimeRange, isAwaitingCompletion, isUpcoming, needsPayment, relativeDay } from "./learning-utils";
import { ReviewModal, useLiveNow } from "./live-shared";
import { useReportIssue } from "./report-issue";

// Real (Supabase) versions of /student-dashboard/lessons/{completed,upcoming,active}:
// the same list design as the demo pages (ClassListPageShell), filled from
// the student's own bookings. "View Details" opens the class details on My
// Classes (?view=<id>), which owns cancel/reschedule/pay.

const detailsHref = (id: string) => `/student-dashboard/lessons?view=${id}`;
const pill = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  grey: "bg-ensena-bg-soft text-ensena-muted",
};

function classKind(kind: LearningSession["kind"] | CompletedLesson["bookingType"]): ClassKind {
  return kind === "group" ? "Group Class" : kind === "discovery" ? "Discovery Session" : "Private Lesson";
}

function useMessageTutor() {
  const router = useRouter();
  return (tutorId: string | null) => tutorId && router.push(`/student-dashboard/messages?tutor=${tutorId}`);
}

// ── Completed ───────────────────────────────────────────────────────────

export function CompletedClassesReal({ data }: { data: StudentLearningSnapshot }) {
  const router = useRouter();
  const nowMs = useLiveNow(data.generatedAtMs);
  const messageTutor = useMessageTutor();
  const report = useReportIssue();
  const [manageId, setManageId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<CompletedLesson | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function confirm(c: CompletedLesson) {
    setConfirmingId(c.id);
    startTransition(async () => {
      const result = await confirmLessonCompleted(c.id);
      setConfirmingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't confirm this lesson.");
        return;
      }
      toast.success(`Thanks! Payment has been released to ${c.tutorName}.`);
      router.refresh();
    });
  }

  const needsConfirm = (c: CompletedLesson) => c.bookingType === "private" && c.confirmationStatus === "Pending";
  const canReport = (c: CompletedLesson) => c.confirmationStatus === "Pending" && (c.autoReleaseAtMs ?? 0) > nowMs;

  function statusFor(c: CompletedLesson): { label: string; tint: string } {
    if (c.confirmationStatus === "Disputed" || c.escrowStatus === "Frozen") return { label: "Under Review", tint: pill.rose };
    if (needsConfirm(c)) return { label: "Awaiting Confirmation", tint: pill.amber };
    return { label: "Confirmed", tint: pill.green };
  }

  const items: ClassListItem[] = [
    ...data.completed.map((c): ClassListItem => {
      const confirming = needsConfirm(c);
      const toReview = c.reviewable && !c.review;
      return {
        id: c.id,
        kind: classKind(c.bookingType),
        title: c.subject,
        tutor: c.tutorName,
        tutorImage: c.tutorImage,
        detailsHref: detailsHref(c.id),
        dateLabel: formatLongDate(c.completedAtMs),
        timeLabel: formatTime(c.completedAtMs),
        sortTime: c.completedAtMs,
        bookingIdLabel: "Booking ID",
        bookingId: c.id.slice(0, 8).toUpperCase(),
        statusPill: statusFor(c),
        reviewBadge: c.reviewable ? (c.review ? { label: `Reviewed · ${c.review.rating}/5`, tint: pill.green } : { label: "Review Pending", tint: pill.amber }) : undefined,
        attendanceBadge: c.attended === false ? { label: "You missed this class", tint: pill.rose } : undefined,
        actionLabel: confirmingId === c.id ? "Confirming…" : confirming ? "Confirm Lesson" : toReview ? "Leave Review" : "View Details",
        actionHref: confirming || toReview ? undefined : detailsHref(c.id),
        actionDisabled: confirmingId === c.id,
        onAction: confirming ? () => confirm(c) : toReview ? () => setReviewing(c) : undefined,
        onKebab: () => setManageId(c.id),
      };
    }),
    // Past lessons the tutor hasn't marked as done yet.
    ...data.sessions
      .filter((s) => isAwaitingCompletion(s, nowMs))
      .map((s): ClassListItem => ({
        id: s.id,
        kind: classKind(s.kind),
        title: s.title,
        tutor: s.personName,
        tutorImage: s.personImage,
        detailsHref: detailsHref(s.id),
        dateLabel: formatLongDate(s.startMs),
        timeLabel: `${formatTime(s.startMs)} · ${s.durationMinutes} mins`,
        modeLabel: s.mode,
        sortTime: s.startMs,
        bookingIdLabel: "Booking ID",
        bookingId: s.bookingReference ?? s.id.slice(0, 8).toUpperCase(),
        statusPill: { label: "Awaiting Tutor", tint: pill.grey },
        actionLabel: "View Details",
        actionHref: detailsHref(s.id),
        onKebab: () => setManageId(s.id),
      })),
    ...data.sessions
      .filter((s) => s.kind === "discovery" && s.status === "completed")
      .map((s): ClassListItem => ({
        id: s.id,
        kind: "Discovery Session",
        title: "Discovery Session",
        tutor: s.personName,
        tutorImage: s.personImage,
        detailsHref: detailsHref(s.id),
        dateLabel: formatLongDate(s.startMs),
        timeLabel: `${formatTime(s.startMs)} · ${s.durationMinutes} min`,
        extraLine: s.subject || undefined,
        sortTime: s.startMs,
        bookingIdLabel: "Booking ID",
        bookingId: s.bookingReference ?? s.id.slice(0, 8).toUpperCase(),
        statusPill: { label: "Completed", tint: pill.green },
        actionLabel: "View Details",
        actionHref: detailsHref(s.id),
        onKebab: () => setManageId(s.id),
      })),
  ];

  const manageCompleted = data.completed.find((c) => c.id === manageId) ?? null;
  const manageSession = !manageCompleted ? (data.sessions.find((s) => s.id === manageId) ?? null) : null;

  let manageData: ManageLessonData | null = null;
  const actions: ManageLessonAction[] = [];
  const close = () => setManageId(null);
  if (manageCompleted) {
    const c = manageCompleted;
    manageData = {
      sheetTitle: "Manage lesson",
      title: c.subject,
      subtitle: c.tutorName,
      image: c.tutorImage ?? undefined,
      statusLabel: statusFor(c).label,
      bookingRef: c.id.slice(0, 8).toUpperCase(),
      infoRows: [
        { label: "Completed", value: `${formatLongDate(c.completedAtMs)} · ${formatTime(c.completedAtMs)}` },
        ...(c.amount ? [{ label: "Amount", value: formatNaira(c.amount) }] : []),
      ],
    };
    if (needsConfirm(c)) actions.push({ key: "confirm", label: "Confirm Lesson", icon: CheckCircle2, variant: "primary", onClick: () => { close(); confirm(c); } });
    if (c.reviewable && !c.review) actions.push({ key: "review", label: "Leave a review", icon: Star, onClick: () => { close(); setReviewing(c); } });
    actions.push({ key: "details", label: "View details", icon: FileText, onClick: () => { close(); router.push(detailsHref(c.id)); } });
    actions.push({ key: "message", label: `Message ${c.tutorName.split(" ")[0]}`, icon: MessageSquare, onClick: () => { close(); messageTutor(c.tutorId); } });
    actions.push({ key: "rebook", label: "Book another lesson", icon: CalendarPlus, onClick: () => { close(); router.push(`/student-dashboard/tutors/${c.tutorId}/book`); } });
    if (canReport(c)) actions.push({ key: "report", label: "Report a problem", icon: Flag, variant: "danger", onClick: () => { close(); report.open(c); } });
  } else if (manageSession) {
    const s = manageSession;
    manageData = {
      sheetTitle: s.kind === "discovery" ? "Manage discovery session" : "Manage lesson",
      title: s.title,
      subtitle: s.personName,
      image: s.personImage ?? undefined,
      statusLabel: s.status === "completed" ? "Completed" : "Awaiting tutor",
      bookingRef: s.bookingReference ?? "—",
      infoRows: [
        { label: "Date", value: formatLongDate(s.startMs) },
        { label: "Time", value: formatTimeRange(s) },
      ],
    };
    actions.push({ key: "details", label: "View details", icon: FileText, onClick: () => { close(); router.push(detailsHref(s.id)); } });
    if (s.personId) actions.push({ key: "message", label: `Message ${s.personName.split(" ")[0]}`, icon: MessageSquare, onClick: () => { close(); messageTutor(s.personId); } });
  }

  return (
    <>
      <ClassListPageShell title="Completed Classes" subtitle="Your completed lessons and classes." kinds={["Private Lesson", "Group Class", "Discovery Session"]} items={items} emptyLabel="No completed classes yet." />
      <ManageLessonSheet open={manageData !== null} data={manageData} actions={actions} onClose={close} />
      <ReviewModal lesson={reviewing} onClose={() => setReviewing(null)} />
      {report.modal}
    </>
  );
}

// ── Upcoming / Active ───────────────────────────────────────────────────

function useSessionManage(nowMs: number) {
  const router = useRouter();
  const messageTutor = useMessageTutor();
  const [manage, setManage] = useState<LearningSession | null>(null);
  const close = () => setManage(null);

  const data: ManageLessonData | null = manage
    ? {
        sheetTitle: manage.kind === "group" ? "Manage class" : manage.kind === "discovery" ? "Manage discovery session" : "Manage lesson",
        title: manage.title,
        subtitle: manage.personName,
        image: manage.personImage ?? undefined,
        statusLabel: needsPayment(manage) && manage.paymentStatus === "unpaid" ? "Awaiting payment" : "Upcoming",
        bookingRef: manage.bookingReference ?? "—",
        infoRows: [
          { label: "Date", value: formatLongDate(manage.startMs) },
          { label: "Time", value: formatTimeRange(manage) },
          { label: "Mode", value: manage.mode },
        ],
      }
    : null;

  const actions: ManageLessonAction[] = [];
  if (manage) {
    const s = manage;
    if (s.kind === "private" && s.paymentStatus === "unpaid") {
      actions.push({ key: "pay", label: "Complete payment", icon: CreditCard, variant: "primary", onClick: () => { close(); router.push(detailsHref(s.id)); } });
    } else if (s.classroomHref) {
      actions.push({ key: "join", label: "Join classroom", icon: Video, variant: "primary", disabled: !canEnter(s, nowMs), onClick: () => router.push(s.classroomHref!) });
    }
    actions.push({ key: "details", label: "View details, reschedule or cancel", icon: FileText, onClick: () => { close(); router.push(detailsHref(s.id)); } });
    if (s.personId) actions.push({ key: "message", label: `Message ${s.personName.split(" ")[0]}`, icon: MessageSquare, onClick: () => { close(); messageTutor(s.personId); } });
  }

  return { open: setManage, sheet: <ManageLessonSheet open={data !== null} data={data} actions={actions} onClose={close} /> };
}

function canEnter(s: LearningSession, nowMs: number) {
  return !needsPayment(s) && canEnterClassroom(getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs }));
}

function startsIn(s: LearningSession, nowMs: number) {
  if (s.kind === "private" && s.paymentStatus === "unpaid") return `Awaiting payment · ${formatNaira(s.price)}`;
  const state = getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs });
  if (state === "live" || nowMs >= s.startMs) return "Happening now";
  if (state === "too-early") {
    const hint = entryOpensHint(s.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs);
    return typeof hint === "string" ? hint : `${relativeDay(s.startMs, nowMs)} at ${formatTime(s.startMs)}`;
  }
  return undefined;
}

export function UpcomingClassesReal({ data }: { data: StudentLearningSnapshot }) {
  const nowMs = useLiveNow(data.generatedAtMs);
  const manage = useSessionManage(nowMs);
  const items: ClassListItem[] = data.sessions
    .filter((s) => isUpcoming(s, nowMs))
    .map((s) => {
      const unpaid = s.kind === "private" && s.paymentStatus === "unpaid";
      return {
        id: s.id,
        kind: classKind(s.kind === "counselling" ? "private" : s.kind),
        title: s.kind === "counselling" ? "Counselling Session" : s.title,
        tutor: s.personName,
        tutorImage: s.personImage,
        detailsHref: detailsHref(s.id),
        dateLabel: formatLongDate(s.startMs),
        timeLabel: `${formatTimeRange(s)} · ${s.durationMinutes} mins`,
        startsInLabel: startsIn(s, nowMs),
        modeLabel: s.mode,
        extraLine: s.kind === "group" && s.seatsTotal ? `${s.seatsFilled ?? 0} / ${s.seatsTotal} students` : s.sessionNumber && s.totalSessions && s.totalSessions > 1 ? `Session ${s.sessionNumber} of ${s.totalSessions}` : undefined,
        sortTime: s.startMs,
        bookingIdLabel: s.kind === "group" ? "Class ID" : "Booking ID",
        bookingId: s.bookingReference ?? s.id.slice(0, 8).toUpperCase(),
        actionLabel: unpaid ? "Pay now" : s.classroomHref ? "Enter Classroom" : "View Details",
        actionHref: unpaid ? detailsHref(s.id) : (s.classroomHref ?? detailsHref(s.id)),
        actionDisabled: !unpaid && !!s.classroomHref && !canEnter(s, nowMs),
        onKebab: () => manage.open(s),
      } satisfies ClassListItem;
    });

  return (
    <>
      <ClassListPageShell title="Upcoming Classes" subtitle="Everything you have scheduled." kinds={["Private Lesson", "Group Class", "Discovery Session"]} items={items} emptyLabel="Nothing scheduled yet." />
      {manage.sheet}
    </>
  );
}

export function ActiveClassesReal({ data }: { data: StudentLearningSnapshot }) {
  const nowMs = useLiveNow(data.generatedAtMs);
  const manage = useSessionManage(nowMs);
  const items: ClassListItem[] = buildActiveArrangements(data.sessions, nowMs).map((a) => ({
    id: a.key,
    kind: classKind(a.kind),
    title: a.title,
    tutor: a.personName,
    tutorImage: a.personImage,
    detailsHref: detailsHref(a.next.id),
    dateLabel: `Next: ${formatLongDate(a.next.startMs)}`,
    timeLabel: a.scheduleLine,
    startsInLabel: startsIn(a.next, nowMs),
    modeLabel: a.next.mode,
    extraLine: a.extraLine ?? undefined,
    sortTime: a.next.startMs,
    bookingIdLabel: a.kind === "group" ? "Class ID" : "Booking ID",
    bookingId: a.next.bookingReference ?? a.key.slice(0, 8).toUpperCase(),
    actionLabel: "View Class",
    actionHref: detailsHref(a.next.id),
    onKebab: () => manage.open(a.next),
  }));

  return (
    <>
      <ClassListPageShell title="Active Classes" subtitle="Your ongoing lessons and group classes." kinds={["Private Lesson", "Group Class"]} items={items} emptyLabel="No active classes right now." />
      {manage.sheet}
    </>
  );
}
