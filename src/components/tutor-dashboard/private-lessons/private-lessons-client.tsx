"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
  MoreVertical,
  RefreshCcw,
  Search,
  Star,
  Video,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast-store";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useReviews } from "@/hooks/use-reviews";
import { cancelBooking, getCancellationDetails, rescheduleBooking, type CancellationReason } from "@/lib/booking-lifecycle-store";
import { canEnterClassroom, getClassEntryState } from "@/lib/class-entry-access";
import { formatNaira } from "@/lib/format";
import { submitReview } from "@/lib/reviews-store";
import { classifyClassStatus } from "@/lib/class-status";
import { getPrivateLessonTimeRange } from "@/lib/student-dashboard-data";
import { formatLessonDateLabel } from "@/lib/tutor-availability";
import { to12HourDisplay } from "@/lib/time-format";
import {
  dashboardTutor,
  findStudentIdByName,
  privateLessonExtras,
  simulatedNowAnchor,
  simulatedNowAnchorRealTime,
  type PrivateLesson,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const subjectIconColors: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700",
  English: "bg-rose-100 text-rose-700",
  Physics: "bg-emerald-100 text-emerald-700",
  Chemistry: "bg-violet-100 text-violet-700",
  Biology: "bg-amber-100 text-amber-700",
};
const fallbackIconColor = "bg-ensena-bg-soft text-ensena-ink";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// Delegates to the one platform-wide, Africa/Lagos-aware time range
// (getPrivateLessonTimeRange -> parseLegacyDateTime -> platform-time.ts) —
// this used to build `new Date(\`${date} ${time}\`)` directly, which is both
// fragile to parse and silently interpreted in whatever timezone the code
// happens to run in, never Enseña's fixed Africa/Lagos platform clock.
function parseLessonDateTime(lesson: PrivateLesson): number {
  return getPrivateLessonTimeRange(lesson).startMs;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Starting now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function weekdayOf(dateStr: string): string {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "short" });
}

const lessonTabs = ["Upcoming", "Completed", "Cancelled"] as const;
type LessonTab = (typeof lessonTabs)[number];

// Mirrors MyLessonsHubClient's own `resolveTab` pattern for the outer
// hub tab — the pending-reviews banner deep-links here with `?subtab=`
// (and `focus=reviews`) so "Review Now" actually lands on Completed
// instead of silently defaulting to Upcoming.
function resolveSubtab(raw: string | null): LessonTab {
  if (!raw) return "Upcoming";
  const normalized = raw.trim().toLowerCase();
  const match = lessonTabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "Upcoming";
}

