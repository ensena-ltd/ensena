"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  Star,
  Trash2,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { useTodayISO } from "@/hooks/use-today-iso";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useBlockedTimes } from "@/hooks/use-blocked-times";
import { useReviews } from "@/hooks/use-reviews";
import { cancelBooking, rescheduleBooking, type CancellationReason } from "@/lib/booking-lifecycle-store";
import { canEnterClassroom, getClassEntryState } from "@/lib/class-entry-access";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { submitReview } from "@/lib/reviews-store";
import { formatLessonDateLabel } from "@/lib/tutor-availability";
import { addBlockedTimes, removeBlockedTime, updateBlockedTime, type BlockedTimeEntry } from "@/lib/tutor-availability-store";
import { to12HourDisplay } from "@/lib/time-format";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import {
  buildCalendarEvents,
  calendarDayHours,
  calendarTypeLabels,
  calendarTypeStyles,
  dashboardTutor,
  findStudentIdByName,
  type CalendarEventType,
  type CalendarPageEvent,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

type View = "week" | "month";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROW_HEIGHT = 64; // px per hour, desktop week grid — enough headroom for a 25-45min event's title+meta+time to fit without clipping

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function formatEventTime(startHour: number, endHour: number): string {
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const wholeHour = Math.floor(h) % 12 === 0 ? 12 : Math.floor(h) % 12;
    const minutes = Math.round((h % 1) * 60);
    return minutes === 0 ? `${wholeHour}:00 ${period}` : `${wholeHour}:${String(minutes).padStart(2, "0")} ${period}`;
  };
  return `${fmt(startHour)} – ${fmt(endHour)}`;
}

// Real Date object for an event's start, from its ISO date + numeric hour —
// used for "is it time to enter yet" gating against real wall-clock time.
// The calendar always displays real (or reanchored-to-real) dates, so this
// intentionally uses Date.now(), not any subsystem's own simulated clock.
function eventStartDate(e: CalendarPageEvent): Date {
  const d = fromISO(e.date);
  const wholeHour = Math.floor(e.startHour);
  const minutes = Math.round((e.startHour % 1) * 60);
  d.setHours(wholeHour, minutes, 0, 0);
  return d;
}

// Two events overlapping in time on the same day must never fully occlude
// one another — that would make the one underneath permanently unclickable.
// Assigns each event a column index + total column count within its
// overlapping cluster so the week view can lay them out side-by-side
// instead of stacking them at identical coordinates.
function layoutOverlaps(events: CalendarPageEvent[]): Map<string, { col: number; cols: number }> {
  const sorted = [...events].sort((a, b) => a.startHour - b.startHour);
  const layout = new Map<string, { col: number; cols: number }>();
  let cluster: CalendarPageEvent[] = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const columns: number[] = []; // end hour of the last event placed in each column
    const colOf = new Map<string, number>();
    for (const e of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c] <= e.startHour) {
          columns[c] = e.endHour;
          colOf.set(e.id, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push(e.endHour);
        colOf.set(e.id, columns.length - 1);
      }
    }
    const cols = columns.length;
    for (const e of cluster) layout.set(e.id, { col: colOf.get(e.id) ?? 0, cols });
    cluster = [];
  }

  for (const e of sorted) {
    if (cluster.length > 0 && e.startHour >= clusterEnd) flushCluster();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd === -Infinity ? e.endHour : clusterEnd, e.endHour);
  }
  flushCluster();

  return layout;
}

// Blocked-time entries are the tutor marking themselves unavailable, not a
// second class competing for the same slot — real double-booking only ever
// exists among the kinds that actually represent a class/session.
const REAL_EVENT_TYPES = new Set<CalendarEventType>(["private", "group", "discovery", "pending", "completed"]);

// Genuinely overlapping (not just same-day) real events, on the same tutor's
// calendar — this is a real scheduling conflict, not a cosmetic crowding
// issue, so it's surfaced rather than just laid out side-by-side and left
// looking like two ordinary back-to-back classes.
function findConflictIds(dayEvents: CalendarPageEvent[]): Set<string> {
  const real = dayEvents.filter((e) => REAL_EVENT_TYPES.has(e.type));
  const conflicted = new Set<string>();
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      const a = real[i];
      const b = real[j];
      if (a.startHour < b.endHour && b.startHour < a.endHour) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}

function eventMeta(e: CalendarPageEvent): string {
  if (e.type === "group") return e.seats ?? "Group Class";
  if (e.type === "discovery") return e.student;
  return e.student ? `${e.student} · Private Lesson` : "Private Lesson";
}

const MIN_HOUR = calendarDayHours[0];
const MAX_HOUR = calendarDayHours[calendarDayHours.length - 1] + 1;

