"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Check, Clock, Copy, Hourglass, MessageSquare, ShieldCheck, Star, Video } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { BookingInfoCard } from "@/components/shared/lessons/booking-info-card";
import { EntryCountdown } from "@/components/shared/lessons/entry-countdown";
import { InfoTile } from "@/components/shared/lessons/info-tile";
import { PaymentPlanCard } from "@/components/shared/lessons/payment-plan-card";
import { ScheduleSummaryCard } from "@/components/shared/lessons/schedule-summary-card";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { useAttendance } from "@/hooks/use-attendance";
import { completionStatus, useEscrowConfirmFlow } from "@/hooks/use-escrow-confirm-flow";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useNowMs } from "@/hooks/use-now-ms";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useReviews, useTutorRating } from "@/hooks/use-reviews";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS, type ClassEntryState } from "@/lib/class-entry-access";
import { formatClassDate, formatClassTime } from "@/lib/class-date-format";
import { formatNaira } from "@/lib/format";
import { getSubscriptionForBooking, hasSessionAccess, recordPayment, type Subscription } from "@/lib/payment-plans-store";
import { isPrivateBookingComplete, summarizeSchedule } from "@/lib/private-booking-schedule";
import { submitReview } from "@/lib/reviews-store";
import { getSessionAccessState, getUnpaidPaymentTiming, type SessionAccessResult } from "@/lib/session-access-state";
import { enrollmentToStudentLesson, privateLessonToStudentLesson } from "@/lib/student-booking-adapters";
import { dashboardStudent, getPrivateLessonTimeRange, studentGroupClasses, studentLessons, type StudentLesson } from "@/lib/student-dashboard-data";
import { tutorListings } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const DISCOVERY_STUDENT_NAME = "Sarah Johnson";

// Kept local — only the Discovery Session and Group Class branches below
// still use this directly (their own "Booking Information" markup is out
// of scope for this Private Class task and is left exactly as it was); the
// Private Lesson branches now use the shared BookingInfoCard instead.
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

function tutorRatingFor(name: string): { rating: number; reviews: number } | null {
  const t = tutorListings.find((t) => t.name === name);
  return t ? { rating: t.rating, reviews: t.reviews } : null;
}

function parseNairaAmount(payment: string): number {
  const match = payment.replace(/,/g, "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

interface PrivateLessonViewProps {
  title: string;
  tutor: string;
  tutorImage: string;
  rating: { rating: number; reviews: number } | null;
  dateLabel: string;
  timeLabel: string;
  duration: string;
  bookingId: string;
  notes: string | undefined;
  priceAmount: number;
  isUpcoming: boolean;
  classroomHref: string | undefined;
  /** Real, timestamp-based — separate from `isUpcoming` (a status label). classroomHref can be set (the lesson IS upcoming) while this is still false (it's more than an hour before the scheduled start). */
  canEnterNow: boolean;
  entryHint: ReactNode | undefined;
  /** Real, additive attendance evidence (class-attendance-store.ts) — undefined for the common "both showed up" case, since that's not worth calling out. Never affects isConfirmed/status above. */
  attendanceNote: string | undefined;
  isCancelled: boolean;
  isConfirmed: boolean;
  status: { label: string; tint: string; action: "confirm" | "view" };
  hasEscrow: boolean;
  onConfirm: () => void;
  onDispute: () => void;
  onMessageTutor: () => void;
}

function PrivateHeaderCard({ title, tutor, tutorImage, rating }: Pick<PrivateLessonViewProps, "title" | "tutor" | "tutorImage" | "rating">) {
  // Blended live rating — this component is unconditionally mounted
  // whenever rendered (unlike the parent, which has several early
  // returns), so calling the hook here is safe regardless of which branch
  // the parent took to get here.
  const liveRating = useTutorRating(tutor, rating?.rating ?? 0, rating?.reviews ?? 0);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:flex-row sm:items-center">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full">
        <Image src={tutorImage} alt={tutor} fill sizes="80px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words font-heading text-xl font-semibold text-ensena-ink">{title}</h1>
          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Private Lesson</span>
        </div>
        <p className="text-sm font-medium text-ensena-primary">with {tutor}</p>
        {liveRating.reviews > 0 && (
          <p className="mt-1 flex items-center gap-1 text-sm text-ensena-ink">
            <Star className="size-3.5 fill-amber-400 text-amber-400" /> {liveRating.rating} ({liveRating.reviews} reviews)
          </p>
        )}
      </div>
    </div>
  );
}

function SessionInfoSection({ dateLabel, timeLabel, duration }: Pick<PrivateLessonViewProps, "dateLabel" | "timeLabel" | "duration">) {
  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Session Information</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
        <InfoTile icon={Calendar} label="Starting Date" value={dateLabel} />
        <InfoTile icon={Clock} label="Time" value={timeLabel} />
        <InfoTile icon={Hourglass} label="Duration" value={duration} />
        <InfoTile icon={Video} label="Mode" value="Online" />
      </div>
    </div>
  );
}

