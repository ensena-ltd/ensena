"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  FileText,
  GraduationCap,
  MessageSquare,
  Star,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { useAttendance } from "@/hooks/use-attendance";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useNowMs } from "@/hooks/use-now-ms";
import { usePaymentPlans, useSubscriptions } from "@/hooks/use-payment-plans";
import { useReviews, useTutorRating } from "@/hooks/use-reviews";
import { useTodayISO } from "@/hooks/use-today-iso";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { getClassEntryState, parseLegacyDateTime, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { formatNaira } from "@/lib/format";
import { isGroupBookingComplete } from "@/lib/group-class-schedule";
import { cancelSubscription, chargeSubscription, getPeriodsPaid, getSubscriptionForBooking, hasSessionAccess, recordPayment, type Subscription } from "@/lib/payment-plans-store";
import { submitReview } from "@/lib/reviews-store";
import { getSessionAccessState, getUnpaidPaymentTiming } from "@/lib/session-access-state";
import { enrollmentToStudentGroupClass } from "@/lib/student-booking-adapters";
import { dashboardStudent, getGroupSessionTimeRange, groupClassResources, type StudentGroupClass } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy ID"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="text-ensena-muted hover:text-ensena-primary"
    >
      {copied ? <Check className="size-4 text-ensena-success" /> : <Copy className="size-4" />}
    </button>
  );
}

function OverviewTile({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-xs text-ensena-muted">{label}</p>
        <p className="text-sm font-semibold text-ensena-ink">{value}</p>
      </div>
    </div>
  );
}

interface ViewProps {
  groupClass: StudentGroupClass;
  bookingId: string;
  nowMs: number;
  onMessageTutor: () => void;
}

function HeaderCard({ groupClass }: ViewProps) {
  const rating = useTutorRating(groupClass.tutor, groupClass.tutorRating, 0);
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{groupClass.title}</h1>
          <span className="mt-1 inline-block rounded-full bg-[#CBEFFF] px-2.5 py-0.5 text-xs font-semibold text-[#1E7BA6]">Group Class</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="size-3.5" /> Enrolled
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
          <Image src={groupClass.tutorImage} alt={groupClass.tutor} fill sizes="48px" className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ensena-ink">{groupClass.tutor}</p>
          <p className="flex items-center gap-1 text-xs text-ensena-muted">
            {groupClass.subject} Tutor <span className="text-amber-500">★</span> {rating.rating}
          </p>
        </div>
      </div>
    </div>
  );
}

function ClassOverviewCard({ groupClass, bookingId }: ViewProps) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Class Overview</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2">
        <OverviewTile icon={GraduationCap} label="Academic Level" value={groupClass.academicLevel} />
        {groupClass.exam && <OverviewTile icon={FileText} label="Exam" value={groupClass.exam} />}
        <OverviewTile icon={Video} label="Mode" value={groupClass.mode} />
        <OverviewTile icon={Clock} label="Duration" value={`${groupClass.durationMins} minutes`} />
        <OverviewTile icon={Users} label="Class Size" value={`${groupClass.seatsFilled} / ${groupClass.seatsTotal} students`} />
      </div>
      <div className="mt-4 border-t border-ensena-border pt-4">
        <p className="text-xs text-ensena-muted">Group Class ID</p>
        <p className="flex items-center gap-2 font-mono text-sm font-semibold text-ensena-ink">
          {bookingId} <CopyId value={bookingId} />
        </p>
      </div>
    </div>
  );
}