export function CalendarClient() {
  const router = useRouter();
  const todayISO = useTodayISO();
  const privateLessons = usePrivateLessons();
  const blockedTimes = useBlockedTimes();
  const [view, setView] = useState<View>("week");
  // Initialized to the SSR-safe placeholder (matches server render exactly);
  // the effect below jumps everything to the real date once todayISO
  // resolves client-side, same pattern as useSavedTutor.
  const [currentDate, setCurrentDate] = useState(todayISO);
  const [selectedDayISO, setSelectedDayISO] = useState(todayISO);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const realEvents = useMemo(() => buildCalendarEvents(todayISO, privateLessons), [todayISO, privateLessons]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState(todayISO);
  const [blockEndDate, setBlockEndDate] = useState(todayISO);
  const [blockMultipleDays, setBlockMultipleDays] = useState(false);
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [blockReason, setBlockReason] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<CalendarPageEvent | null>(null);
  const [reschedulingEvent, setReschedulingEvent] = useState<CalendarPageEvent | null>(null);
  const [cancelingEvent, setCancelingEvent] = useState<CalendarPageEvent | null>(null);
  const [reviewingEvent, setReviewingEvent] = useState<CalendarPageEvent | null>(null);
  const allReviews = useReviews();
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentDate(todayISO);
    setSelectedDayISO(todayISO);
    setBlockDate(todayISO);
    setBlockEndDate(todayISO);
  }, [todayISO]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const blockedAsEvents: CalendarPageEvent[] = useMemo(
    () =>
      blockedTimes.map((b) => ({
        id: `blocked-${b.id}`,
        date: b.date,
        startHour: b.allDay ? 0 : b.startHour,
        endHour: b.allDay ? 24 : b.endHour,
        title: b.reason ? `Unavailable · ${b.reason}` : "Unavailable",
        student: "",
        type: "blocked" as CalendarEventType,
        mode: "Online" as const,
        allDay: b.allDay,
        sourceType: "blocked" as const,
        sourceId: b.id,
        status: "Blocked",
        reason: b.reason,
      })),
    [blockedTimes]
  );

  const allEvents = useMemo(() => [...realEvents, ...blockedAsEvents], [realEvents, blockedAsEvents]);

  const activeDate = useMemo(() => fromISO(currentDate), [currentDate]);

  function shift(amount: number) {
    const d = new Date(activeDate);
    if (view === "week") d.setDate(d.getDate() + amount * 7);
    else d.setMonth(d.getMonth() + amount);
    setCurrentDate(toISO(d));
  }

  function resetBlockForm() {
    setEditingBlockId(null);
    setBlockDate(todayISO);
    setBlockEndDate(todayISO);
    setBlockMultipleDays(false);
    setBlockAllDay(false);
    setBlockStart("09:00");
    setBlockEnd("12:00");
    setBlockReason("");
  }

  function openEditBlock(entry: BlockedTimeEntry) {
    setEditingBlockId(entry.id);
    setBlockDate(entry.date);
    setBlockEndDate(entry.date);
    setBlockMultipleDays(false);
    setBlockAllDay(entry.allDay);
    setBlockStart(`${String(Math.floor(entry.startHour)).padStart(2, "0")}:${String(Math.round((entry.startHour % 1) * 60)).padStart(2, "0")}`);
    setBlockEnd(`${String(Math.floor(entry.endHour)).padStart(2, "0")}:${String(Math.round((entry.endHour % 1) * 60)).padStart(2, "0")}`);
    setBlockReason(entry.reason ?? "");
    setSelectedEvent(null);
    setBlockModalOpen(true);
  }

  function handleBlockSubmit() {
    const [sh, sm] = blockStart.split(":").map(Number);
    const [eh, em] = blockEnd.split(":").map(Number);

    if (editingBlockId) {
      updateBlockedTime(editingBlockId, {
        date: blockDate,
        startHour: blockAllDay ? 0 : sh + sm / 60,
        endHour: blockAllDay ? 24 : eh + em / 60,
        allDay: blockAllDay,
        reason: blockReason || undefined,
      });
      flash("Blocked time updated.");
      setBlockModalOpen(false);
      resetBlockForm();
      return;
    }

    const rangeEnd = blockMultipleDays ? blockEndDate : blockDate;
    const start = fromISO(blockDate);
    const end = fromISO(rangeEnd);
    const days: string[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(toISO(d));
    }
    if (days.length === 0) days.push(blockDate);

    const newEntries: BlockedTimeEntry[] = days.map((dISO, i) => ({
      id: `blocked-${Date.now()}-${i}`,
      date: dISO,
      startHour: blockAllDay ? 0 : sh + sm / 60,
      endHour: blockAllDay ? 24 : eh + em / 60,
      allDay: blockAllDay,
      reason: blockReason || undefined,
    }));

    addBlockedTimes(newEntries);
    flash(blockMultipleDays ? "Time blocked across the selected days." : "Time blocked.");
    setBlockModalOpen(false);
    resetBlockForm();
  }

  function eventsOn(dateISO: string): CalendarPageEvent[] {
    return allEvents.filter((e) => e.date === dateISO).sort((a, b) => a.startHour - b.startHour);
  }

  const weekStart = startOfWeek(activeDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Real scheduling conflicts for the visible week — flagged rather than
  // silently laid out side-by-side, since two classes at the same time is a
  // data problem to resolve (reschedule one of them), not a display problem.
  const weekConflictCount = weekDates.reduce((sum, d) => sum + findConflictIds(eventsOn(toISO(d))).size, 0);

  const monthStart = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
  const monthGridStart = startOfWeek(monthStart);
  const monthCells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(monthGridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Upcoming Classes (right column + mobile "Upcoming" section) — real
  // events grouped by day, next 4 days from today, excluding blocked time.
  const upcomingByDay = useMemo(() => {
    const days: { dateISO: string; label: string; items: CalendarPageEvent[] }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(fromISO(todayISO));
      d.setDate(d.getDate() + i);
      const dISO = toISO(d);
      const items = eventsOn(dISO).filter((e) => e.type !== "blocked");
      if (items.length === 0) continue;
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      days.push({ dateISO: dISO, label, items });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents]);

  const selectedDayEvents = eventsOn(selectedDayISO);
  const selectedDayConflictIds = findConflictIds(selectedDayEvents);
  const selectedDate = fromISO(selectedDayISO);
  const selectedWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek(selectedDate));
    d.setDate(d.getDate() + i);
    return d;
  });

  // ---- Event details + actions (the "three-dot menu") — one shared sheet
  // for every event type, matching the exact reusable pattern
  // discovery-sessions-client.tsx already established, rather than a second
  // bespoke dropdown per type. ----
  function messageStudent(name: string) {
    setSelectedEvent(null);
    router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(name)}`);
  }

  function manageDataFor(e: CalendarPageEvent): ManageLessonData {
    if (e.sourceType === "blocked") {
      return {
        sheetTitle: "Blocked Time",
        title: e.title,
        statusLabel: "Blocked",
        bookingRef: "—",
        infoRows: [
          { label: "Date", value: fromISO(e.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
          { label: "Time", value: e.allDay ? "All day" : formatEventTime(e.startHour, e.endHour) },
          ...(e.reason ? [{ label: "Reason", value: e.reason }] : []),
        ],
      };
    }
    if (e.sourceType === "group") {
      return {
        sheetTitle: "Manage class",
        title: e.title,
        statusLabel: e.status,
        bookingRef: e.bookingReference ?? "—",
        infoRows: [
          { label: "Date", value: fromISO(e.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
          { label: "Time", value: formatEventTime(e.startHour, e.endHour) },
          { label: "Mode", value: e.mode },
          { label: "Students", value: e.seats ?? "—" },
        ],
      };
    }
    if (e.sourceType === "discovery") {
      return {
        sheetTitle: "Manage discovery session",
        title: e.title,
        subtitle: e.student,
        statusLabel: e.status,
        bookingRef: e.bookingReference ?? "—",
        infoRows: [
          { label: "Date", value: fromISO(e.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
          { label: "Time", value: formatEventTime(e.startHour, e.endHour) },
          { label: "Duration", value: `${Math.round((e.endHour - e.startHour) * 60)} minutes` },
        ],
      };
    }
    return {
      sheetTitle: "Manage lesson",
      title: e.title,
      subtitle: e.student,
      statusLabel: e.status,
      bookingRef: e.bookingReference ?? "—",
      infoRows: [
        { label: "Date", value: fromISO(e.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
        { label: "Time", value: formatEventTime(e.startHour, e.endHour) },
        { label: "Mode", value: e.mode },
      ],
    };
  }

  function actionsFor(e: CalendarPageEvent): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];

    if (e.sourceType === "blocked") {
      const entry = blockedTimes.find((b) => b.id === e.sourceId);
      actions.push({ key: "edit", label: "Edit Blocked Time", icon: Pencil, onClick: () => entry && openEditBlock(entry) });
      actions.push({ key: "remove", label: "Remove Blocked Time", icon: Trash2, variant: "danger", onClick: () => { setSelectedEvent(null); setRemovingBlockId(e.sourceId); } });
      return actions;
    }

    if (e.sourceType === "private") {
      const studentId = findStudentIdByName(e.student);
      if (e.status === "Upcoming" || e.status === "Pending") {
        const startMs = eventStartDate(e).getTime();
        const endMs = startMs + (e.endHour - e.startHour) * 3_600_000;
        const canEnter = e.status === "Upcoming" && canEnterClassroom(getClassEntryState({ startMs, endMs, role: "tutor", nowMs }));
        if (canEnter) {
          actions.push({ key: "enter", label: "Enter Lesson", icon: Video, variant: "primary", onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/classroom/private/${e.sourceId}`); } });
        }
        actions.push({ key: "view", label: "View Lesson", icon: Eye, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/private-lessons?tab=Lessons"); } });
        if (studentId) actions.push({ key: "student", label: "View Student", icon: User, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/students/${studentId}`); } });
        actions.push({ key: "message", label: "Message Student", icon: MessageSquare, onClick: () => messageStudent(e.student) });
        actions.push({ key: "reschedule", label: "Reschedule", icon: RefreshCcw, onClick: () => { setSelectedEvent(null); setReschedulingEvent(e); } });
        actions.push({ key: "cancel", label: e.status === "Pending" ? "Cancel Request" : "Cancel Lesson", icon: XCircle, variant: "danger", onClick: () => { setSelectedEvent(null); setCancelingEvent(e); } });
        return actions;
      }
      if (e.status === "Completed") {
        actions.push({ key: "view", label: "View Lesson", icon: Eye, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/private-lessons?tab=Lessons"); } });
        if (studentId) actions.push({ key: "student", label: "View Student", icon: User, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/students/${studentId}`); } });
        const alreadyReviewed = allReviews.some((r) => r.direction === "tutor-to-student" && r.bookingId === e.sourceId && r.reviewerName === dashboardTutor.name);
        if (!alreadyReviewed) {
          actions.push({ key: "review", label: "Leave a Review", icon: Star, onClick: () => { setSelectedEvent(null); setReviewingEvent(e); } });
        }
        return actions;
      }
      // Cancelled
      actions.push({ key: "view", label: "View Booking", icon: Eye, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/private-lessons?tab=Lessons"); } });
      if (studentId) actions.push({ key: "student", label: "View Student", icon: User, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/students/${studentId}`); } });
      return actions;
    }

    if (e.sourceType === "group") {
      const slug = e.groupSlug ?? "";
      if (e.status === "Live") {
        actions.push({ key: "enter", label: "Enter Class", icon: Video, variant: "primary", onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/classroom/group/${e.sourceId}`); } });
      }
      actions.push({ key: "view", label: "View Class", icon: Eye, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/group-classes/${slug}`); } });
      actions.push({ key: "students", label: "View Students", icon: Users, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/group-classes/${slug}`); } });
      actions.push({ key: "manage", label: "Manage Class", icon: Settings, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/group-classes/${slug}`); } });
      return actions;
    }

    // Discovery — reschedule/cancel reuse the existing standalone Discovery
    // Sessions page rather than a second mutation path, per "don't create
    // duplicate flows"; everything else routes straight there or to the
    // real classroom/messages routes.
    if (e.status === "Upcoming") {
      actions.push({ key: "enter", label: "Enter Session", icon: Video, variant: "primary", onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/classroom/discovery/${e.sourceId}`); } });
      actions.push({ key: "view", label: "View Session", icon: Eye, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/discovery-sessions"); } });
      const studentId = findStudentIdByName(e.student);
      if (studentId) actions.push({ key: "student", label: "View Student", icon: User, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/students/${studentId}`); } });
      actions.push({ key: "message", label: "Message Student", icon: MessageSquare, onClick: () => messageStudent(e.student) });
      actions.push({ key: "reschedule", label: "Reschedule", icon: RefreshCcw, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/discovery-sessions"); } });
      actions.push({ key: "cancel", label: "Cancel", icon: XCircle, variant: "danger", onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/discovery-sessions"); } });
      return actions;
    }
    actions.push({ key: "view", label: "View Session", icon: Eye, onClick: () => { setSelectedEvent(null); router.push("/tutor-dashboard/discovery-sessions"); } });
    const studentId = findStudentIdByName(e.student);
    if (studentId) actions.push({ key: "student", label: "View Student", icon: User, onClick: () => { setSelectedEvent(null); router.push(`/tutor-dashboard/students/${studentId}`); } });
    return actions;
  }

  function confirmReschedule(newDate: string, newTime: string) {
    if (!reschedulingEvent) return;
    const nice = formatLessonDateLabel(new Date(`${newDate}T00:00:00`));
    const niceTime = to12HourDisplay(newTime);
    try {
      rescheduleBooking({
        bookingId: reschedulingEvent.sourceId,
        kind: "Private",
        requestedBy: "Tutor",
        requestedByName: dashboardTutor.name,
        otherPartyName: reschedulingEvent.student,
        subject: reschedulingEvent.title,
        fromDate: formatLessonDateLabel(fromISO(reschedulingEvent.date)),
        fromTime: formatEventTime(reschedulingEvent.startHour, reschedulingEvent.endHour).split(" – ")[0],
        toDate: nice,
        toTime: niceTime,
        studentDetailUrl: `/student-dashboard/lessons/class/${reschedulingEvent.sourceId}`,
        tutorDetailUrl: "/tutor-dashboard/calendar",
      });
      setReschedulingEvent(null);
      flash("Lesson rescheduled.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't reschedule this lesson.");
    }
  }

  function confirmCancel(reason: CancellationReason) {
    if (!cancelingEvent) return;
    const lesson = getPrivateLessons().find((l) => l.id === cancelingEvent.sourceId);
    const startMs = fromISO(cancelingEvent.date).getTime() + cancelingEvent.startHour * 3_600_000;
    cancelBooking({
      bookingId: cancelingEvent.sourceId,
      kind: "Private",
      cancelledBy: "Tutor",
      cancelledByName: dashboardTutor.name,
      otherPartyName: cancelingEvent.student,
      subject: cancelingEvent.title,
      reason,
      originalStart: formatLessonDateLabel(fromISO(cancelingEvent.date)),
      originalEnd: formatEventTime(cancelingEvent.startHour, cancelingEvent.endHour),
      originalStartMs: startMs,
      originalAmount: lesson ? Number(lesson.price.replace(/[^0-9.]/g, "")) || 0 : 0,
      studentDetailUrl: `/student-dashboard/lessons/class/${cancelingEvent.sourceId}`,
      tutorDetailUrl: "/tutor-dashboard/calendar",
    });
    setCancelingEvent(null);
    flash("Lesson cancelled. The student has been notified and refunded.");
  }

  function confirmRemoveBlock() {
    if (!removingBlockId) return;
    removeBlockedTime(removingBlockId);
    setRemovingBlockId(null);
    flash("Blocked time removed.");
  }

  function EventBlock({
    e,
    compact,
    veryCompact,
    narrow,
    conflict,
  }: {
    e: CalendarPageEvent;
    compact?: boolean;
    veryCompact?: boolean;
    narrow?: boolean;
    conflict?: boolean;
  }) {
    const style = calendarTypeStyles[e.type];
    const conflictSuffix = conflict ? " · Scheduling conflict: overlaps with another class" : "";

    // A 3+-way overlap split leaves too little width for padding + an icon +
    // two lines of text to ever fit — rather than let flex collapse those
    // children to zero size (invisible AND unclickable), a narrow slot gets
    // a deliberately minimal tile: no icon, no inner padding budget lost to
    // chrome, just a full-size clickable color swatch with a title tooltip.
    // The event is still openable (click it, or use the Upcoming Classes
    // list / month view, which are never narrowed) — it's just not
    // labeled inline at this width.
    if (narrow) {
      const label = (e.type === "blocked" ? e.title : `${e.title} · ${formatEventTime(e.startHour, e.endHour)}`) + conflictSuffix;
      return (
        <button
          type="button"
          title={label}
          aria-label={label}
          onClick={() => setSelectedEvent(e)}
          className={cn(
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded px-0.5 text-center text-[9px] font-semibold leading-tight",
            e.type === "blocked" ? "border border-dashed border-ensena-border bg-ensena-bg-soft text-ensena-muted" : cn(style.bg, style.text),
            conflict && "ring-2 ring-inset ring-rose-500"
          )}
        >
          {conflict && <AlertTriangle className="absolute right-0.5 top-0.5 size-2.5 text-rose-600" />}
          <span className="truncate">{e.title}</span>
        </button>
      );
    }

    if (e.type === "blocked") {
      return (
        <button
          type="button"
          onClick={() => setSelectedEvent(e)}
          className={cn("flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-ensena-border bg-ensena-bg-soft px-2.5 py-2 text-left text-xs", compact && "text-[11px]")}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ensena-ink">{e.title}</p>
            <p className="truncate text-ensena-muted">{e.allDay ? "All day" : formatEventTime(e.startHour, e.endHour)}</p>
          </div>
          <MoreVertical className="size-3.5 shrink-0 text-ensena-muted" />
        </button>
      );
    }
    return (
      <div className={cn("flex h-full flex-col gap-1 overflow-hidden rounded-lg px-2.5 py-2", style.bg, conflict && "ring-2 ring-inset ring-rose-500")}>
        <button
          type="button"
          onClick={() => setSelectedEvent(e)}
          title={conflict ? `${e.title}${conflictSuffix}` : undefined}
          className="flex items-start justify-between gap-1 text-left"
        >
          <p className={cn("min-w-0 flex-1 truncate text-xs font-semibold", style.text)}>{e.title}</p>
          {conflict ? (
            <AlertTriangle className="size-3.5 shrink-0 text-rose-600" />
          ) : (
            <MoreVertical className="size-3.5 shrink-0 text-ensena-muted" />
          )}
        </button>
        {!veryCompact && <p className="truncate text-[11px] text-ensena-muted">{eventMeta(e)}</p>}
        <p className="truncate text-[11px] text-ensena-muted">{formatEventTime(e.startHour, e.endHour)}</p>
        {!compact && (
          <button
            type="button"
            onClick={() => setSelectedEvent(e)}
            className={cn("mt-1 flex h-6 items-center justify-center gap-1 rounded-full border bg-white text-[10px] font-semibold", style.text, "border-current")}
          >
            {e.type === "discovery" ? <User className="size-3" /> : <Video className="size-3" />} {e.type === "discovery" ? "View" : "Enter"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
        <div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border">
                  <ChevronLeft className="size-4" />
                </button>
                <p className="min-w-[170px] text-center font-heading text-base font-semibold text-ensena-ink">
                  {view === "month"
                    ? `${MONTH_NAMES[activeDate.getMonth()]} ${activeDate.getFullYear()}`
                    : `${MONTH_NAMES[weekDates[0].getMonth()].slice(0, 3)} ${weekDates[0].getDate()} – ${weekDates[6].getDate()}, ${weekDates[6].getFullYear()}`}
                </p>
                <button type="button" aria-label="Next" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border">
                  <ChevronRight className="size-4" />
                </button>
                <button type="button" onClick={() => setCurrentDate(todayISO)} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                  Today
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex rounded-full border border-ensena-border p-1 text-sm">
                  {(["week", "month"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn(
                        "rounded-full px-3 py-1.5 font-medium capitalize",
                        view === v ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "text-ensena-muted hover:text-ensena-ink"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => { resetBlockForm(); setBlockModalOpen(true); }}
                  className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
                >
                  <Plus className="size-4" /> Block Time
                </Button>
              </div>
            </div>

            {view === "week" && weekConflictCount > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <AlertTriangle className="size-4 shrink-0" />
                {weekConflictCount} {weekConflictCount === 1 ? "session overlaps" : "sessions overlap"} with another class this week. Reschedule one of them to resolve it. Overlapping sessions are outlined in red below.
              </div>
            )}

            {/* Week view */}
            {view === "week" && (
              <div className="mt-5 overflow-x-auto">
                <div className="grid min-w-[860px] grid-cols-[56px_repeat(7,1fr)]">
                  <span />
                  {weekDates.map((d) => {
                    const dISO = toISO(d);
                    const isToday = dISO === todayISO;
                    return (
                      <div key={dISO} className="pb-2 text-center">
                        <p className="text-xs text-ensena-muted">{WEEKDAY_SHORT[d.getDay()]}</p>
                        <span className={cn("mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold", isToday ? "bg-ensena-primary text-white" : "text-ensena-ink")}>
                          {d.getDate()}
                        </span>
                      </div>
                    );
                  })}

                  <div className="relative" style={{ height: (MAX_HOUR - MIN_HOUR) * ROW_HEIGHT }}>
                    {calendarDayHours.map((hour) => (
                      <div key={hour} className="absolute right-2 -translate-y-2 text-[11px] text-ensena-muted" style={{ top: (hour - MIN_HOUR) * ROW_HEIGHT }}>
                        {formatHour(hour)}
                      </div>
                    ))}
                  </div>
                  {weekDates.map((d) => {
                    const dISO = toISO(d);
                    const dayEvents = eventsOn(dISO);
                    const overlapLayout = layoutOverlaps(dayEvents);
                    const conflictIds = findConflictIds(dayEvents);
                    return (
                      <div key={dISO} className="relative border-l border-ensena-border" style={{ height: (MAX_HOUR - MIN_HOUR) * ROW_HEIGHT }}>
                        {calendarDayHours.map((hour) => (
                          <div key={hour} className="absolute inset-x-0 border-t border-ensena-border/50" style={{ top: (hour - MIN_HOUR) * ROW_HEIGHT }} />
                        ))}
                        {dayEvents.map((e) => {
                          const top = (Math.max(MIN_HOUR, e.startHour) - MIN_HOUR) * ROW_HEIGHT;
                          const height = Math.max(28, (Math.min(MAX_HOUR, e.endHour) - Math.max(MIN_HOUR, e.startHour)) * ROW_HEIGHT - 2);
                          const { col, cols } = overlapLayout.get(e.id) ?? { col: 0, cols: 1 };
                          const widthPct = 100 / cols;
                          return (
                            <div
                              key={e.id}
                              className="absolute overflow-hidden"
                              style={{ top, height, left: `calc(${col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                            >
                              <EventBlock
                                e={e}
                                compact={height < 70 || cols > 1}
                                veryCompact={height < 50}
                                narrow={cols >= 3}
                                conflict={conflictIds.has(e.id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month view */}
            {view === "month" && (
              <div className="mt-5 grid grid-cols-7 gap-1.5 text-xs">
                {WEEKDAY_SHORT.map((d) => (
                  <div key={d} className="text-center font-semibold text-ensena-muted">{d}</div>
                ))}
                {monthCells.map((date) => {
                  const dISO = toISO(date);
                  const dayEvents = eventsOn(dISO);
                  const inMonth = date.getMonth() === activeDate.getMonth();
                  return (
                    <div
                      key={dISO}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setCurrentDate(dISO); setSelectedDayISO(dISO); }}
                      onKeyDown={(ev) => { if (ev.key === "Enter") { setCurrentDate(dISO); setSelectedDayISO(dISO); } }}
                      className={cn(
                        "min-h-24 cursor-pointer rounded-lg border p-1.5 text-left align-top",
                        dISO === todayISO ? "border-ensena-primary" : "border-ensena-border",
                        !inMonth && "opacity-40"
                      )}
                    >
                      <span className="text-[11px] font-semibold text-ensena-ink">{date.getDate()}</span>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                            className={cn("truncate rounded px-1 py-0.5 text-left text-[10px] font-medium", calendarTypeStyles[e.type].bg, calendarTypeStyles[e.type].text)}
                          >
                            {e.title}
                          </button>
                        ))}
                        {dayEvents.length > 2 && <span className="text-[10px] text-ensena-muted">+{dayEvents.length - 2} more</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Upcoming Classes</h2>
              <button type="button" onClick={() => setView("month")} className="text-xs font-semibold text-ensena-primary hover:underline">View All</button>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {upcomingByDay.length === 0 && <p className="text-xs text-ensena-muted">Nothing scheduled in the next few days.</p>}
              {upcomingByDay.map((day) => (
                <div key={day.dateISO}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ensena-ink">{day.label} <span className="text-ensena-muted">· {fromISO(day.dateISO).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></p>
                    <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">{day.items.length} classes</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {day.items.map((e) => (
                      <button key={e.id} type="button" onClick={() => setSelectedEvent(e)} className="flex w-full items-center gap-2.5 rounded-lg text-left hover:bg-ensena-bg-soft">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", calendarTypeStyles[e.type].bg, calendarTypeStyles[e.type].text)}>
                          {e.type === "discovery" ? <User className="size-3.5" /> : <Video className="size-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ensena-ink">{formatEventTime(e.startHour, e.endHour).split(" – ")[0]} · {e.title}</p>
                          <p className="truncate text-[11px] text-ensena-muted">{eventMeta(e)}</p>
                        </div>
                        <ChevronRight className="size-3.5 shrink-0 text-ensena-muted" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Legend</h2>
            <div className="mt-3 flex flex-col gap-2 text-xs text-ensena-ink">
              {(["private", "group", "discovery", "blocked", "cancelled"] as CalendarEventType[]).map((type) => (
                <span key={type} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", calendarTypeStyles[type].dot)} /> {calendarTypeLabels[type]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile day timeline */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedDayISO(todayISO)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink"
          >
            <CalendarIcon className="size-3.5" /> Today
          </button>
          <p className="text-sm font-semibold text-ensena-ink">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDayISO(toISO(d)); }}
              className="flex size-8 items-center justify-center rounded-full border border-ensena-border"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDayISO(toISO(d)); }}
              className="flex size-8 items-center justify-center rounded-full border border-ensena-border"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <Button
          onClick={() => { resetBlockForm(); setBlockDate(selectedDayISO); setBlockModalOpen(true); }}
          className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
        >
          <Plus className="size-4" /> Block Time
        </Button>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {selectedWeekDates.map((d) => {
            const dISO = toISO(d);
            const isSelected = dISO === selectedDayISO;
            return (
              <button
                key={dISO}
                type="button"
                onClick={() => setSelectedDayISO(dISO)}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-xl px-3 py-2",
                  isSelected ? "bg-ensena-primary text-white" : "text-ensena-ink"
                )}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">{WEEKDAY_SHORT[d.getDay()]}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
          {selectedDayEvents.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <CalendarIcon className="size-6 text-ensena-border" />
              <p className="text-sm text-ensena-muted">No classes scheduled for this day.</p>
            </div>
          )}
          {selectedDayEvents.map((e) => {
            const style = calendarTypeStyles[e.type];
            const conflict = selectedDayConflictIds.has(e.id);
            return (
              <div key={e.id} className="flex gap-3 p-3.5">
                <div className="w-14 shrink-0 pt-1 text-xs font-medium text-ensena-muted">{formatHour(Math.floor(e.startHour))}</div>
                {e.type === "blocked" ? (
                  <button type="button" onClick={() => setSelectedEvent(e)} className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-dashed border-ensena-border bg-ensena-bg-soft p-3 text-left">
                    <div>
                      <p className="text-sm font-medium text-ensena-ink">{e.title}</p>
                      <p className="text-xs text-ensena-muted">{e.allDay ? "All day" : formatEventTime(e.startHour, e.endHour)}</p>
                    </div>
                    <MoreVertical className="size-4 shrink-0 text-ensena-muted" />
                  </button>
                ) : (
                  <div className={cn("flex-1 rounded-xl p-3", style.bg, conflict && "ring-2 ring-inset ring-rose-500")}>
                    {conflict && (
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="size-3.5" /> Scheduling conflict
                      </p>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => setSelectedEvent(e)} className="min-w-0 flex-1 text-left">
                        <p className={cn("truncate text-sm font-semibold", style.text)}>{e.title}</p>
                        <p className="truncate text-xs text-ensena-muted">{eventMeta(e)}</p>
                        <p className="text-xs text-ensena-muted">{formatEventTime(e.startHour, e.endHour)}</p>
                      </button>
                      <button type="button" aria-label="More actions" onClick={() => setSelectedEvent(e)} className="shrink-0 text-ensena-muted">
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(e)}
                      className={cn("mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full border bg-white text-xs font-semibold", style.text, "border-current")}
                    >
                      {e.type === "discovery" ? <User className="size-3.5" /> : <Video className="size-3.5" />} {e.type === "discovery" ? "View" : "Enter"} {e.type !== "discovery" && "Classroom"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ensena-muted">
          {(["private", "group", "discovery", "blocked"] as CalendarEventType[]).map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", calendarTypeStyles[type].dot)} /> {calendarTypeLabels[type]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-ensena-muted">Times are shown in your local time (GMT+1)</p>
      </div>

      {/* Event details + actions ("three-dot menu") */}
      <ManageLessonSheet open={!!selectedEvent} data={selectedEvent ? manageDataFor(selectedEvent) : null} actions={selectedEvent ? actionsFor(selectedEvent) : []} onClose={() => setSelectedEvent(null)} />

      {/* Reschedule / Cancel (private lessons) */}
      <RescheduleLessonModal
        open={!!reschedulingEvent}
        currentDate={reschedulingEvent?.date ? fromISO(reschedulingEvent.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
        currentTime={reschedulingEvent ? formatEventTime(reschedulingEvent.startHour, reschedulingEvent.endHour).split(" – ")[0] : ""}
        onClose={() => setReschedulingEvent(null)}
        onConfirm={confirmReschedule}
      />
      <CancelLessonModal
        open={!!cancelingEvent}
        title="Cancel this lesson?"
        summary={cancelingEvent ? `${cancelingEvent.title} with ${cancelingEvent.student}, ${formatEventTime(cancelingEvent.startHour, cancelingEvent.endHour)}` : ""}
        policyLabel="Cancelling as the teacher always gives the student a full refund."
        refundAmount={
          cancelingEvent
            ? Number(getPrivateLessons().find((l) => l.id === cancelingEvent.sourceId)?.price.replace(/[^0-9.]/g, "") ?? 0) || 0
            : 0
        }
        cancellationFee={0}
        onKeep={() => setCancelingEvent(null)}
        onConfirm={confirmCancel}
      />

      {/* Tutor reviewing a student after a completed private lesson —
          same permanent, non-editable review model as the student→tutor
          direction (write-review-modal.tsx / reviews-store.ts). */}
      <WriteReviewModal
        open={!!reviewingEvent}
        onClose={() => setReviewingEvent(null)}
        recipientName={reviewingEvent?.student ?? ""}
        title={`Review ${reviewingEvent?.student ?? "Student"}`}
        onSubmit={(rating, comment) => {
          if (!reviewingEvent) return;
          const result = submitReview({
            direction: "tutor-to-student",
            reviewerName: dashboardTutor.name,
            reviewerImage: dashboardTutor.image,
            recipientName: reviewingEvent.student,
            bookingId: reviewingEvent.sourceId,
            bookingType: "Private",
            subject: reviewingEvent.title,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            flash(result.userMessage);
            return;
          }
          setReviewingEvent(null);
        }}
      />

      {/* Remove blocked time */}
      <Modal open={!!removingBlockId} onClose={() => setRemovingBlockId(null)} title="Remove blocked time?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Students will be able to book this time slot again.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRemovingBlockId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Keep it</Button>
            <Button onClick={confirmRemoveBlock} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Remove</Button>
          </div>
        </div>
      </Modal>

      {/* Block Time modal (create or edit) */}
      <Modal open={blockModalOpen} onClose={() => { setBlockModalOpen(false); resetBlockForm(); }} title={editingBlockId ? "Edit Blocked Time" : "Block Time"}>
        <div className="flex flex-col gap-3">
          {!editingBlockId && (
            <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
              <input
                type="checkbox"
                checked={blockMultipleDays}
                onChange={(e) => setBlockMultipleDays(e.target.checked)}
                className="size-4 rounded border-ensena-border accent-ensena-primary"
              />
              Block multiple days
            </label>
          )}

          <div className={cn("grid gap-3", blockMultipleDays ? "grid-cols-2" : "grid-cols-1")}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">{blockMultipleDays ? "From" : "Date"}</span>
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
            {blockMultipleDays && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">To</span>
                <input
                  type="date"
                  value={blockEndDate}
                  min={blockDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                />
              </label>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
            <input
              type="checkbox"
              checked={blockAllDay}
              onChange={(e) => setBlockAllDay(e.target.checked)}
              className="size-4 rounded border-ensena-border accent-ensena-primary"
            />
            Block full day{blockMultipleDays ? "s" : ""} (no time slots bookable)
          </label>

          {!blockAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Start time</span>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">End time</span>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                />
              </label>
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason (optional)</span>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Personal appointment"
              className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
            />
          </label>
          <Button
            onClick={handleBlockSubmit}
            className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            {editingBlockId ? "Save Changes" : blockMultipleDays ? "Block These Days" : "Block This Time"}
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