function LessonStatusCard({
  isUpcoming,
  classroomHref,
  canEnterNow,
  entryHint,
  attendanceNote,
  isCancelled,
  isConfirmed,
  status,
  hasEscrow,
  onConfirm,
  onDispute,
}: Pick<PrivateLessonViewProps, "isUpcoming" | "classroomHref" | "canEnterNow" | "entryHint" | "attendanceNote" | "isCancelled" | "isConfirmed" | "status" | "hasEscrow" | "onConfirm" | "onDispute">) {
  const enterable = Boolean(classroomHref) && canEnterNow;
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Lesson Status</h2>
      {isUpcoming ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ensena-primary">Upcoming</p>
          <p className="mt-1 text-sm text-ensena-muted">This lesson hasn&apos;t started yet.</p>
          <Button
            disabled={!enterable}
            {...(enterable ? { nativeButton: false, render: <Link href={classroomHref!} /> } : {})}
            className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white"
          >
            <Video className="size-4" /> Enter Classroom
          </Button>
          {!enterable && entryHint && <p className="mt-2 text-xs font-medium text-ensena-primary">{entryHint}</p>}
        </>
      ) : isCancelled ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ensena-muted">This lesson was cancelled.</p>
      ) : isConfirmed ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Check className="size-4" /> Lesson Confirmed
          </p>
          <p className="mt-1 text-sm text-ensena-muted">You confirmed that this lesson was completed.</p>
          {hasEscrow && (
            <Button variant="outline" onClick={onConfirm} className="mt-3 h-11 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">
              View Confirmation
            </Button>
          )}
        </>
      ) : status.action === "confirm" ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700">Awaiting Confirmation</p>
          <p className="mt-1 text-sm text-ensena-muted">Please confirm that your lesson took place so the tutor&apos;s payment can be released.</p>
          <Button onClick={onConfirm} className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            Confirm Lesson
          </Button>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-700">Under Review by Ensena Support</p>
      )}
      {attendanceNote && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">{attendanceNote}</p>
      )}
      {hasEscrow && status.action !== "view" && (
        <div className="mt-3 border-t border-ensena-border pt-3">
          <p className="text-sm font-semibold text-ensena-ink">Something went wrong?</p>
          <button type="button" onClick={onDispute} className="text-sm font-medium text-ensena-primary hover:underline">
            Report a Problem
          </button>
        </div>
      )}
    </div>
  );
}

function TutorCard({ title, tutor, tutorImage, onMessageTutor }: Pick<PrivateLessonViewProps, "title" | "tutor" | "tutorImage" | "onMessageTutor">) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Tutor</h2>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
          <Image src={tutorImage} alt={tutor} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ensena-ink">{tutor}</p>
          <p className="text-xs text-ensena-muted">{title} Tutor</p>
        </div>
      </div>
      <button type="button" onClick={onMessageTutor} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
        <MessageSquare className="size-4" /> Message Tutor
      </button>
    </div>
  );
}

function NotesCard({ notes }: Pick<PrivateLessonViewProps, "notes">) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Lesson Notes</h2>
      <p className="mt-2 text-sm text-ensena-muted">{notes || "No lesson notes were added."}</p>
    </div>
  );
}

function PaymentCard({ priceAmount }: Pick<PrivateLessonViewProps, "priceAmount">) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Summary</h2>
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-ensena-muted">Lesson price</span>
        <span className="font-medium text-ensena-ink">{formatNaira(priceAmount)}</span>
      </div>
      <div className="mt-1.5 flex justify-between text-sm">
        <span className="text-ensena-muted">Ensena service fee</span>
        <span className="font-medium text-ensena-muted">—</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3 text-sm font-semibold text-ensena-ink">
        <span>Total Paid</span>
        <span className="flex items-center gap-2">
          {formatNaira(priceAmount)}
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
        </span>
      </div>
    </div>
  );
}