function NextSessionCard({ groupClass, nowMs }: ViewProps) {
  // Subscribing here (return value unused) is what makes a payment/retry
  // elsewhere on this same page re-render this card immediately — without
  // it, hasSessionAccess below would only ever reflect payment state as of
  // whenever THIS component last rendered for an unrelated reason.
  usePaymentPlans();
  // `nextSessionDate` is either the seed's own "Weekday, Mon DD" (no year)
  // or, for a real booking, formatClassDate's "Weekday, Mon DD, YYYY" — only
  // the first two comma-separated parts are ever needed for this compact
  // day-badge, so a trailing year part (if present) is simply ignored
  // rather than accidentally swallowed into `day` as "24," with a stray
  // comma (the previous `rest.join(", ")` + re-split bug).
  const [weekday, monthDay] = groupClass.nextSessionDate.split(", ");
  const [month, day] = monthDay.split(" ");
  const timeRange = getGroupSessionTimeRange(groupClass);
  const entryState = timeRange ? getClassEntryState({ ...timeRange, role: "student", nowMs }) : null;
  const nextSession = groupClass.sessions.find((s) => s.status !== "Completed") ?? groupClass.sessions[0];
  const nextSessionId = `${groupClass.id}-session-${nextSession?.sessionNumber ?? 1}`;
  const paid = hasSessionAccess(groupClass.id, nextSessionId, dashboardStudent.name);
  const subscription = getSubscriptionForBooking(groupClass.id);
  const access = getSessionAccessState({
    hasPaid: paid,
    entryState: entryState ?? "too-early",
    unpaidTiming: paid ? undefined : getUnpaidPaymentTiming(subscription?.status ?? null, subscription && subscription.status !== "cancelled" ? subscription.nextChargeAtMs : null, nowMs),
    weekLabel: nextSession?.weekNumber ? `Week ${nextSession.weekNumber}` : undefined,
  });
  const enterable = access.canJoin;
  const entryHint =
    !paid
      ? access.label
      : entryState === "too-early" && timeRange
        ? entryOpensHint(timeRange.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs)
        : entryState === "ended"
          ? "This session has ended"
          : "Upcoming";
  // The button's own label must never contradict entryHint below it — a
  // session that's already ended must say so, not fall back to a generic
  // "Upcoming" that's only actually true in the too-early case.
  const buttonLabel = enterable ? "Enter Classroom" : entryState === "ended" ? "Session Ended" : "Upcoming";
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Next Session</h2>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-ensena-primary/5 px-4 py-2.5 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{weekday}</span>
          <span className="font-heading text-xl font-bold text-ensena-ink">{day}</span>
          <span className="text-xs font-medium uppercase text-ensena-muted">{month}</span>
        </div>
        <div className="flex-1">
          <span className="inline-block rounded-full bg-ensena-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ensena-ink">{groupClass.subject}</span>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ensena-ink">
            <Clock className="size-4 text-ensena-muted" /> {groupClass.schedule.split("· ")[1] ?? groupClass.schedule}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ensena-muted">
            <Video className="size-4" /> {groupClass.mode}
          </p>
        </div>
        <Button
          disabled={!enterable}
          {...(enterable ? { nativeButton: false, render: <Link href={`/student-dashboard/classroom/group/${groupClass.id}`} /> } : {})}
          className="h-11 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white sm:w-auto"
        >
          <Video className="size-4" /> {buttonLabel}
        </Button>
      </div>
      {enterable ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" /> You can join now.
        </p>
      ) : (
        <p className="mt-2 text-xs font-medium text-ensena-primary">{entryHint}</p>
      )}
    </div>
  );
}

function AboutClassCard({ groupClass }: ViewProps) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">About this Class</h2>
      <p className="mt-2 text-sm text-ensena-muted">{groupClass.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {groupClass.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-ensena-primary/5 px-3 py-1 text-xs font-medium text-ensena-primary">{tag}</span>
        ))}
      </div>
      {groupClassResources.length > 0 && (
        <div className="mt-4 border-t border-ensena-border pt-4">
          <p className="text-sm font-semibold text-ensena-ink">Class Materials</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {groupClassResources.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm text-ensena-muted">
                <FileText className="size-3.5 shrink-0 text-ensena-muted" /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ groupClass }: ViewProps) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-sm font-semibold text-ensena-ink">Schedule</h2>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ensena-primary/10 text-ensena-primary">
          <Calendar className="size-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ensena-ink">Weekly</p>
          <p className="text-xs text-ensena-muted">{groupClass.schedule}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-ensena-border pt-3">
        <p className="text-xs text-ensena-muted">Cohort Duration</p>
        <p className="text-sm font-medium text-ensena-ink">{groupClass.cohortStart} – {groupClass.cohortEnd}</p>
      </div>
    </div>
  );
}

const sessionStatusStyles: Record<StudentGroupClass["sessions"][number]["status"], string> = {
  Upcoming: "bg-ensena-bg-soft text-ensena-muted",
  Live: "bg-emerald-100 text-emerald-700",
  Completed: "bg-ensena-success/10 text-ensena-success",
};

