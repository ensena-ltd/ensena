"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, Check, MessageSquare, User, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingInfoCard } from "@/components/shared/lessons/booking-info-card";
import { PaymentPlanCard } from "@/components/shared/lessons/payment-plan-card";
import { ScheduleSummaryCard } from "@/components/shared/lessons/schedule-summary-card";
import { useNowMs } from "@/hooks/use-now-ms";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { canEnterClassroom, getClassEntryState } from "@/lib/class-entry-access";
import { classifyClassStatus } from "@/lib/class-status";
import { getBookingSiblings, summarizeSchedule } from "@/lib/private-booking-schedule";
import { getPrivateLessonTimeRange } from "@/lib/student-dashboard-data";
import {
  findStudentIdByName,
  privateLessonExtras,
  privateLessonStatusStyles,
  type PrivateLesson,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

function parseNairaAmount(payment: string): number {
  const match = payment.replace(/,/g, "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// The real, time-derived display status — never the raw stored `status`
// field alone, which is never rewritten once real time moves past it (the
// exact bug that let a stale seed lesson keep showing "Upcoming" long after
// its scheduled time had passed). "Pending"/"Cancelled" aren't time-based,
// so they pass through unchanged; "Upcoming" is re-verified against the
// real schedule window and downgraded to "Completed" once it's genuinely
// over.
function realDisplayStatus(lesson: PrivateLesson, nowMs: number): PrivateLesson["status"] {
  if (lesson.status === "Cancelled" || lesson.status === "Pending") return lesson.status;
  const { startMs, endMs } = getPrivateLessonTimeRange(lesson);
  const status = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs });
  return status === "Upcoming" || status === "Live" ? "Upcoming" : "Completed";
}

function ClassHeaderCard({ lesson, level, nowMs }: { lesson: PrivateLesson; level: string | undefined; nowMs: number }) {
  const displayStatus = realDisplayStatus(lesson, nowMs);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:flex-row sm:items-center">
      <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-2xl font-semibold text-ensena-primary">
        {initials(lesson.student)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{lesson.subject}</h1>
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Private Lesson</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", privateLessonStatusStyles[displayStatus])}>{displayStatus}</span>
        </div>
        <p className="text-sm font-medium text-ensena-primary">with {lesson.student}</p>
        {level && <p className="text-xs text-ensena-muted">{level}</p>}
      </div>
    </div>
  );
}

function StudentCard({
  lesson,
  level,
  studentId,
  onMessage,
}: {
  lesson: PrivateLesson;
  level: string | undefined;
  studentId: string | undefined;
  onMessage: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Student</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
          {initials(lesson.student)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ensena-ink">{lesson.student}</p>
          <p className="text-xs text-ensena-muted">{level ?? "Student"}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onMessage}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
        >
          <MessageSquare className="size-4" /> Message
        </button>
        {studentId && (
          <Link
            href={`/tutor-dashboard/students/${studentId}`}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <User className="size-4" /> View Student
          </Link>
        )}
      </div>
    </div>
  );
}

function NotesCard({ notes }: { notes: string | undefined }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Lesson Notes</h2>
      <p className="mt-2 text-sm text-ensena-muted">{notes || "No lesson notes were added."}</p>
    </div>
  );
}

const sessionStatusStyles: Record<string, string> = {
  Upcoming: "bg-ensena-bg-soft text-ensena-muted",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-ensena-success/10 text-ensena-success",
  Cancelled: "bg-rose-50 text-rose-600",
};