// Shared by the Private Lesson and Group Class branches — a student can
// leave exactly one review per (booking, direction); once submitted it's
// permanent from here on (see write-review-modal.tsx / reviews-store.ts).
function ReviewSection({
  bookingId,
  bookingType,
  subject,
  tutor,
  tutorImage,
  autoOpen,
}: {
  bookingId: string;
  bookingType: "Private" | "Group";
  subject: string;
  tutor: string;
  tutorImage: string;
  /** True right when the student lands here straight from ending a Private/Group class (see review-prompt.ts) — opens the popup immediately, once, instead of waiting for a manual "Leave a Review" click. Never set for a review already on record. */
  autoOpen?: boolean;
}) {
  const allReviews = useReviews();
  const [error, setError] = useState<string | null>(null);
  const existing = allReviews.find((r) => r.direction === "student-to-tutor" && r.bookingId === bookingId && r.reviewerName === dashboardStudent.name);
  const [open, setOpen] = useState(() => Boolean(autoOpen) && !existing);

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
          <p className="mt-2 text-sm text-ensena-muted">Let {tutor} and other students know how this lesson went.</p>
          <Button onClick={() => setOpen(true)} className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            <Star className="size-4" /> Leave a Review
          </Button>
        </>
      )}
      <WriteReviewModal
        open={open}
        onClose={() => setOpen(false)}
        recipientName={tutor}
        title="Review Your Teacher"
        onSubmit={(rating, comment) => {
          const result = submitReview({
            direction: "student-to-tutor",
            reviewerName: dashboardStudent.name,
            reviewerImage: dashboardStudent.image,
            recipientName: tutor,
            recipientImage: tutorImage,
            bookingId,
            bookingType,
            subject,
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

interface ProgrammeSessionRow {
  studentLesson: StudentLesson;
  isCancelled: boolean;
  hasEnded: boolean;
  canEnterNow: boolean;
  paid: boolean;
  entryState: ClassEntryState | null;
  displayStatus: "Upcoming" | "Live" | "Completed" | "Cancelled";
  classroomHref: string;
  access: SessionAccessResult;
  price: number;
}

// Mirrors the exact same real, timestamp-based logic already used for the
// single-lesson view below (getClassEntryState/getPrivateLessonTimeRange) —
// a real, runtime-created PrivateLesson never gets its own `status` field
// flipped to "Completed" just because its scheduled time passed, so
// "hasEnded" here is time-derived, not read off `status` alone.
//
// `access` is this row's real payment/entry state via the one centralized
// getSessionAccessState (session-access-state.ts) — the same function the
// Group Class detail page uses — so a locked session reads the same words
// ("Payment required" / "Payment scheduled" / "Not paid") everywhere in the
// app, not a locally-invented pill per screen.
function deriveProgrammeRow(studentLesson: StudentLesson, nowMs: number, subscription: Subscription | undefined): ProgrammeSessionRow {
  const isCancelled = studentLesson.status === "Cancelled";
  const isUpcomingStatus = studentLesson.status === "Upcoming" || studentLesson.status === "Rescheduled";
  const realEntryState = getClassEntryState({ ...getPrivateLessonTimeRange(studentLesson), role: "student", nowMs });
  const entryState = !isCancelled && isUpcomingStatus ? realEntryState : null;
  const hasEnded = !isCancelled && (!isUpcomingStatus || entryState === "ended");
  const bookingId = studentLesson.bookingId ?? studentLesson.id;
  const paid = hasSessionAccess(bookingId, studentLesson.id, dashboardStudent.name);
  const canEnterNow = (entryState ? canEnterClassroom(entryState) : false) && paid;
  const displayStatus: ProgrammeSessionRow["displayStatus"] = isCancelled
    ? "Cancelled"
    : hasEnded
      ? "Completed"
      : entryState === "live"
        ? "Live"
        : "Upcoming";
  const access = getSessionAccessState({
    hasPaid: paid,
    entryState: realEntryState,
    cancelled: isCancelled,
    unpaidTiming: paid
      ? undefined
      : getUnpaidPaymentTiming(subscription?.status ?? null, subscription && subscription.status !== "cancelled" ? subscription.nextChargeAtMs : null, nowMs),
    weekLabel: studentLesson.weekNumber ? `Week ${studentLesson.weekNumber}` : undefined,
  });
  return {
    studentLesson,
    isCancelled,
    hasEnded,
    canEnterNow,
    paid,
    entryState,
    displayStatus,
    classroomHref: `/student-dashboard/classroom/private/${studentLesson.id}`,
    access,
    price: parseNairaAmount(studentLesson.payment),
  };
}

const programmeStatusStyles: Record<ProgrammeSessionRow["displayStatus"], string> = {
  Upcoming: "bg-ensena-bg-soft text-ensena-muted",
  Live: "bg-emerald-100 text-emerald-700",
  Completed: "bg-ensena-success/10 text-ensena-success",
  Cancelled: "bg-rose-50 text-rose-600",
};

const paymentPillStyles: Partial<Record<SessionAccessResult["state"], string>> = {
  "payment-required": "bg-amber-100 text-amber-700",
  "payment-scheduled": "bg-sky-100 text-sky-700",
  "not-paid": "bg-rose-100 text-rose-700",
};

// The centerpiece of a multi-session booking's View Class page — every
// sibling lesson the review-confirm step created together, grouped by real
// week number and each with its own independent Enter Class control (reusing
// the exact same per-instance entry-window logic as a standalone lesson —
// nothing here changes how or when a single session becomes enterable).
function ProgrammeScheduleCard({
  rowsByWeek,
  totalSessions,
  bookingId,
  hasSubscription,
}: {
  rowsByWeek: Map<number, ProgrammeSessionRow[]>;
  totalSessions: number;
  bookingId: string;
  hasSubscription: boolean;
}) {
  // A one-time payer (or one whose auto-pay was cancelled) has no
  // subscription to retry — paying for exactly this week is the only way to
  // unlock it, scoped to just its own sessions (never the whole booking).
  function handlePayForWeek(rows: ProgrammeSessionRow[]) {
    recordPayment({
      kind: "Private",
      bookingId,
      studentName: dashboardStudent.name,
      scope: "week",
      coversSessionIds: rows.map((r) => r.studentLesson.id),
      amount: rows.reduce((sum, r) => sum + r.price, 0),
      mode: "oneTime",
    });
  }

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Sessions</h2>
      <div className="mt-3 flex flex-col gap-5">
        {[...rowsByWeek.entries()].map(([week, rows]) => {
          const weekComplete = rows.every((r) => r.hasEnded || r.isCancelled);
          const weekNeedsManualPayment = rows.some((r) => r.access.state === "payment-required");
          return (
            <div key={week}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ensena-primary">
                Week {week}
                {weekComplete && (
                  <span className="flex items-center gap-1 text-ensena-success">
                    <Check className="size-3.5" /> Complete
                  </span>
                )}
                {!hasSubscription && weekNeedsManualPayment && (
                  <button
                    type="button"
                    onClick={() => handlePayForWeek(rows)}
                    className="ml-auto rounded-full bg-ensena-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-ensena-primary/90"
                  >
                    Pay for Week {week}
                  </button>
                )}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {rows.map((row) => (
                  <div
                    key={row.studentLesson.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ensena-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ensena-ink">
                        {row.studentLesson.date} · {row.studentLesson.time}
                      </p>
                      <p className="text-xs text-ensena-muted">
                        Session {row.studentLesson.sessionNumber} of {totalSessions}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", programmeStatusStyles[row.displayStatus])}>
                        {row.displayStatus}
                      </span>
                      {paymentPillStyles[row.access.state] && (
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", paymentPillStyles[row.access.state])}>
                          {row.access.label}
                        </span>
                      )}
                      {row.canEnterNow && (
                        <Button
                          nativeButton={false}
                          render={<Link href={row.classroomHref} />}
                          className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white"
                        >
                          <Video className="size-3.5" /> Enter Class
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EscrowBanner({ isConfirmed }: Pick<PrivateLessonViewProps, "isConfirmed">) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 text-sm">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
      <p className="text-ensena-muted">
        {isConfirmed ? "This payment has been released to your tutor." : "Your payment is held securely in escrow. Once you confirm the lesson, it will be released to the tutor."}
      </p>
    </div>
  );
}

export function ClassDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewPromptActive = searchParams.get("reviewPrompt") === "1";
  const nowMs = useNowMs();
  // Called unconditionally (Rules of Hooks) even though it's only meaningful
  // once we know this is genuinely the Private-lesson branch further below —
  // `private:${id}` is still a stable, harmless key to read before that.
  const privateAttendanceRecords = useAttendance(`private:${id}`);
  const { myConfirmations, openConfirm, openDispute, modals } = useEscrowConfirmFlow();

  function messageTutor(name: string) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(name)}`);
  }

  const discoverySessions = useAllDiscoverySessions();
  const realPrivateLessons = usePrivateLessons();
  const realEnrollments = useGroupClassEnrollments();
  const escrow = myConfirmations.find((l) => l.id === id);
  const lesson: StudentLesson | undefined =
    studentLessons.find((l) => l.id === id) ??
    realPrivateLessons
      .filter((l) => l.student === dashboardStudent.name && isValidBookingReference(l.id))
      .map(privateLessonToStudentLesson)
      .find((l) => l.id === id) ??
    realEnrollments
      .filter((e) => e.studentName === dashboardStudent.name)
      .map(enrollmentToStudentLesson)
      .filter((l): l is StudentLesson => l !== null)
      .find((l) => l.id === id);
  const discovery = discoverySessions.find((d) => d.id === id && d.student === DISCOVERY_STUDENT_NAME);

  if (!escrow && !lesson && !discovery) notFound();

  // ---- Discovery Session ----
  if (discovery) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
          <ArrowLeft className="size-4" /> My Classes
        </Link>

        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
              <Image src={discovery.tutorImage} alt={discovery.tutor} fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <span className="mb-1 inline-block rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">Discovery Session</span>
              <h1 className="font-heading text-xl font-semibold text-ensena-ink">with {discovery.tutor}</h1>
              <p className="text-sm text-ensena-muted">{discovery.subject}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile icon={Calendar} label="Date" value={discovery.date} />
          <InfoTile icon={Clock} label="Time" value={`${discovery.time} · ${discovery.durationMins} min`} />
        </div>

        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking Information</h2>
          <p className="mt-3 text-xs text-ensena-muted">Booking ID</p>
          <p className="flex items-center gap-2 font-mono text-base font-semibold text-ensena-ink">
            {discovery.bookingReference} <CopyId value={discovery.bookingReference} />
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-4" />
          </span>
          <p className="text-sm font-semibold text-emerald-700">Completed</p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={() => messageTutor(discovery.tutor)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
            <MessageSquare className="size-4" /> Message Tutor
          </button>
          <Link href="/student-dashboard/find-a-tutor" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">
            Book Regular Lessons
          </Link>
        </div>
      </div>
    );
  }

  // ---- Group Class (either an escrow-tracked session or a plain studentLessons row) ----
  const isGroup = (escrow && escrow.type === "Group") || (lesson && lesson.type === "Group");
  if (isGroup) {
    const title = escrow?.subject ?? lesson!.subject;
    const tutor = escrow?.tutor ?? lesson!.tutor;
    const dateLabel = escrow ? formatClassDate(new Date(escrow.completedAt)) : lesson!.date;
    const timeLabel = escrow ? formatClassTime(new Date(escrow.completedAt)) : lesson!.time;
    const groupClassId = escrow?.groupClassId ?? studentGroupClasses.find((c) => c.tutor === tutor && c.title === title)?.id;
    const rawGroupId = escrow?.id ?? lesson!.id;
    const bookingId = isValidBookingReference(rawGroupId) ? rawGroupId : buildBookingReference("group", rawGroupId);

    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
          <ArrowLeft className="size-4" /> My Classes
        </Link>

        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <span className="mb-2 inline-block rounded-full bg-[#CBEFFF] px-2.5 py-0.5 text-xs font-semibold text-[#1E7BA6]">Group Class</span>
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{title}</h1>
          <p className="text-sm text-ensena-muted">with {tutor}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile icon={Calendar} label="Session" value={dateLabel} />
          <InfoTile icon={Clock} label="Time" value={timeLabel} />
        </div>

        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking Information</h2>
          <p className="mt-3 text-xs text-ensena-muted">Group Class ID</p>
          <p className="flex items-center gap-2 font-mono text-base font-semibold text-ensena-ink">
            {bookingId} <CopyId value={bookingId} />
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-4" />
          </span>
          <p className="text-sm font-semibold text-emerald-700">Session Completed</p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={() => messageTutor(tutor)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
            <MessageSquare className="size-4" /> Message Tutor
          </button>
          {groupClassId && (
            <Link href={`/student-dashboard/group-classes/${groupClassId}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">
              View Class
            </Link>
          )}
        </div>

        <div className="mt-5">
          <ReviewSection bookingId={escrow?.id ?? lesson!.id} bookingType="Group" subject={title} tutor={tutor} tutorImage={lesson?.tutorImage ?? "/teacher-1.jpg.png"} autoOpen={reviewPromptActive} />
        </div>
      </div>
    );
  }

  // ---- Private Lesson ----
  const title = escrow?.subject ?? lesson!.subject;
  const tutor = escrow?.tutor ?? lesson!.tutor;
  const tutorImage = lesson?.tutorImage ?? "/teacher-1.jpg.png";
  const dateLabel = escrow ? formatClassDate(new Date(escrow.completedAt)) : lesson!.date;
  const duration = lesson?.duration ?? "30 mins";
  // A real lesson record has a genuine duration to compute an end time
  // from — an escrow-only legacy record doesn't, and keeps its previous
  // single-timestamp label rather than fabricating a duration.
  const timeLabel = lesson
    ? summarizeSchedule([lesson]).timeLabel
    : escrow
      ? formatClassTime(new Date(escrow.completedAt))
      : "";
  const rawPrivateId = escrow?.id ?? lesson!.id;
  const bookingId = isValidBookingReference(rawPrivateId) ? rawPrivateId : buildBookingReference("private", rawPrivateId);
  const rating = tutorRatingFor(tutor);
  const notes = lesson?.notes;
  const priceAmount = escrow ? escrow.amountGross : lesson ? parseNairaAmount(lesson.payment) : 0;

  // ---- Private Lesson: multi-session booking (grouped programme view) ----
  // Every lesson the review-confirm step created together shares this same
  // bookingId — a standalone one-time lesson has none, and falls straight
  // through to the existing single-lesson view below, completely unchanged.
  const groupBookingId = lesson?.bookingId;
  if (groupBookingId) {
    const rawSiblingLessons = realPrivateLessons.filter((l) => l.bookingId === groupBookingId && l.student === dashboardStudent.name);
    const bookingSubscription = getSubscriptionForBooking(groupBookingId);
    const siblingRows = rawSiblingLessons
      .map((raw) => ({ raw, ...deriveProgrammeRow(privateLessonToStudentLesson(raw), nowMs, bookingSubscription) }))
      .sort((a, b) => (a.studentLesson.sessionNumber ?? 0) - (b.studentLesson.sessionNumber ?? 0));
    const totalSessions = siblingRows[0]?.studentLesson.totalSessions ?? siblingRows.length;
    const rowsByWeek = new Map<number, ProgrammeSessionRow[]>();
    for (const row of siblingRows) {
      const wk = row.studentLesson.weekNumber ?? 1;
      rowsByWeek.set(wk, [...(rowsByWeek.get(wk) ?? []), row]);
    }
    const bookingComplete = isPrivateBookingComplete(siblingRows.map((r) => ({ status: r.raw.status, effectivelyEnded: r.hasEnded })));
    const anyStarted = siblingRows.some((r) => r.hasEnded || r.entryState === "live");
    const programmeStatusLabel: "Upcoming" | "In Progress" | "Completed" = bookingComplete ? "Completed" : anyStarted ? "In Progress" : "Upcoming";
    const totalPriceAmount = rawSiblingLessons.reduce((sum, l) => sum + parseNairaAmount(l.price), 0);
    const scheduleSummary = summarizeSchedule(rawSiblingLessons);

    const bookingStatusRow = (
      <div className="flex items-center justify-between rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div>
          <p className="text-sm font-semibold text-ensena-ink">{totalSessions} sessions total</p>
          <p className="text-xs text-ensena-muted">Booking status</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold",
            programmeStatusLabel === "Completed"
              ? "bg-ensena-success/10 text-ensena-success"
              : programmeStatusLabel === "In Progress"
                ? "bg-amber-100 text-amber-700"
                : "bg-ensena-bg-soft text-ensena-muted"
          )}
        >
          {programmeStatusLabel}
        </span>
      </div>
    );

    return (
      <div>
        <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
          <ArrowLeft className="size-4" /> My Classes
        </Link>

        {/* Mobile: single-column stack */}
        <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-5 lg:hidden">
          <PrivateHeaderCard title={title} tutor={tutor} tutorImage={tutorImage} rating={rating} />
          {bookingStatusRow}
          <ScheduleSummaryCard summary={scheduleSummary} />
          <BookingInfoCard bookingId={groupBookingId} />
          <ProgrammeScheduleCard
            rowsByWeek={rowsByWeek}
            totalSessions={totalSessions}
            bookingId={groupBookingId}
            hasSubscription={Boolean(bookingSubscription && bookingSubscription.status !== "cancelled")}
          />
          <TutorCard title={title} tutor={tutor} tutorImage={tutorImage} onMessageTutor={() => messageTutor(tutor)} />
          <PaymentPlanCard bookingId={groupBookingId} amountPaid={totalPriceAmount} sessionsCovered={totalSessions} />
          <PaymentCard priceAmount={totalPriceAmount} />
          {bookingComplete && (
            <ReviewSection bookingId={groupBookingId} bookingType="Private" subject={title} tutor={tutor} tutorImage={tutorImage} autoOpen={reviewPromptActive} />
          )}
          <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={groupBookingId} relatedRecordLabel={`${title} with ${tutor}`} />
        </div>

        {/* Desktop: full-width two-column layout — same pattern as the single-lesson view below, so a multi-session booking's View Class page no longer sits narrow-centered in the middle of an otherwise full-width dashboard. */}
        <div className="hidden lg:mt-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-5">
            <PrivateHeaderCard title={title} tutor={tutor} tutorImage={tutorImage} rating={rating} />
            {bookingStatusRow}
            <ScheduleSummaryCard summary={scheduleSummary} />
            <BookingInfoCard bookingId={groupBookingId} />
            <ProgrammeScheduleCard
            rowsByWeek={rowsByWeek}
            totalSessions={totalSessions}
            bookingId={groupBookingId}
            hasSubscription={Boolean(bookingSubscription && bookingSubscription.status !== "cancelled")}
          />
            {bookingComplete && (
              <ReviewSection bookingId={groupBookingId} bookingType="Private" subject={title} tutor={tutor} tutorImage={tutorImage} autoOpen={reviewPromptActive} />
            )}
          </div>
          <div className="flex flex-col gap-5">
            <TutorCard title={title} tutor={tutor} tutorImage={tutorImage} onMessageTutor={() => messageTutor(tutor)} />
            <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={groupBookingId} relatedRecordLabel={`${title} with ${tutor}`} />
            <PaymentPlanCard bookingId={groupBookingId} amountPaid={totalPriceAmount} sessionsCovered={totalSessions} />
            <PaymentCard priceAmount={totalPriceAmount} />
          </div>
        </div>
      </div>
    );
  }

  const status = escrow ? completionStatus(escrow) : { label: "Confirmed", tint: "bg-emerald-100 text-emerald-700", action: "view" as const };
  const isConfirmed = status.action === "view" && (!escrow || escrow.confirmationStatus !== "Disputed");
  const isUpcoming = !escrow && (lesson?.status === "Upcoming" || lesson?.status === "Rescheduled");
  const isCancelled = !escrow && lesson?.status === "Cancelled";

  const entryState = isUpcoming && lesson ? getClassEntryState({ ...getPrivateLessonTimeRange(lesson), role: "student", nowMs }) : null;
  const paid = lesson ? hasSessionAccess(lesson.bookingId ?? lesson.id, lesson.id, dashboardStudent.name) : true;
  const canEnterNow = (entryState ? canEnterClassroom(entryState) : false) && paid;
  // A standalone one-time lesson has no bookingId and therefore no possible
  // subscription (see the multi-session branch above, which returns earlier
  // whenever one exists) — unpaidTiming is always "required" here.
  const unpaidLabel = !paid && lesson ? getSessionAccessState({ hasPaid: false, entryState: entryState ?? "too-early", unpaidTiming: "required" }).label : null;
  // Within an hour of opening, show a real ticking countdown (per the exact
  // "Classroom opens in 29:42" requirement) instead of a static clock time —
  // beyond that, a live MM:SS countdown for a class that's days away would
  // be nonsensical, so the static "opens at HH:MM" hint stays.
  const entryHint =
    !paid
      ? (unpaidLabel ?? undefined)
      : entryState === "too-early" && lesson
        ? (() => {
            const opensAtMs = getPrivateLessonTimeRange(lesson).startMs - STUDENT_ENTRY_WINDOW_MS;
            return opensAtMs - nowMs <= 60 * 60 * 1000 ? (
              <EntryCountdown opensAtMs={opensAtMs} />
            ) : (
              `Classroom opens at ${new Date(opensAtMs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            );
          })()
        : entryState === "ended"
          ? "This lesson has ended"
          : undefined;

  // Real attendance — purely informational, never affects the payment/
  // confirmation state above (that stays governed by escrow-store.ts's own
  // rules). `lesson.status` is a static seed field that never auto-flips to
  // "Completed" just because real time passed the scheduled end — entryState
  // (real timestamp-based, class-entry-access.ts) is the fallback that
  // catches a genuinely-past class the stale status field hasn't caught up
  // to yet, so this doesn't wait forever on a seed row's fixed status.
  const hasEnded = (!isUpcoming && !isCancelled) || entryState === "ended";
  const attendanceRecords = hasEnded ? privateAttendanceRecords : [];
  const attendanceNote = hasEnded
    ? (() => {
        const tutorAttended = attendanceRecords.some((r) => r.participantRole === "tutor");
        const studentAttended = attendanceRecords.some((r) => r.participantRole === "student");
        if (tutorAttended && studentAttended) return undefined; // the common case — no need to call out the obvious
        if (studentAttended) return `${tutor} did not join this class.`;
        if (tutorAttended) return "You did not join this class.";
        return "Neither you nor your tutor joined this class.";
      })()
    : undefined;

  // Only for a real lesson record — an escrow-only legacy record has no
  // frequency/duration to build a real Payment Plan card from, so none is
  // shown rather than guessing "One-time".
  const scheduleSummary = lesson ? summarizeSchedule([lesson]) : null;

  const viewProps: Omit<PrivateLessonViewProps, "onConfirm" | "onDispute" | "onMessageTutor"> = {
    title,
    tutor,
    tutorImage,
    rating,
    dateLabel,
    timeLabel,
    duration,
    bookingId,
    notes,
    priceAmount,
    isUpcoming,
    classroomHref: isUpcoming ? `/student-dashboard/classroom/private/${id}` : undefined,
    canEnterNow,
    entryHint,
    attendanceNote,
    isCancelled,
    isConfirmed,
    status,
    hasEscrow: !!escrow,
  };
  const onConfirm = () => escrow && openConfirm(escrow.id);
  const onDispute = () => escrow && openDispute(escrow.id);
  const onMessageTutor = () => messageTutor(tutor);

  return (
    <div>
      <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        <ArrowLeft className="size-4" /> My Classes
      </Link>

      {/* Mobile: unchanged single-column stack */}
      <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-5 lg:hidden">
        <PrivateHeaderCard {...viewProps} />
        <SessionInfoSection {...viewProps} />
        <BookingInfoCard {...viewProps} />
        <LessonStatusCard {...viewProps} onConfirm={onConfirm} onDispute={onDispute} />
        <TutorCard {...viewProps} onMessageTutor={onMessageTutor} />
        <NotesCard {...viewProps} />
        {scheduleSummary && <PaymentPlanCard bookingId={lesson?.id ?? escrow?.id ?? ""} amountPaid={priceAmount} />}
        <PaymentCard {...viewProps} />
        {escrow && <EscrowBanner {...viewProps} />}
        {isConfirmed && !isUpcoming && !isCancelled && <ReviewSection bookingId={escrow?.id ?? lesson!.id} bookingType="Private" subject={title} tutor={tutor} tutorImage={tutorImage} autoOpen={reviewPromptActive} />}
        <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={bookingId} relatedRecordLabel={`${title} with ${tutor}`} />
      </div>

      {/* Desktop: two-column layout — main content left, status/tutor/payment rail right */}
      <div className="hidden lg:mt-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <PrivateHeaderCard {...viewProps} />
          <SessionInfoSection {...viewProps} />
          <BookingInfoCard {...viewProps} />
          <NotesCard {...viewProps} />
          {escrow && <EscrowBanner {...viewProps} />}
          {isConfirmed && !isUpcoming && !isCancelled && <ReviewSection bookingId={escrow?.id ?? lesson!.id} bookingType="Private" subject={title} tutor={tutor} tutorImage={tutorImage} autoOpen={reviewPromptActive} />}
        </div>
        <div className="flex flex-col gap-5">
          <LessonStatusCard {...viewProps} onConfirm={onConfirm} onDispute={onDispute} />
          <TutorCard {...viewProps} onMessageTutor={onMessageTutor} />
          <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={bookingId} relatedRecordLabel={`${title} with ${tutor}`} />
          {scheduleSummary && <PaymentPlanCard bookingId={lesson?.id ?? escrow?.id ?? ""} amountPaid={priceAmount} />}
          <PaymentCard {...viewProps} />
        </div>
      </div>

      {modals}
    </div>
  );
}