// Only a real enrollment's rows (weekNumber present) have a genuine ISO
// `date` (see enrollmentToStudentGroupClass) — the schedule's own time-of-
// day part combined with THAT row's own date, never the class's single
// `nextSessionDate`, so every row in the list gets its own real entry
// window instead of only whichever session happens to be "next."
function sessionTimeRange(dateISO: string, schedule: string): { startMs: number; endMs: number } | null {
  const timePart = schedule.split("· ")[1];
  if (!timePart) return null;
  const [startStr, endStr] = timePart.split("–").map((s) => s.trim());
  if (!startStr || !endStr) return null;
  return { startMs: parseLegacyDateTime(dateISO, startStr), endMs: parseLegacyDateTime(dateISO, endStr) };
}

const paymentPillStyles: Partial<Record<ReturnType<typeof getSessionAccessState>["state"], string>> = {
  "payment-required": "bg-amber-100 text-amber-700",
  "payment-scheduled": "bg-sky-100 text-sky-700",
  "not-paid": "bg-rose-100 text-rose-700",
};

// The two hand-authored seed classes have no sessionNumber/weekNumber (a
// flat list, exactly as before); a real enrollment's sessions all carry
// both (see group-class-schedule.ts) and render grouped by week instead.
function SessionsCard({ groupClass, nowMs }: ViewProps) {
  // See NextSessionCard's identical comment — keeps hasSessionAccess below
  // reactive to a payment/retry/cancel happening elsewhere on this page.
  usePaymentPlans();
  const subscription = getSubscriptionForBooking(groupClass.id);
  const hasWeeks = groupClass.sessions.some((s) => s.weekNumber !== undefined);
  const sessionsByWeek = new Map<number, StudentGroupClass["sessions"]>();
  if (hasWeeks) {
    for (const s of groupClass.sessions) {
      const wk = s.weekNumber ?? 1;
      sessionsByWeek.set(wk, [...(sessionsByWeek.get(wk) ?? []), s]);
    }
  }

  // A one-time payer (or a payer whose auto-pay was cancelled) has no
  // subscription to retry — the only way to unlock a locked week is to pay
  // for exactly that week, right here, scoped to just its own sessions (see
  // session-access-state.ts: paying for a week must never require a
  // per-session payment, and must never touch any other week).
  function handlePayForWeek(sessions: StudentGroupClass["sessions"]) {
    recordPayment({
      kind: "Group",
      bookingId: groupClass.id,
      studentName: dashboardStudent.name,
      scope: "week",
      coversSessionIds: sessions.map((s) => `${groupClass.id}-session-${s.sessionNumber}`),
      amount: groupClass.pricePerSession * sessions.length,
      mode: "oneTime",
    });
  }

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-sm font-semibold text-ensena-ink">Your Sessions</h2>
      {hasWeeks ? (
        <div className="mt-3 flex flex-col gap-4">
          {[...sessionsByWeek.entries()].map(([week, sessions]) => {
            const weekComplete = sessions.every((s) => s.status === "Completed");
            const weekLabel = `Week ${week}`;
            const accessBySession = sessions.map((s) => {
              const timeRange = sessionTimeRange(s.date, groupClass.schedule);
              const entryState = timeRange ? getClassEntryState({ ...timeRange, role: "student", nowMs }) : "too-early";
              const sessionId = `${groupClass.id}-session-${s.sessionNumber}`;
              const paid = hasSessionAccess(groupClass.id, sessionId, dashboardStudent.name);
              const access = getSessionAccessState({
                hasPaid: paid,
                entryState,
                unpaidTiming: paid ? undefined : getUnpaidPaymentTiming(subscription?.status ?? null, subscription && subscription.status !== "cancelled" ? subscription.nextChargeAtMs : null, nowMs),
                weekLabel,
              });
              return { session: s, access };
            });
            const weekNeedsManualPayment = accessBySession.some(({ access }) => access.state === "payment-required");
            return (
              <div key={week}>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ensena-primary">
                  {weekLabel}
                  {weekComplete && (
                    <span className="flex items-center gap-1 text-ensena-success">
                      <Check className="size-3.5" /> Complete
                    </span>
                  )}
                  {!subscription && weekNeedsManualPayment && (
                    <button
                      type="button"
                      onClick={() => handlePayForWeek(sessions)}
                      className="ml-auto rounded-full bg-ensena-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-ensena-primary/90"
                    >
                      Pay for {weekLabel}
                    </button>
                  )}
                </p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {accessBySession.map(({ session: s, access }) => (
                    <li key={s.sessionNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ensena-border p-2.5 text-sm">
                      <span className="text-ensena-ink">
                        {s.date}
                        <span className="ml-2 text-xs text-ensena-muted">Session {s.sessionNumber} of {groupClass.sessions.length}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", sessionStatusStyles[s.status])}>{s.status}</span>
                        {paymentPillStyles[access.state] && (
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", paymentPillStyles[access.state])}>{access.label}</span>
                        )}
                        {access.canJoin && (
                          <Button
                            nativeButton={false}
                            render={<Link href={`/student-dashboard/classroom/group/${groupClass.id}`} />}
                            className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white"
                          >
                            <Video className="size-3.5" /> Enter Class
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {groupClass.sessions.map((s) => (
            <li key={s.date} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                {s.status === "Completed" ? (
                  <CheckCircle2 className="size-4 text-ensena-success" />
                ) : (
                  <Circle className="size-4 text-ensena-muted" />
                )}
                <span className="text-ensena-ink">{s.date}</span>
              </span>
              <span className={cn("text-xs font-medium", s.status === "Completed" ? "text-ensena-success" : "text-ensena-muted")}>{s.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TutorCard({ groupClass, onMessageTutor }: ViewProps) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-sm font-semibold text-ensena-ink">Tutor</h2>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
          <Image src={groupClass.tutorImage} alt={groupClass.tutor} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ensena-ink">{groupClass.tutor}</p>
          <p className="text-xs text-ensena-muted">{groupClass.subject} Tutor</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onMessageTutor}
        className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
      >
        <MessageSquare className="size-4" /> Message Tutor
      </button>
    </div>
  );
}

// Mirrors ReviewSection in class-detail-client.tsx (same shared review
// backend — reviews-store.ts/WriteReviewModal — just scoped to the whole
// recurring enrollment rather than a single completed lesson, since that's
// what this page represents). One review per (booking, direction, tutor)
// for the life of the enrollment, not one per individual session.
function ReviewTeacherCard({ groupClass, bookingId, autoOpen }: ViewProps & { autoOpen: boolean }) {
  const allReviews = useReviews();
  const [error, setError] = useState<string | null>(null);
  const existing = allReviews.find((r) => r.direction === "student-to-tutor" && r.bookingId === bookingId && r.reviewerName === dashboardStudent.name);
  const [open, setOpen] = useState(() => autoOpen && !existing);

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Review</h2>
      {error && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p>}
      {existing ? (
        <div className="mt-3">
          <ReviewCard review={existing} />
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-ensena-muted">Let {groupClass.tutor} and other students know how this class went.</p>
          <Button onClick={() => setOpen(true)} className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            <Star className="size-4" /> Leave a Review
          </Button>
        </>
      )}
      <WriteReviewModal
        open={open}
        onClose={() => setOpen(false)}
        recipientName={groupClass.tutor}
        title="Review Your Teacher"
        onSubmit={(rating, comment) => {
          const result = submitReview({
            direction: "student-to-tutor",
            reviewerName: dashboardStudent.name,
            reviewerImage: dashboardStudent.image,
            recipientName: groupClass.tutor,
            recipientImage: groupClass.tutorImage,
            bookingId,
            bookingType: "Group",
            subject: groupClass.subject,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            setError(result.userMessage);
            return;
          }
          setError(null);
          setOpen(false);
        }}
      />
    </div>
  );
}

// Real attendance evidence, scoped to this student's own record — the app's
// classroomId scheme is one id per recurring group class (`group:${id}`,
// see classroom-data.ts), not per individual session occurrence, so this is
// necessarily "has this student ever joined THIS class's room at all"
// rather than a per-occurrence attendance history. Purely informational,
// same as the Private-lesson equivalent in class-detail-client.tsx — never
// affects payment/review state.
function AttendanceCard({ groupClass }: ViewProps) {
  const records = useAttendance(`group:${groupClass.id}`);
  const studentAttended = records.some((r) => r.participantRole === "student");
  const tutorAttended = records.some((r) => r.participantRole === "tutor");
  if (studentAttended && tutorAttended) return null; // the common case — no need to call it out
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-ensena-ink">Attendance</p>
      <p className="mt-1 text-xs font-medium text-amber-800">
        {!studentAttended && !tutorAttended
          ? "Neither you nor your tutor have joined this class yet."
          : !studentAttended
            ? "You haven't joined a session of this class yet."
            : `${groupClass.tutor} hasn't joined a session of this class yet.`}
      </p>
    </div>
  );
}

// Sessions covering the Nth billing period since signup (0-indexed, matching
// getPeriodsPaid) — the exact same week-1 / 4-week slicing logic the review
// step priced the plan by, just parameterized by period instead of hardcoded
// to period 0, so a retry after a failure unlocks the right sessions.
function sessionsForPeriod(sessions: StudentGroupClass["sessions"], frequency: Subscription["frequency"], periodIndex: number) {
  if (frequency === "weekly") return sessions.filter((s) => (s.weekNumber ?? 1) === periodIndex + 1);
  return sessions.filter((s) => {
    const wk = s.weekNumber ?? 1;
    return wk > periodIndex * 4 && wk <= (periodIndex + 1) * 4;
  });
}

function PaymentCard({ groupClass, nowMs }: ViewProps) {
  const plans = usePaymentPlans().filter((p) => p.bookingId === groupClass.id);
  const subscriptions = useSubscriptions();
  const subscription = subscriptions.find((s) => s.bookingId === groupClass.id);

  // The automatic recurring-billing tick: there is no real background job in
  // this app, so "the system auto-charges before the next period" is made
  // real the honest way every other simulated-but-real feature here is — by
  // running the charge attempt right when the affected page is viewed,
  // through the exact same idempotent chargeSubscription a manual retry
  // uses. A still-in-the-future charge date is left alone (that's the
  // "Payment scheduled" state — see session-access-state.ts); only a
  // genuinely due one is processed, and re-running this on every render is
  // safe because the period id is deterministic.
  useEffect(() => {
    if (!subscription || subscription.status !== "active" || subscription.nextChargeAtMs > nowMs) return;
    const periodIndex = getPeriodsPaid(subscription.id);
    const coveredSessionIds = sessionsForPeriod(groupClass.sessions, subscription.frequency, periodIndex).map(
      (s) => `${groupClass.id}-session-${s.sessionNumber}`
    );
    if (coveredSessionIds.length === 0) return;
    chargeSubscription(subscription.id, periodIndex, coveredSessionIds);
  }, [subscription, groupClass, nowMs]);

  // No payment record at all — a legacy/seed booking that predates this
  // system (see payment-plans-store.ts's hasSessionAccess grandfather rule)
  // — keep showing the same friendly, always-confirmed message it always did.
  if (plans.length === 0 && !subscription) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-sm font-semibold text-ensena-ink">Payment</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
              {formatNaira(groupClass.pricePerSession)} <span className="font-normal text-ensena-muted">/ session</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
            </p>
            <p className="mt-0.5 text-xs text-ensena-muted">Thank you! Your payment is confirmed.</p>
          </div>
        </div>
      </div>
    );
  }

  function handleRetry() {
    if (!subscription) return;
    const periodIndex = getPeriodsPaid(subscription.id);
    const coveredSessionIds = sessionsForPeriod(groupClass.sessions, subscription.frequency, periodIndex).map(
      (s) => `${groupClass.id}-session-${s.sessionNumber}`
    );
    chargeSubscription(subscription.id, periodIndex, coveredSessionIds);
  }

  function handleCancel() {
    if (!subscription) return;
    cancelSubscription(subscription.id);
  }

  const totalPaid = plans.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-sm font-semibold text-ensena-ink">Payment</h2>

      {subscription?.status === "pastDue" && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-700">Payment failed</p>
            <p className="mt-0.5 text-xs text-rose-700">
              Your last {subscription.frequency} charge of {formatNaira(subscription.amountPerCharge)}{" "}
              didn&apos;t go through. Your sessions up to now stay available; retry to keep upcoming sessions unlocked.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button onClick={handleRetry} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                Retry Payment
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                Cancel auto-pay
              </button>
            </div>
          </div>
        </div>
      )}

      {subscription?.status === "active" && (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
              {formatNaira(subscription.amountPerCharge)} <span className="font-normal text-ensena-muted">/ {subscription.frequency === "weekly" ? "week" : "month"}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Auto-pay active</span>
            </p>
            <p className="mt-0.5 text-xs text-ensena-muted">
              Next charge: {new Date(subscription.nextChargeAtMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <button type="button" onClick={handleCancel} className="mt-1.5 text-xs font-medium text-ensena-muted hover:text-rose-600 hover:underline">
              Cancel auto-pay
            </button>
          </div>
        </div>
      )}

      {subscription?.status === "cancelled" && (
        <p className="mt-3 text-xs text-ensena-muted">Auto-pay was cancelled. Pay again anytime from a locked session below to keep attending.</p>
      )}

      {!subscription && (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
              {formatNaira(totalPaid)} <span className="font-normal text-ensena-muted">paid so far</span>
            </p>
            <p className="mt-0.5 text-xs text-ensena-muted">Pay again anytime from a locked session below to unlock more.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentGroupClassDetailClient({
  id,
  initialGroupClass,
}: {
  id: string;
  initialGroupClass: StudentGroupClass | null;
}) {
  const enrollments = useGroupClassEnrollments();
  const todayISO = useTodayISO();
  const liveGroupClass = enrollments
    .filter((e) => e.studentName === dashboardStudent.name && e.id === id)
    .map((e) => enrollmentToStudentGroupClass(e, todayISO))
    .find((c): c is StudentGroupClass => c !== null);
  const groupClass = initialGroupClass ?? liveGroupClass ?? null;

  if (!groupClass) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center">
        <p className="text-sm text-ensena-muted">This class could not be found.</p>
        <Link href="/student-dashboard/group-classes" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← Back to Group Classes
        </Link>
      </div>
    );
  }

  return <StudentGroupClassDetailContent groupClass={groupClass} />;
}

function StudentGroupClassDetailContent({ groupClass }: { groupClass: StudentGroupClass }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewPromptActive = searchParams.get("reviewPrompt") === "1";
  const nowMs = useNowMs();
  const bookingId = isValidBookingReference(groupClass.id) ? groupClass.id : buildBookingReference("group", groupClass.id);
  const hasCompletedSession = groupClass.sessions.some((s) => s.status === "Completed");
  // The review only unlocks once the WHOLE programme is done, not just its
  // first session — a materially different, stricter gate than the
  // attendance evidence above, which is worth showing as soon as there's
  // anything to show.
  const bookingComplete = isGroupBookingComplete(groupClass.sessions);

  function messageTutor() {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(groupClass.tutor)}`);
  }

  const viewProps: ViewProps = { groupClass, bookingId, nowMs, onMessageTutor: messageTutor };

  return (
    <div>
      <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        <ArrowLeft className="size-4" /> My Classes
      </Link>

      {/* Mobile: single stacked column */}
      <div className="mt-5 flex flex-col gap-5 lg:hidden">
        <HeaderCard {...viewProps} />
        <ClassOverviewCard {...viewProps} />
        <NextSessionCard {...viewProps} />
        <ScheduleCard {...viewProps} />
        <SessionsCard {...viewProps} />
        {hasCompletedSession && <AttendanceCard {...viewProps} />}
        {bookingComplete && <ReviewTeacherCard {...viewProps} autoOpen={reviewPromptActive} />}
        <TutorCard {...viewProps} />
        <PaymentCard {...viewProps} />
        <AboutClassCard {...viewProps} />
        <NeedHelpCard role="Student" context="group-class" relatedRecordType="group-class" relatedRecordId={bookingId} relatedRecordLabel={groupClass.title} />
      </div>

      {/* Desktop: two-column layout */}
      <div className="mt-5 hidden lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <HeaderCard {...viewProps} />
          <ClassOverviewCard {...viewProps} />
          <NextSessionCard {...viewProps} />
          <AboutClassCard {...viewProps} />
          {hasCompletedSession && <AttendanceCard {...viewProps} />}
          {bookingComplete && <ReviewTeacherCard {...viewProps} autoOpen={reviewPromptActive} />}
        </div>
        <div className="flex flex-col gap-5">
          <ScheduleCard {...viewProps} />
          <SessionsCard {...viewProps} />
          <TutorCard {...viewProps} />
          <PaymentCard {...viewProps} />
          <NeedHelpCard role="Student" context="group-class" relatedRecordType="group-class" relatedRecordId={bookingId} relatedRecordLabel={groupClass.title} />
        </div>
      </div>
    </div>
  );
}