// The "Active Private Classes" list is deliberately simple, per the MVP
// design direction — this page just needs to answer "who am I teaching,
// when's the next session, let me get in or reach them". Deeper lesson
// management (notes, history, escrow) stays out of scope here. Completed
// and Cancelled tabs exist so a lesson never becomes unreachable once it
// leaves Upcoming — cancelBooking/private-lessons-store never delete a
// record, only flip its status, so this just needs to read the same
// `lessons` list through a different filter.
export function PrivateLessonsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtabParam = searchParams.get("subtab");
  const focusReviews = searchParams.get("focus") === "reviews";
  const [activeTab, setActiveTab] = useState<LessonTab>(() => resolveSubtab(subtabParam));
  const [prevSubtabParam, setPrevSubtabParam] = useState(subtabParam);
  if (subtabParam !== prevSubtabParam) {
    setPrevSubtabParam(subtabParam);
    setActiveTab(resolveSubtab(subtabParam));
  }
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Upcoming" | "Pending">("All");
  const [sortBy, setSortBy] = useState<"Upcoming First" | "Name">("Upcoming First");
  const [nowMs, setNowMs] = useState(() => simulatedNowAnchor);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [reschedulingLesson, setReschedulingLesson] = useState<PrivateLesson | null>(null);
  const [cancelingLesson, setCancelingLesson] = useState<PrivateLesson | null>(null);
  const [reviewingLesson, setReviewingLesson] = useState<PrivateLesson | null>(null);
  const lessons = usePrivateLessons();
  const allReviews = useReviews();

  function isReviewed(bookingId: string, student: string): boolean {
    return allReviews.some((r) => r.direction === "tutor-to-student" && r.bookingId === bookingId && r.reviewerName === dashboardTutor.name && r.recipientName === student);
  }

  // Real toast delivery now lives in the one shared Toaster mounted at the
  // root layout (see toast-store.ts) — kept as a local `flash` alias so
  // every existing call site in this file stays unchanged.
  const flash = showToast;

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(simulatedNowAnchor + (Date.now() - simulatedNowAnchorRealTime));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // "Pending" (awaiting tutor confirmation) is never time-derived — kept as
  // a direct status check. "Upcoming" is real time-derived (classifyClassStatus)
  // so a stale seed lesson whose scheduled time has already passed can never
  // still appear here just because its stored `status` field was never
  // rewritten.
  const upcomingClasses = useMemo(
    () =>
      lessons.filter((l) => {
        if (l.status === "Pending") return true;
        if (l.status !== "Upcoming") return false;
        const { startMs, endMs } = getPrivateLessonTimeRange(l);
        const status = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs });
        return status === "Upcoming" || status === "Live";
      }),
    [lessons, nowMs]
  );
  const completedClasses = useMemo(() => {
    const list = [...lessons.filter((l) => l.status === "Completed")].sort((a, b) => parseLessonDateTime(b) - parseLessonDateTime(a));
    if (!focusReviews) return list;
    const pending = list.filter((l) => !isReviewed(l.id, l.student));
    const reviewed = list.filter((l) => isReviewed(l.id, l.student));
    return [...pending, ...reviewed];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isReviewed re-derives from the same subscribed allReviews/dashboardTutor each render
  }, [lessons, focusReviews, allReviews]);
  const pendingReviewCount = useMemo(() => completedClasses.filter((l) => !isReviewed(l.id, l.student)).length, [completedClasses, allReviews]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancelledClasses = useMemo(
    () => [...lessons.filter((l) => l.status === "Cancelled")].sort((a, b) => parseLessonDateTime(b) - parseLessonDateTime(a)),
    [lessons]
  );
  const subjects = useMemo(() => Array.from(new Set(upcomingClasses.map((l) => l.subject))).sort(), [upcomingClasses]);

  const filtered = useMemo(() => {
    let list = upcomingClasses.filter((l) => {
      const matchesQuery = query.trim() === "" || l.student.toLowerCase().includes(query.toLowerCase()) || l.subject.toLowerCase().includes(query.toLowerCase());
      const matchesSubject = subjectFilter === "All" || l.subject === subjectFilter;
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      return matchesQuery && matchesSubject && matchesStatus;
    });
    list = [...list];
    if (sortBy === "Upcoming First") list.sort((a, b) => parseLessonDateTime(a) - parseLessonDateTime(b));
    else list.sort((a, b) => a.student.localeCompare(b.student));
    return list;
  }, [upcomingClasses, query, subjectFilter, statusFilter, sortBy]);

  function messageStudent(name: string) {
    router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(name)}`);
  }

  function openCancel(lesson: PrivateLesson) {
    setCancelingLesson(lesson);
    setOpenMenuId(null);
  }

  function confirmCancel(reason: CancellationReason, notes?: string) {
    if (!cancelingLesson) return;
    cancelBooking({
      bookingId: cancelingLesson.id,
      kind: "Private",
      cancelledBy: "Tutor",
      cancelledByName: dashboardTutor.name,
      otherPartyName: cancelingLesson.student,
      subject: cancelingLesson.subject,
      reason,
      notes,
      originalStart: cancelingLesson.date,
      originalEnd: cancelingLesson.time,
      originalStartMs: parseLessonDateTime(cancelingLesson),
      originalAmount: Number(cancelingLesson.price.replace(/[^0-9.]/g, "")) || 0,
      studentDetailUrl: `/student-dashboard/lessons/class/${cancelingLesson.id}`,
      tutorDetailUrl: `/tutor-dashboard/private-lessons/${cancelingLesson.id}`,
    });
    setCancelingLesson(null);
    flash("Lesson cancelled. The student has been notified and refunded.");
  }

  function openReschedule(lesson: PrivateLesson) {
    setReschedulingLesson(lesson);
    setOpenMenuId(null);
  }

  function confirmReschedule(rescheduleDate: string, rescheduleTime: string) {
    if (!reschedulingLesson) return;
    const newDate = formatLessonDateLabel(new Date(`${rescheduleDate}T00:00:00`));
    const newTime = to12HourDisplay(rescheduleTime);
    try {
      rescheduleBooking({
        bookingId: reschedulingLesson.id,
        kind: "Private",
        requestedBy: "Tutor",
        requestedByName: dashboardTutor.name,
        otherPartyName: reschedulingLesson.student,
        subject: reschedulingLesson.subject,
        fromDate: reschedulingLesson.date,
        fromTime: reschedulingLesson.time,
        toDate: newDate,
        toTime: newTime,
        studentDetailUrl: `/student-dashboard/lessons/class/${reschedulingLesson.id}`,
        tutorDetailUrl: `/tutor-dashboard/private-lessons/${reschedulingLesson.id}`,
      });
      setReschedulingLesson(null);
      flash("Lesson rescheduled.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't reschedule this lesson.");
    }
  }

  function RowMenu({ lesson }: { lesson: PrivateLesson }) {
    return (
      <div className="relative">
        <button
          type="button"
          aria-label="More actions"
          onClick={() => setOpenMenuId(openMenuId === lesson.id ? null : lesson.id)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
        >
          <MoreVertical className="size-4" />
        </button>
        {openMenuId === lesson.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} aria-hidden="true" />
            <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
              <button type="button" onClick={() => { messageStudent(lesson.student); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                <MessageSquare className="size-3.5" /> Message
              </button>
              <button type="button" onClick={() => openReschedule(lesson)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                <RefreshCcw className="size-3.5" /> Reschedule
              </button>
              <button type="button" onClick={() => openCancel(lesson)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                <XCircle className="size-3.5" /> Cancel
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lessonTabs.map((tab) => {
          const count = tab === "Upcoming" ? upcomingClasses.length : tab === "Completed" ? completedClasses.length : cancelledClasses.length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
                activeTab === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
              )}
            >
              {tab} <span className="text-xs text-ensena-muted">({count})</span>
            </button>
          );
        })}
      </div>

      {activeTab !== "Upcoming" ? (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">{activeTab} Private Classes</h2>
          <p className="text-sm text-ensena-muted">
            {activeTab === "Completed" ? "Lessons you've already taught." : "Cancelled lessons are kept here; they're never deleted."}
          </p>

          {activeTab === "Completed" && (
            <>
              {focusReviews && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ensena-ink">
                  <Star className="size-4 shrink-0 text-amber-600" />
                  {pendingReviewCount > 0
                    ? `${pendingReviewCount} completed ${pendingReviewCount === 1 ? "class" : "classes"} still ${pendingReviewCount === 1 ? "needs" : "need"} your review. They're listed first below.`
                    : "You're all caught up. Every completed class has been reviewed."}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-0 divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
                {completedClasses.map((lesson) => {
                  const reviewed = isReviewed(lesson.id, lesson.student);
                  return (
                    <div key={lesson.id} className={cn("flex flex-wrap items-center gap-4 p-4", !reviewed && "bg-amber-50/40")}>
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                        {initials(lesson.student)}
                      </span>
                      <div className="min-w-[160px] flex-1">
                        <p className="text-sm font-semibold text-ensena-ink">{lesson.subject}</p>
                        <p className="text-xs text-ensena-muted">with {lesson.student} · {lesson.date} · {lesson.time}</p>
                        <span
                          className={cn(
                            "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            reviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}
                        >
                          <Star className="size-3" /> {reviewed ? "Review submitted" : "Review pending"}
                        </span>
                      </div>
                      {!reviewed && (
                        <button
                          type="button"
                          onClick={() => setReviewingLesson(lesson)}
                          className="rounded-full bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                        >
                          Leave Review
                        </button>
                      )}
                      <Link href={`/tutor-dashboard/private-lessons/${lesson.id}`} className="rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        View Class
                      </Link>
                      <button type="button" aria-label="Message student" onClick={() => messageStudent(lesson.student)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                        <MessageSquare className="size-4" />
                      </button>
                    </div>
                  );
                })}
                {completedClasses.length === 0 && <p className="p-8 text-center text-sm text-ensena-muted">No completed classes yet.</p>}
              </div>
            </>
          )}

          {activeTab === "Cancelled" && (
            <div className="mt-4 flex flex-col gap-3">
              {cancelledClasses.map((lesson) => {
                const details = getCancellationDetails(lesson.id);
                return (
                  <div key={lesson.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-sm font-semibold text-ensena-muted grayscale">
                      {initials(lesson.student)}
                    </span>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{lesson.subject}</p>
                      <p className="text-xs text-ensena-muted">with {lesson.student} · {lesson.date} · {lesson.time}</p>
                      {details && (
                        <p className="mt-0.5 text-xs text-ensena-muted">
                          Cancelled by {details.cancelledByName === dashboardTutor.name ? "you" : details.cancelledByName}
                          {details.refundAmount > 0 && <> · Refund {formatNaira(details.refundAmount)}</>}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                    <Link href={`/tutor-dashboard/private-lessons/${lesson.id}`} className="rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      View Details
                    </Link>
                  </div>
                );
              })}
              {cancelledClasses.length === 0 && (
                <p className="rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">No cancelled classes.</p>
              )}
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student name or subject…"
          className="h-11 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
          <option value="All">All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
          <option value="All">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Pending">Pending</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
          <option value="Upcoming First">Upcoming First</option>
          <option value="Name">Name</option>
        </select>
        <Link
          href="/tutor-dashboard/private-lessons?tab=Schedule"
          aria-label="View calendar"
          className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <CalendarIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Active Private Classes</h2>
        <p className="text-sm text-ensena-muted">Your ongoing one-on-one tutoring arrangements.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface py-16 text-center">
          <CalendarIcon className="size-8 text-ensena-border" />
          <p className="text-sm font-medium text-ensena-ink">No private classes found</p>
          <p className="text-xs text-ensena-muted">Try a different filter or search term.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface lg:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Subject &amp; Details</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Next Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lesson) => {
                  const extra = privateLessonExtras[lesson.id];
                  const studentId = findStudentIdByName(lesson.student);
                  const startMs = parseLessonDateTime(lesson);
                  const diffMs = startMs - nowMs;
                  const canEnter = canEnterClassroom(getClassEntryState({ ...getPrivateLessonTimeRange(lesson), role: "tutor", nowMs }));
                  const category = extra ? `${extra.level} Preparation` : "General Tuition";
                  return (
                    <tr key={lesson.id} className="border-b border-ensena-border last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">
                            {initials(lesson.student)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ensena-ink">{lesson.student}</p>
                            <p className="truncate text-xs text-ensena-muted">{extra?.level ?? "Student"}</p>
                            <button type="button" onClick={() => messageStudent(lesson.student)} aria-label={`Message ${lesson.student}`} className="mt-0.5 text-ensena-muted hover:text-ensena-primary">
                              <MessageSquare className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg", subjectIconColors[lesson.subject] ?? fallbackIconColor)}>
                            <span className="text-xs font-bold">{lesson.subject[0]}</span>
                          </span>
                          <div>
                            <p className="font-medium text-ensena-ink">{lesson.subject}</p>
                            <p className="text-xs text-ensena-muted">{category}</p>
                            <p className="text-xs text-ensena-muted">{lesson.mode} · {lesson.duration}</p>
                            <p className="font-mono text-[11px] text-ensena-muted">{lesson.bookingReference}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ensena-ink">
                        <p className="flex items-center gap-1"><CalendarIcon className="size-3.5 text-ensena-muted" /> {weekdayOf(lesson.date)}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-ensena-muted"><Clock className="size-3 text-ensena-muted" /> {lesson.time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ensena-ink">{lesson.date}</p>
                        <p className={cn("text-xs font-medium", diffMs <= 0 ? "text-ensena-success" : "text-ensena-primary")}>{formatCountdown(diffMs)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {canEnter && (
                            <Button
                              nativeButton={false}
                              render={<Link href={`/tutor-dashboard/classroom/private/${lesson.id}`} />}
                              className="h-8 rounded-full border border-ensena-primary bg-white px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                            >
                              <Video className="size-3.5" /> Enter Classroom
                            </Button>
                          )}
                          <Link href={`/tutor-dashboard/private-lessons/${lesson.id}`} className="flex h-8 items-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                            View Class
                          </Link>
                          {studentId ? (
                            <Link href={`/tutor-dashboard/students/${studentId}`} className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                              View Student
                            </Link>
                          ) : (
                            <button type="button" onClick={() => messageStudent(lesson.student)} className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                              Message
                            </button>
                          )}
                          <RowMenu lesson={lesson} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-ensena-border px-4 py-3 text-xs text-ensena-muted">
              Showing {filtered.length} of {upcomingClasses.length} active private classes
            </p>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 flex flex-col gap-3 lg:hidden">
            {filtered.map((lesson) => {
              const extra = privateLessonExtras[lesson.id];
              const studentId = findStudentIdByName(lesson.student);
              const startMs = parseLessonDateTime(lesson);
              const diffMs = startMs - nowMs;
              const canEnter = canEnterClassroom(getClassEntryState({ ...getPrivateLessonTimeRange(lesson), role: "tutor", nowMs }));
              return (
                <div key={lesson.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                        {initials(lesson.student)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ensena-ink">{lesson.subject}</p>
                        <p className="truncate text-xs text-ensena-muted">{lesson.student} · {lesson.mode}</p>
                      </div>
                    </div>
                    <RowMenu lesson={lesson} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ensena-muted">
                    <span className="flex items-center gap-1"><CalendarIcon className="size-3" /> {weekdayOf(lesson.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {lesson.time}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ensena-muted">{lesson.bookingReference}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-medium text-ensena-success">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> {diffMs <= 0 ? "In progress" : `Next class ${formatCountdown(diffMs)}`}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {canEnter && (
                      <Button
                        nativeButton={false}
                        render={<Link href={`/tutor-dashboard/classroom/private/${lesson.id}`} />}
                        className="h-9 flex-1 basis-full rounded-full border border-ensena-primary bg-white text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                      >
                        <Video className="size-3.5" /> Enter Classroom
                      </Button>
                    )}
                    <Link href={`/tutor-dashboard/private-lessons/${lesson.id}`} className="flex h-9 flex-1 items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                      View Class
                    </Link>
                    {studentId ? (
                      <Link href={`/tutor-dashboard/students/${studentId}`} className="flex h-9 flex-1 items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                        View Student
                      </Link>
                    ) : (
                      <button type="button" onClick={() => messageStudent(lesson.student)} className="flex h-9 flex-1 items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                        Message
                      </button>
                    )}
                  </div>
                  {extra?.level && <p className="mt-2 text-xs text-ensena-muted">{extra.level} Preparation</p>}
                </div>
              );
            })}
            <p className="text-center text-xs text-ensena-muted">
              Showing {filtered.length} of {upcomingClasses.length} active private classes
            </p>
          </div>
        </>
      )}
      </>
      )}

      {/* Reschedule / Cancel — routed through booking-lifecycle-store so this
          matches the Calendar tab's already-correct behavior exactly: real
          refund policy, notification, email, and audit trail, instead of a
          silent direct write to private-lessons-store. */}
      <RescheduleLessonModal
        open={!!reschedulingLesson}
        currentDate={reschedulingLesson?.date ?? ""}
        currentTime={reschedulingLesson?.time ?? ""}
        onClose={() => setReschedulingLesson(null)}
        onConfirm={confirmReschedule}
      />
      <CancelLessonModal
        open={!!cancelingLesson}
        title="Cancel this lesson?"
        summary={cancelingLesson ? `${cancelingLesson.subject} with ${cancelingLesson.student}, ${cancelingLesson.date} · ${cancelingLesson.time}` : ""}
        policyLabel="Cancelling as the teacher always gives the student a full refund."
        refundAmount={cancelingLesson ? Number(cancelingLesson.price.replace(/[^0-9.]/g, "")) || 0 : 0}
        cancellationFee={0}
        onKeep={() => setCancelingLesson(null)}
        onConfirm={confirmCancel}
      />

      {/* Tutor reviewing a student after a completed lesson — same permanent,
          non-editable review model and submitReview call as the Calendar
          tab's "Leave a Review" action, so both write to the exact same
          review record (same bookingId/reviewerName/recipientName). */}
      <WriteReviewModal
        open={!!reviewingLesson}
        onClose={() => setReviewingLesson(null)}
        recipientName={reviewingLesson?.student ?? ""}
        title={`Review ${reviewingLesson?.student ?? "Student"}`}
        onSubmit={(rating, comment) => {
          if (!reviewingLesson) return;
          const result = submitReview({
            direction: "tutor-to-student",
            reviewerName: dashboardTutor.name,
            reviewerImage: dashboardTutor.image,
            recipientName: reviewingLesson.student,
            bookingId: reviewingLesson.id,
            bookingType: "Private",
            subject: reviewingLesson.subject,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            flash(result.userMessage);
            return;
          }
          setReviewingLesson(null);
        }}
      />
    </div>
  );
}