function SessionsCard({ siblings, totalSessions, nowMs }: { siblings: PrivateLesson[]; totalSessions: number; nowMs: number }) {
  const sorted = [...siblings].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
  const rowsByWeek = new Map<number, PrivateLesson[]>();
  for (const row of sorted) {
    const wk = row.weekNumber ?? 1;
    rowsByWeek.set(wk, [...(rowsByWeek.get(wk) ?? []), row]);
  }
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Sessions</h2>
      <div className="mt-3 flex flex-col gap-5">
        {[...rowsByWeek.entries()].map(([week, rows]) => (
          <div key={week}>
            <p className="text-xs font-semibold text-ensena-primary">Week {week}</p>
            <div className="mt-2 flex flex-col gap-2">
              {rows.map((row) => {
                // Per-row, not per-page — a tutor with 12 siblings on this
                // booking must be able to enter whichever ONE is actually due
                // right now, not only the specific lesson the URL points at.
                const rowDisplayStatus = realDisplayStatus(row, nowMs);
                const rowEntryState = row.status === "Upcoming" ? getClassEntryState({ ...getPrivateLessonTimeRange(row), role: "tutor", nowMs }) : null;
                const rowCanEnter = rowEntryState ? canEnterClassroom(rowEntryState) : false;
                return (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ensena-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ensena-ink">
                        {row.date} · {row.time}
                      </p>
                      <p className="text-xs text-ensena-muted">
                        Session {row.sessionNumber} of {totalSessions}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", sessionStatusStyles[rowDisplayStatus] ?? sessionStatusStyles.Upcoming)}>
                        {rowDisplayStatus}
                      </span>
                      {rowCanEnter && (
                        <Button
                          nativeButton={false}
                          render={<Link href={`/tutor-dashboard/classroom/private/${row.id}`} />}
                          className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white"
                        >
                          <Video className="size-3.5" /> Enter Class
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TutorClassDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const nowMs = useNowMs();
  const lessons = usePrivateLessons();
  const lesson = lessons.find((l) => l.id === id);

  if (!lesson) {
    notFound();
    return null;
  }

  const extra = privateLessonExtras[lesson.id];
  const studentName = lesson.student;
  const studentId = findStudentIdByName(studentName);
  const bookingId = isValidBookingReference(lesson.id) ? lesson.id : buildBookingReference("private", lesson.id);

  function messageStudent() {
    router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(studentName)}`);
  }

  const entryState = lesson.status === "Upcoming" ? getClassEntryState({ ...getPrivateLessonTimeRange(lesson), role: "tutor", nowMs }) : null;
  const canEnterNow = entryState ? canEnterClassroom(entryState) : false;
  const classroomHref = `/tutor-dashboard/classroom/private/${lesson.id}`;

  // ---- Multi-session (weekly/monthly) programme ----
  const groupBookingId = lesson.bookingId;
  if (groupBookingId) {
    const siblings = getBookingSiblings(lessons, groupBookingId);
    const totalSessions = siblings[0]?.totalSessions ?? siblings.length;
    const totalPriceAmount = siblings.reduce((sum, l) => sum + parseNairaAmount(l.price), 0);
    const scheduleSummary = summarizeSchedule(siblings);

    const bookingStatusRow = (
      <div className="flex items-center justify-between rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div>
          <p className="text-sm font-semibold text-ensena-ink">{totalSessions} sessions total</p>
          <p className="text-xs text-ensena-muted">Booking reference {groupBookingId}</p>
        </div>
        {canEnterNow && (
          <Button nativeButton={false} render={<Link href={classroomHref} />} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
            <Video className="size-3.5" /> Enter Classroom
          </Button>
        )}
      </div>
    );

    return (
      <div>
        <Link href="/tutor-dashboard/private-lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
          <ArrowLeft className="size-4" /> My Classes
        </Link>

        {/* Mobile: single-column stack */}
        <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-5 lg:hidden">
          <ClassHeaderCard lesson={lesson} level={extra?.level} nowMs={nowMs} />
          {bookingStatusRow}
          <ScheduleSummaryCard summary={scheduleSummary} />
          <BookingInfoCard bookingId={groupBookingId} label="Booking ID" />
          <SessionsCard siblings={siblings} totalSessions={totalSessions} nowMs={nowMs} />
          <StudentCard lesson={lesson} level={extra?.level} studentId={studentId} onMessage={messageStudent} />
          <PaymentPlanCard bookingId={groupBookingId} amountPaid={totalPriceAmount} sessionsCovered={totalSessions} />
        </div>

        {/* Desktop: full-width two-column layout — matches the single-lesson view below, instead of sitting narrow-centered in an otherwise full-width dashboard. */}
        <div className="hidden lg:mt-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-5">
            <ClassHeaderCard lesson={lesson} level={extra?.level} nowMs={nowMs} />
            {bookingStatusRow}
            <ScheduleSummaryCard summary={scheduleSummary} />
            <BookingInfoCard bookingId={groupBookingId} label="Booking ID" />
            <SessionsCard siblings={siblings} totalSessions={totalSessions} nowMs={nowMs} />
          </div>
          <div className="flex flex-col gap-5">
            <StudentCard lesson={lesson} level={extra?.level} studentId={studentId} onMessage={messageStudent} />
            <PaymentPlanCard bookingId={groupBookingId} amountPaid={totalPriceAmount} sessionsCovered={totalSessions} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Single (one-time) lesson ----
  const scheduleSummary = summarizeSchedule([lesson]);
  const priceAmount = parseNairaAmount(lesson.price);

  return (
    <div>
      <Link href="/tutor-dashboard/private-lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        <ArrowLeft className="size-4" /> My Classes
      </Link>

      <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-5 lg:hidden">
        <ClassHeaderCard lesson={lesson} level={extra?.level} nowMs={nowMs} />
        {canEnterNow && (
          <Button nativeButton={false} render={<Link href={classroomHref} />} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            <Video className="size-4" /> Enter Classroom
          </Button>
        )}
        <ScheduleSummaryCard summary={scheduleSummary} />
        <BookingInfoCard bookingId={bookingId} label="Booking ID" />
        <StudentCard lesson={lesson} level={extra?.level} studentId={studentId} onMessage={messageStudent} />
        <NotesCard notes={lesson.notes} />
        <PaymentPlanCard bookingId={lesson.id} amountPaid={priceAmount} />
        {lesson.status === "Completed" && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-4" />
            </span>
            <p className="text-sm font-semibold text-emerald-700">Lesson Completed</p>
          </div>
        )}
      </div>

      <div className="hidden lg:mt-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <ClassHeaderCard lesson={lesson} level={extra?.level} nowMs={nowMs} />
          <ScheduleSummaryCard summary={scheduleSummary} />
          <BookingInfoCard bookingId={bookingId} label="Booking ID" />
          <NotesCard notes={lesson.notes} />
          {lesson.status === "Completed" && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-4" />
              </span>
              <p className="text-sm font-semibold text-emerald-700">Lesson Completed</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-5">
          {canEnterNow && (
            <Button nativeButton={false} render={<Link href={classroomHref} />} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              <Video className="size-4" /> Enter Classroom
            </Button>
          )}
          <StudentCard lesson={lesson} level={extra?.level} studentId={studentId} onMessage={messageStudent} />
          <PaymentPlanCard bookingId={lesson.id} amountPaid={priceAmount} />
        </div>
      </div>
    </div>
  );
}
