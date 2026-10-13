"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  MoreVertical,
  RefreshCcw,
  Video,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { completionStatus, useEscrowConfirmFlow } from "@/hooks/use-escrow-confirm-flow";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useNowMs } from "@/hooks/use-now-ms";
import { useTodayISO } from "@/hooks/use-today-iso";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { cancelBooking, getCancellationDetails, rescheduleBooking, type CancellationReason } from "@/lib/booking-lifecycle-store";
import { buildActivePrivateArrangements, isNotYetOver } from "@/lib/class-list-helpers";
import { classifyClassStatus } from "@/lib/class-status";
import { formatLessonDateLabel } from "@/lib/tutor-availability";
import { to12HourDisplay } from "@/lib/time-format";
import { canEnterClassroom, getClassEntryState, parseLegacyDateTime, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { showToast } from "@/lib/toast-store";
import { computeCancellationPolicy } from "@/lib/cancellation-policy";
import { formatNaira } from "@/lib/format";
import { hasSessionAccess } from "@/lib/payment-plans-store";
import { getDiscoverySessionTimeRange } from "@/lib/discovery-sessions-data";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { enrollmentToStudentLesson, privateLessonToStudentLesson } from "@/lib/student-booking-adapters";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import {
  dashboardStudent,
  getPrivateLessonTimeRange,
  studentGroupClasses,
  studentLessons as initialStudentLessons,
  studentStudyTasks as initialStudyTasks,
  studentTodaySchedule,
  type StudentLesson,
  type StudyTask,
} from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

// The discovery-sessions module's own established student identity — see
// learning-journey-card.tsx and student-discovery-sessions-client.tsx,
// which already filter on this same name. Not the same as
// dashboardStudent.name; a pre-existing inconsistency in this codebase
// (predating this page) that's out of scope to unify here since it fans
// out into admin/counsellor tooling too — see the session write-up.
const DISCOVERY_STUDENT_NAME = "Sarah Johnson";

const tabs = ["Upcoming", "Active", "Completed", "Cancelled", "Study Planner"] as const;
type Tab = (typeof tabs)[number];

const kindStyles = {
  "Private Lesson": "bg-rose-50 text-rose-700",
  "Group Class": "bg-[#CBEFFF] text-[#1E7BA6]",
  "Discovery Session": "bg-violet-50 text-violet-700",
};

function tutorAvatarLookup(): Record<string, string> {
  const map: Record<string, string> = {};
  initialStudentLessons.forEach((l) => { map[l.tutor] ??= l.tutorImage; });
  return map;
}

function UpcomingCard({
  kind,
  title,
  subtitle,
  lines,
  avatarSrc,
  primaryLabel,
  primaryHref,
  primaryDisabled,
  disabledHint,
  onKebab,
}: {
  kind: keyof typeof kindStyles;
  title: string;
  subtitle: string;
  lines: string[];
  avatarSrc?: string;
  primaryLabel: string;
  primaryHref?: string;
  primaryDisabled?: boolean;
  /** Shown only while primaryDisabled — explains WHY (e.g. "Classroom opens at 3:00 PM") instead of leaving a disabled button with no explanation, which reads as broken rather than "not yet." */
  disabledHint?: ReactNode;
  onKebab: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", kindStyles[kind])}>{kind}</span>
      <div>
        <h3 className="font-heading text-base font-semibold text-ensena-ink">{title}</h3>
        <p className="text-sm text-ensena-muted">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-1 text-xs text-ensena-muted">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      {primaryDisabled && disabledHint && <p className="text-xs font-medium text-ensena-primary">{disabledHint}</p>}
      <div className="mt-auto flex items-center gap-2 pt-1">
        {avatarSrc && (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
            <Image src={avatarSrc} alt={subtitle} fill sizes="36px" className="object-cover" />
          </div>
        )}
        {primaryHref ? (
          <Button
            variant="outline"
            nativeButton={false}
            disabled={primaryDisabled}
            render={<Link href={primaryHref} />}
            className="h-9 flex-1 rounded-full border-ensena-primary text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
          >
            {primaryLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={primaryDisabled}
            className="h-9 flex-1 rounded-full border-ensena-primary text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
          >
            {primaryLabel}
          </Button>
        )}
        <button
          type="button"
          aria-label="More options"
          onClick={onKebab}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </article>
  );
}

function ActiveRow({
  avatarSrc,
  title,
  badge,
  tutor,
  scheduleLine,
  extraLine,
  nextLabel,
  nextValue,
  href,
  onKebab,
}: {
  avatarSrc: string;
  title: string;
  badge: string;
  tutor: string;
  scheduleLine: string;
  extraLine?: string;
  nextLabel: string;
  nextValue: string;
  href: string;
  onKebab: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
        <Image src={avatarSrc} alt={tutor} fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
          {title}
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", badge === "Private" ? "bg-rose-50 text-rose-700" : "bg-[#CBEFFF] text-[#1E7BA6]")}>{badge}</span>
        </p>
        <p className="text-xs text-ensena-muted">with {tutor}</p>
        <p className="mt-0.5 text-xs text-ensena-muted">{scheduleLine}</p>
        {extraLine && <p className="text-xs text-ensena-muted">{extraLine}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-ensena-muted">{nextLabel}</p>
          <p className="text-sm font-semibold text-ensena-ink">{nextValue}</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={href} />} className="h-9 shrink-0 rounded-full border-ensena-primary px-4 text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5">
          View Class
        </Button>
        <button type="button" aria-label="More options" onClick={onKebab} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const todayISO = useTodayISO();
  const [offset, setOffset] = useState(0);
  const [y, m, d] = todayISO.split("-").map(Number);

  const viewDate = new Date(y, m - 1 + offset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isCurrentMonth = offset === 0;
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
          <Calendar className="size-4 text-ensena-primary" /> Your Schedule
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)} className="flex size-6 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setOffset((o) => o + 1)} className="flex size-6 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ensena-muted">{monthLabel}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ensena-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dateNum) => (
          <div
            key={dateNum}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-xs",
              isCurrentMonth && dateNum === d ? "bg-ensena-primary font-semibold text-white" : "text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {dateNum}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyChecklist({
  tasks,
  onToggle,
  compact,
}: {
  tasks: StudyTask[];
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  const today = tasks.filter((t) => t.dayOffset === 0);
  const week = tasks.filter((t) => t.dayOffset > 0 && t.dayOffset <= 6);

  return (
    <div className={cn(!compact && "rounded-2xl border border-ensena-border bg-ensena-surface p-5")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Study Planner</h2>
          <Link href="/student-dashboard/study-planner" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
            View full planner <ChevronRight className="size-3.5" />
          </Link>
        </div>
      )}
      <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", compact && "sm:grid-cols-1 gap-4")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Today</p>
          <ul className="mt-2 flex flex-col gap-2">
            {today.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                  <span className={item.done ? "text-ensena-muted line-through" : "text-ensena-ink"}>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">This Week</p>
          <ul className="mt-2 flex flex-col gap-2">
            {week.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                  <span className={item.done ? "text-ensena-muted line-through" : "text-ensena-ink"}>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {compact && (
        <Link href="/student-dashboard/study-planner" className="mt-4 flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
          View full planner <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function MyClassesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("Upcoming");
  const discoverySessions = useAllDiscoverySessions();
  const nowMs = useNowMs();
  const [manageDiscoveryId, setManageDiscoveryId] = useState<string | null>(null);
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);

  const [legacyLessons, setLegacyLessons] = useState<StudentLesson[]>(initialStudentLessons);
  const realPrivateLessons = usePrivateLessons();
  const realEnrollments = useGroupClassEnrollments();
  const lessons = useMemo<StudentLesson[]>(() => {
    // usePrivateLessons() returns the seed (pl-*, hash-derived bookingReference)
    // plus any real lessons appended at runtime — isValidBookingReference
    // excludes the seed rows (their id doesn't match the real reference
    // shape), leaving only genuinely booked lessons.
    const realPrivate = realPrivateLessons
      .filter((l) => l.student === dashboardStudent.name && isValidBookingReference(l.id))
      .map(privateLessonToStudentLesson);
    const realGroup = realEnrollments
      .filter((e) => e.studentName === dashboardStudent.name)
      .map(enrollmentToStudentLesson)
      .filter((l): l is StudentLesson => l !== null);
    // Real bookings first — the Upcoming section's preview cards use
    // `.find()` (one card per kind), so a student's own real booking should
    // win over demo seed data occupying that slot, not get buried behind it.
    return [...realPrivate, ...realGroup, ...legacyLessons];
  }, [legacyLessons, realPrivateLessons, realEnrollments]);
  const [manageLessonId, setManageLessonId] = useState<string | null>(null);
  const [cancelingLessonId, setCancelingLessonId] = useState<string | null>(null);
  const [reschedulingLessonId, setReschedulingLessonId] = useState<string | null>(null);
  const [viewingLesson, setViewingLesson] = useState<StudentLesson | null>(null);

  // Real toast delivery now lives in the one shared Toaster mounted at the
  // root layout (see toast-store.ts) — kept as a local `flash` alias so
  // every existing call site in this file stays unchanged.
  const flash = showToast;

  const { myConfirmations, openConfirm, modals: escrowModals } = useEscrowConfirmFlow();

  // studentStudyTasks is the shared source of truth (also read/written by
  // the dashboard home and the standalone Study Planner page) — mutate the
  // exported objects in place so a checked task stays checked everywhere,
  // same convention as toggleTask() on the dashboard.
  const [studyTasks, setStudyTasks] = useState<StudyTask[]>(initialStudyTasks);
  function toggleStudyTask(id: string) {
    const task = initialStudyTasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    setStudyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
  }

  const avatarByTutor = useMemo(() => tutorAvatarLookup(), []);

  function scrollToTab(tab: Tab) {
    setActiveTab(tab);
    document.getElementById(`myclasses-${tab.toLowerCase().replace(" ", "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Deep link support for /student-dashboard/lessons?tab=Study%20Planner
  // (used by the dashboard's Quick Actions and Study Plan card).
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const match = tabs.find((t) => t === tabParam);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing active tab from the URL on navigation, not derivable during render since it also scrolls
    if (match) scrollToTab(match);
  }, [searchParams]);

  function messageTutor(name: string) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(name)}`);
  }

  function parseNairaAmount(text: string): number {
    return Number(text.replace(/[^0-9.]/g, "")) || 0;
  }

  function bookingDetailUrl(lesson: StudentLesson): string {
    return lesson.type === "Group" ? `/student-dashboard/group-classes/${lesson.id}` : `/student-dashboard/lessons/class/${lesson.id}`;
  }

  // The tutor's own view of this same booking — needed because a
  // student-initiated cancel/reschedule notifies the TUTOR, and that
  // notification's link must point into the tutor's dashboard, not back
  // into the student's own pages. Private lessons are keyed by id there
  // too; group classes are keyed by the class's slug (from the enrollment
  // record), not the enrollment id.
  function tutorBookingDetailUrl(lesson: StudentLesson): string {
    if (lesson.type === "Group") {
      const enrollment = getGroupClassEnrollments().find((e) => e.id === lesson.id);
      return enrollment ? `/tutor-dashboard/group-classes/${enrollment.slug}` : "/tutor-dashboard/private-lessons";
    }
    return `/tutor-dashboard/private-lessons/${lesson.id}`;
  }

  // Both Private and Group real bookings resolve to a real start time this
  // way — Group's `time` is a range ("6:00 PM – 7:00 PM"), so only its first
  // half is a real clock time to parse.
  function lessonStartMs(lesson: StudentLesson): number {
    const startTime = lesson.time.split("–")[0].trim();
    return parseLegacyDateTime(lesson.date, startTime);
  }

  function isRealBooking(id: string): boolean {
    return getPrivateLessons().some((l) => l.id === id) || getGroupClassEnrollments().some((e) => e.id === id);
  }

  function cancelPreview(lesson: StudentLesson) {
    return computeCancellationPolicy({
      amount: parseNairaAmount(lesson.payment),
      startMs: lessonStartMs(lesson),
      nowMs,
      cancelledBy: "Student",
    });
  }

  function cancelLesson(id: string, reason: CancellationReason, notes?: string) {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson && isRealBooking(id)) {
      cancelBooking({
        bookingId: id,
        kind: lesson.type,
        cancelledBy: "Student",
        cancelledByName: dashboardStudent.name,
        otherPartyName: lesson.tutor,
        subject: lesson.subject,
        reason,
        notes,
        originalStart: lesson.date,
        originalEnd: lesson.time,
        originalStartMs: lessonStartMs(lesson),
        originalAmount: parseNairaAmount(lesson.payment),
        nowMs,
        studentDetailUrl: bookingDetailUrl(lesson),
        tutorDetailUrl: tutorBookingDetailUrl(lesson),
      });
    } else {
      setLegacyLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: "Cancelled" } : l)));
    }
    setCancelingLessonId(null);
    setManageLessonId(null);
  }

  function rescheduleLesson(id: string, newDate: string, newTime: string) {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson && lesson.type === "Private" && getPrivateLessons().some((l) => l.id === id)) {
      try {
        rescheduleBooking({
          bookingId: id,
          kind: "Private",
          requestedBy: "Student",
          requestedByName: dashboardStudent.name,
          otherPartyName: lesson.tutor,
          subject: lesson.subject,
          fromDate: lesson.date,
          fromTime: lesson.time,
          // newDate/newTime arrive as raw ISO ("2026-09-15") + 24-hour
          // ("18:30") straight from the modal's <input type="date"/"time">
          // — format each into the same "Sep 15, 2026" / "6:00 PM" shape
          // every other PrivateLesson.date/.time value already uses, since
          // reschedulePrivateLesson persists these two fields verbatim and
          // the notification text below reads the same two fields back.
          toDate: formatLessonDateLabel(new Date(`${newDate}T00:00:00`)),
          toTime: to12HourDisplay(newTime),
          studentDetailUrl: bookingDetailUrl(lesson),
          tutorDetailUrl: tutorBookingDetailUrl(lesson),
        });
      } catch (e) {
        flash(e instanceof Error ? e.message : "Couldn't reschedule this lesson.");
        return;
      }
    } else {
      setLegacyLessons((prev) => prev.map((l) => (l.id === id ? { ...l, date: newDate, time: newTime, status: "Rescheduled" } : l)));
    }
    setReschedulingLessonId(null);
    setManageLessonId(null);
  }

  function buildManageData(lesson: StudentLesson): ManageLessonData {
    return {
      sheetTitle: "Manage lesson",
      title: lesson.subject,
      subtitle: lesson.tutor,
      image: lesson.tutorImage,
      statusLabel: lesson.status,
      bookingRef: isValidBookingReference(lesson.id) ? lesson.id : buildBookingReference("private", lesson.id),
      infoRows: [
        { label: "Lesson date", value: lesson.date },
        { label: "Time", value: lesson.time },
        { label: "Duration", value: lesson.duration },
        { label: "Lesson type", value: `${lesson.type} lesson` },
        { label: "Mode", value: lesson.mode },
        { label: "Payment", value: lesson.payment },
      ],
    };
  }

  function buildManageActions(lesson: StudentLesson): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];
    // Real time-derived check — a lesson whose scheduled time has already
    // passed must never still offer Join/Reschedule/Cancel just because its
    // stored `status` field was never rewritten (see isNotYetOver's own
    // doc comment for the exact bug this prevents).
    const stillUpcoming = lesson.status !== "Cancelled" && isNotYetOver(lesson, nowMs);
    if (stillUpcoming && lesson.type === "Private") {
      actions.push({
        key: "join",
        label: "Join classroom",
        icon: Video,
        variant: "primary",
        onClick: () => {
          setManageLessonId(null);
          router.push(`/student-dashboard/classroom/private/${lesson.id}`);
        },
      });
    }
    actions.push({ key: "calendar", label: "View on calendar", icon: Calendar, onClick: () => router.push("/student-dashboard/study-planner") });
    actions.push({ key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageLessonId(null); messageTutor(lesson.tutor); } });
    if (lesson.homework || lesson.notes || lesson.feedback) {
      actions.push({ key: "details", label: "View lesson details", icon: FileText, onClick: () => { setManageLessonId(null); setViewingLesson(lesson); } });
    }
    if (stillUpcoming) {
      // A real Group enrollment's schedule is teacher-set for the whole
      // cohort, not something one student can move — reschedule stays
      // Private-only (and legacy seed rows, for the pre-existing demo).
      const isRealGroupEnrollment = lesson.type === "Group" && getGroupClassEnrollments().some((e) => e.id === lesson.id);
      if (!isRealGroupEnrollment) {
        actions.push({ key: "reschedule", label: "Reschedule lesson", icon: RefreshCcw, onClick: () => { setManageLessonId(null); setReschedulingLessonId(lesson.id); } });
      }
      actions.push({ key: "cancel", label: "Cancel booking", icon: XCircle, variant: "danger", onClick: () => { setManageLessonId(null); setCancelingLessonId(lesson.id); } });
    }
    return actions;
  }

  // A Discovery Session's kebab has its own builder, mirroring the private/
  // group one above — DiscoverySession is a completely different shape
  // (discovery-sessions-data.ts, not StudentLesson), so it gets its own
  // ManageLessonSheet instance rather than being force-fit into the shared
  // lessons array. Fixes the previous behavior, where this kebab skipped a
  // menu entirely and jumped straight to Messages.
  function buildDiscoveryManageData(session: (typeof discoverySessions)[number]): ManageLessonData {
    return {
      sheetTitle: "Manage Discovery Session",
      title: "Discovery Session",
      subtitle: session.tutor,
      image: session.tutorImage,
      statusLabel: session.status,
      bookingRef: session.bookingReference,
      infoRows: [
        { label: "Date", value: session.date },
        { label: "Time", value: session.time },
        { label: "Duration", value: `${session.durationMins} mins` },
        { label: "Subject", value: session.subject },
      ],
    };
  }

  function buildDiscoveryManageActions(session: (typeof discoverySessions)[number]): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];
    if (canEnterClassroom(getClassEntryState({ ...getDiscoverySessionTimeRange(session), role: "student", nowMs }))) {
      actions.push({
        key: "join",
        label: "Join classroom",
        icon: Video,
        variant: "primary",
        onClick: () => {
          setManageDiscoveryId(null);
          router.push(`/student-dashboard/discovery-sessions/${session.id}/classroom`);
        },
      });
    }
    actions.push({ key: "view", label: "View class details", icon: FileText, onClick: () => { setManageDiscoveryId(null); router.push(`/student-dashboard/lessons/class/${session.id}`); } });
    actions.push({ key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageDiscoveryId(null); messageTutor(session.tutor); } });
    return actions;
  }

  // Legacy demo "Active Classes" group rows use their own static seed shape
  // (StudentGroupClass, not StudentLesson) — a real contextual menu for them
  // still needs its own small builder rather than defaulting to messaging.
  function buildGroupClassManageData(cls: (typeof studentGroupClasses)[number]): ManageLessonData {
    return {
      sheetTitle: "Manage class",
      title: cls.title,
      subtitle: cls.tutor,
      image: avatarByTutor[cls.tutor] ?? "/teacher-1.jpg.png",
      statusLabel: "Active",
      bookingRef: isValidBookingReference(cls.id) ? cls.id : buildBookingReference("group", cls.id),
      infoRows: [
        { label: "Next class", value: cls.nextClass },
        { label: "Schedule", value: cls.schedule },
        { label: "Students", value: `${cls.seatsFilled} / ${cls.seatsTotal}` },
      ],
    };
  }

  function buildGroupClassManageActions(cls: (typeof studentGroupClasses)[number]): ManageLessonAction[] {
    return [
      { key: "view", label: "View class", icon: FileText, onClick: () => { setManageGroupId(null); router.push(`/student-dashboard/group-classes/${cls.id}`); } },
      { key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageGroupId(null); messageTutor(cls.tutor); } },
    ];
  }

  const manageLesson = lessons.find((l) => l.id === manageLessonId) ?? null;
  const manageDiscovery = discoverySessions.find((d) => d.id === manageDiscoveryId) ?? null;
  const manageGroup = studentGroupClasses.find((c) => c.id === manageGroupId) ?? null;
  const cancelingLesson = lessons.find((l) => l.id === cancelingLessonId) ?? null;
  const reschedulingLesson = lessons.find((l) => l.id === reschedulingLessonId) ?? null;

  // Real time-derived check (isNotYetOver, class-list-helpers.ts) — never
  // the raw stored `status` field alone, which is never rewritten once real
  // time moves past it (the exact bug that let a stale seed lesson keep
  // showing as "Upcoming" long after its scheduled time had passed).
  const upcomingPrivate = lessons.find((l) => l.type === "Private" && l.status !== "Cancelled" && isNotYetOver(l, nowMs));
  const upcomingGroup = lessons.find((l) => l.type === "Group" && l.status !== "Cancelled" && isNotYetOver(l, nowMs));
  const cancelledLessons = lessons.filter((l) => l.status === "Cancelled");
  const upcomingDiscovery = discoverySessions.find((d) => {
    if (d.student !== DISCOVERY_STUDENT_NAME || d.status === "Cancelled") return false;
    const status = classifyClassStatus({ isCancelled: false, ...getDiscoverySessionTimeRange(d), nowMs });
    return status === "Upcoming" || status === "Live";
  });

  const activePrivate = useMemo(() => buildActivePrivateArrangements(lessons, nowMs), [lessons, nowMs]);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">All your classes, sessions and learning activities in one place.</p>
      </div>

      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => scrollToTab(tab)}
            className={cn(
              "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
              activeTab === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {/* Upcoming */}
          <section id="myclasses-upcoming">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">Upcoming</h2>
              <Link href="/student-dashboard/lessons/upcoming" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
                View all upcoming <ChevronRight className="size-3.5" />
              </Link>
            </div>
            {upcomingPrivate || upcomingGroup || upcomingDiscovery ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingPrivate && (() => {
                  const { startMs, endMs } = getPrivateLessonTimeRange(upcomingPrivate);
                  const entryState = getClassEntryState({ startMs, endMs, role: "student", nowMs });
                  const paid = hasSessionAccess(upcomingPrivate.bookingId ?? upcomingPrivate.id, upcomingPrivate.id, dashboardStudent.name);
                  return (
                    <UpcomingCard
                      kind="Private Lesson"
                      title={upcomingPrivate.subject}
                      subtitle={`with ${upcomingPrivate.tutor}`}
                      lines={[`${upcomingPrivate.date} · ${upcomingPrivate.time}`, upcomingPrivate.mode]}
                      avatarSrc={upcomingPrivate.tutorImage}
                      primaryLabel="Enter Classroom"
                      primaryHref={`/student-dashboard/classroom/private/${upcomingPrivate.id}`}
                      primaryDisabled={!canEnterClassroom(entryState) || !paid}
                      disabledHint={
                        !paid
                          ? "Payment required to join this session"
                          : entryState === "too-early"
                            ? entryOpensHint(startMs - STUDENT_ENTRY_WINDOW_MS, nowMs)
                            : entryState === "ended"
                              ? "This lesson has ended"
                              : undefined
                      }
                      onKebab={() => setManageLessonId(upcomingPrivate.id)}
                    />
                  );
                })()}
                {upcomingGroup && (
                  <UpcomingCard
                    kind="Group Class"
                    title={upcomingGroup.subject}
                    subtitle={`with ${upcomingGroup.tutor}`}
                    lines={[`${upcomingGroup.date} · ${upcomingGroup.time}`]}
                    primaryLabel="View Class"
                    primaryHref={
                      // A real enrollment's id already IS the group class detail
                      // page's id (see student-group-class-detail-client.tsx's
                      // real-enrollment fallback) — only legacy StudentLesson
                      // rows (sl-*) need the tutor-name lookup to find their
                      // matching studentGroupClasses id.
                      isValidBookingReference(upcomingGroup.id)
                        ? `/student-dashboard/group-classes/${upcomingGroup.id}`
                        : studentGroupClasses.find((c) => c.tutor === upcomingGroup.tutor)
                          ? `/student-dashboard/group-classes/${studentGroupClasses.find((c) => c.tutor === upcomingGroup.tutor)!.id}`
                          : "/student-dashboard/group-classes"
                    }
                    onKebab={() => setManageLessonId(upcomingGroup.id)}
                  />
                )}
                {upcomingDiscovery && (() => {
                  const { startMs, endMs } = getDiscoverySessionTimeRange(upcomingDiscovery);
                  const entryState = getClassEntryState({ startMs, endMs, role: "student", nowMs });
                  return (
                    <UpcomingCard
                      kind="Discovery Session"
                      title="Discovery Session"
                      subtitle={`with ${upcomingDiscovery.tutor}`}
                      lines={[`${upcomingDiscovery.date} · ${upcomingDiscovery.time}`, `${upcomingDiscovery.durationMins} min · Online`]}
                      avatarSrc={upcomingDiscovery.tutorImage}
                      primaryLabel="Enter Classroom"
                      primaryHref={`/student-dashboard/discovery-sessions/${upcomingDiscovery.id}/classroom`}
                      primaryDisabled={!canEnterClassroom(entryState)}
                      disabledHint={
                        entryState === "too-early"
                          ? entryOpensHint(startMs - STUDENT_ENTRY_WINDOW_MS, nowMs)
                          : entryState === "ended"
                            ? "This session has ended"
                            : undefined
                      }
                      onKebab={() => setManageDiscoveryId(upcomingDiscovery.id)}
                    />
                  );
                })()}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">Nothing scheduled yet.</p>
            )}
          </section>

          {/* Active */}
          <section id="myclasses-active" className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">Active Classes</h2>
              <Link href="/student-dashboard/lessons/active" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
                View all active <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {activePrivate.map((arr) => (
                <ActiveRow
                  key={arr.key}
                  avatarSrc={arr.tutorImage}
                  title={arr.subject}
                  badge="Private"
                  tutor={arr.tutor}
                  scheduleLine={`${arr.sessionsPerWeek} sessions/week · ${arr.days}`}
                  extraLine={arr.time}
                  nextLabel="Next lesson"
                  nextValue={arr.nextLabel}
                  href={`/student-dashboard/lessons/class/${arr.nextLesson.id}`}
                  onKebab={() => setManageLessonId(arr.nextLesson.id)}
                />
              ))}
              {studentGroupClasses.map((cls) => (
                <ActiveRow
                  key={cls.id}
                  avatarSrc={avatarByTutor[cls.tutor] ?? "/teacher-1.jpg.png"}
                  title={cls.title}
                  badge="Group Class"
                  tutor={cls.tutor}
                  scheduleLine={cls.schedule}
                  extraLine={`${cls.seatsFilled} / ${cls.seatsTotal} students`}
                  nextLabel="Next class"
                  nextValue={cls.nextClass}
                  href={`/student-dashboard/group-classes/${cls.id}`}
                  onKebab={() => setManageGroupId(cls.id)}
                />
              ))}
              {activePrivate.length === 0 && studentGroupClasses.length === 0 && (
                <p className="rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">No active classes right now.</p>
              )}
            </div>
          </section>

          {/* Completed */}
          <section id="myclasses-completed" className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">Completed</h2>
              <Link href="/student-dashboard/lessons/completed" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
                View all completed <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-0 divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
              {myConfirmations.map((l) => {
                const status = completionStatus(l);
                return (
                  <div key={l.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-full">
                      <Image src={avatarByTutor[l.tutor] ?? "/teacher-1.jpg.png"} alt={l.tutor} fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
                      <p className="text-xs text-ensena-muted">with {l.tutor} · {l.type === "Private" ? "Private Lesson" : "Group Class"}</p>
                    </div>
                    <p className="text-xs text-ensena-muted">{new Date(l.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(l.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.tint)}>{status.label}</span>
                    <div className="flex items-center gap-1.5">
                      {status.action === "confirm" ? (
                        <Button onClick={() => openConfirm(l.id)} className="h-9 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white">
                          Confirm Lesson
                        </Button>
                      ) : (
                        <Link href={`/student-dashboard/lessons/class/${l.id}`} className="rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                          View Details
                        </Link>
                      )}
                      <button type="button" aria-label="More options" onClick={() => messageTutor(l.tutor)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {myConfirmations.length === 0 && <p className="p-8 text-center text-sm text-ensena-muted">No completed classes yet.</p>}
            </div>
            {myConfirmations.length > 0 && (
              <p className="mt-3 text-center text-sm text-ensena-muted">
                Showing {myConfirmations.length} of {myConfirmations.length} completed classes
              </p>
            )}
          </section>

          {/* Cancelled — a cancelled booking is never deleted (see
              booking-lifecycle-store.ts), so this reads straight off the
              same `lessons` list every other tab uses, filtered by real
              status, not a separate/disconnected data source. */}
          <section id="myclasses-cancelled" className="mt-8">
            <h2 className="font-heading text-lg font-semibold text-ensena-ink">Cancelled</h2>
            <div className="mt-4 flex flex-col gap-3">
              {cancelledLessons.map((l) => {
                const details = getCancellationDetails(l.id);
                return (
                  <div key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-full grayscale">
                      <Image src={avatarByTutor[l.tutor] ?? "/teacher-1.jpg.png"} alt={l.tutor} fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
                      <p className="text-xs text-ensena-muted">
                        with {l.tutor} · {l.date} · {l.time}
                      </p>
                      {details && (
                        <p className="mt-0.5 text-xs text-ensena-muted">
                          Cancelled by {details.cancelledByName === dashboardStudent.name ? "you" : details.cancelledByName}
                          {details.refundAmount > 0 && <> · Refund {formatNaira(details.refundAmount)}</>}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                    <Link href={`/student-dashboard/lessons/class/${l.id}`} className="rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      View Details
                    </Link>
                  </div>
                );
              })}
              {cancelledLessons.length === 0 && (
                <p className="rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">You don&apos;t have any cancelled classes.</p>
              )}
            </div>
          </section>

          {/* Study Planner (inline; desktop also gets a condensed copy in the rail) */}
          <section id="myclasses-study-planner" className="mt-8">
            <StudyChecklist tasks={studyTasks} onToggle={toggleStudyTask} />
          </section>
        </div>

        <div className="hidden w-80 shrink-0 flex-col gap-5 lg:flex">
          <MiniCalendar />

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Today&apos;s Classes</h2>
              <span className="text-xs text-ensena-muted">{studentTodaySchedule.length} classes today</span>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {studentTodaySchedule.map((item) => (
                <li key={`${item.time}-${item.title}`} className="flex items-start gap-2.5">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.type === "Private" ? "bg-ensena-primary" : item.type === "Group" ? "bg-[#2F9BE0]" : "bg-ensena-muted")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ensena-ink">{item.title}</p>
                    <p className="text-xs text-ensena-muted">{item.type === "Reminder" ? "Reminder" : `${item.person ? item.person + " · " : ""}${item.type === "Private" ? "Private Lesson" : "Group Class"}`}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-ensena-muted">{item.time}</span>
                </li>
              ))}
            </ul>
            <Link href="/student-dashboard/study-planner" className="mt-3 flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
              View full schedule <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <StudyChecklist tasks={studyTasks} onToggle={toggleStudyTask} compact />
        </div>
      </div>

      {/* Private lesson details */}
      <Modal open={!!viewingLesson} onClose={() => setViewingLesson(null)} title="Lesson Details">
        {viewingLesson && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full">
                <Image src={viewingLesson.tutorImage} alt={viewingLesson.tutor} fill sizes="44px" className="object-cover" />
              </div>
              <div>
                <p className="font-semibold text-ensena-ink">{viewingLesson.tutor}</p>
                <p className="text-xs text-ensena-muted">{viewingLesson.subject}</p>
              </div>
            </div>
            <div className="flex justify-between border-t border-ensena-border pt-2"><span className="text-ensena-muted">Date</span><span className="font-medium text-ensena-ink">{viewingLesson.date}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Time</span><span className="font-medium text-ensena-ink">{viewingLesson.time} · {viewingLesson.duration}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Mode</span><span className="font-medium text-ensena-ink">{viewingLesson.mode}</span></div>
            {viewingLesson.meetingLink && (
              <div className="flex justify-between"><span className="text-ensena-muted">Meeting Link</span><span className="font-medium text-ensena-primary">{viewingLesson.meetingLink}</span></div>
            )}
            {viewingLesson.attendance && (
              <div className="flex justify-between"><span className="text-ensena-muted">Attendance</span><span className="font-medium text-ensena-ink">{viewingLesson.attendance}</span></div>
            )}
            <div className="flex justify-between"><span className="text-ensena-muted">Payment</span><span className="font-medium text-ensena-ink">{viewingLesson.payment}</span></div>
            {viewingLesson.homework && (
              <div className="rounded-xl border border-ensena-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ensena-ink"><FileText className="size-3.5 text-ensena-primary" /> Homework</p>
                <p className="mt-1 text-ensena-muted">{viewingLesson.homework}</p>
              </div>
            )}
            {viewingLesson.notes && (
              <div className="rounded-xl bg-ensena-bg-soft p-3">
                <p className="text-xs font-semibold text-ensena-ink">Lesson Notes</p>
                <p className="mt-1 text-ensena-muted">{viewingLesson.notes}</p>
              </div>
            )}
            {viewingLesson.feedback && (
              <div className="rounded-xl bg-ensena-success/10 p-3">
                <p className="text-xs font-semibold text-ensena-ink">Tutor Feedback</p>
                <p className="mt-1 text-ensena-ink">{viewingLesson.feedback}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ManageLessonSheet
        open={manageLesson !== null}
        data={manageLesson ? buildManageData(manageLesson) : null}
        actions={manageLesson ? buildManageActions(manageLesson) : []}
        onClose={() => setManageLessonId(null)}
      />

      <ManageLessonSheet
        open={manageGroup !== null}
        data={manageGroup ? buildGroupClassManageData(manageGroup) : null}
        actions={manageGroup ? buildGroupClassManageActions(manageGroup) : []}
        onClose={() => setManageGroupId(null)}
      />

      <ManageLessonSheet
        open={manageDiscovery !== null}
        data={manageDiscovery ? buildDiscoveryManageData(manageDiscovery) : null}
        actions={manageDiscovery ? buildDiscoveryManageActions(manageDiscovery) : []}
        onClose={() => setManageDiscoveryId(null)}
      />

      <CancelLessonModal
        open={cancelingLesson !== null}
        title="Cancel booking?"
        summary={cancelingLesson ? `${cancelingLesson.date} · ${cancelingLesson.time}: ${cancelingLesson.subject} with ${cancelingLesson.tutor}` : ""}
        policyLabel={cancelingLesson ? cancelPreview(cancelingLesson).policyApplied : ""}
        refundAmount={cancelingLesson ? cancelPreview(cancelingLesson).refundAmount : 0}
        cancellationFee={cancelingLesson ? cancelPreview(cancelingLesson).cancellationFee : 0}
        onKeep={() => setCancelingLessonId(null)}
        onConfirm={(reason, notes) => cancelingLessonId && cancelLesson(cancelingLessonId, reason, notes)}
      />

      <RescheduleLessonModal
        open={reschedulingLesson !== null}
        currentDate={reschedulingLesson?.date ?? ""}
        currentTime={reschedulingLesson?.time ?? ""}
        onClose={() => setReschedulingLessonId(null)}
        onConfirm={(newDate, newTime) => reschedulingLessonId && rescheduleLesson(reschedulingLessonId, newDate, newTime)}
      />

      {escrowModals}

    </div>
  );
}
