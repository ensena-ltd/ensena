// The one real cancellation/reschedule engine — every "Cancel booking" or
// "Reschedule session" action in the app is expected to go through
// cancelBooking()/rescheduleBooking() here, never flip a status field
// directly. This is what makes a booking a permanent, traceable record
// instead of a status flag: every action writes a BookingEvent (the audit
// trail), cancelling writes a CancellationDetails record (the "why/how much"
// detail), and rescheduling appends a RescheduleEntry (full history, not a
// single overwritten date). Same localStorage + CustomEvent idiom as every
// other store in this app (escrow-store.ts, payment-plans-store.ts).
import { computeCancellationPolicy, type CancelledByRole, type CancellationOutcome } from "@/lib/cancellation-policy";
import { sendBookingEmail } from "@/lib/email-service";
import { cancelEnrollment } from "@/lib/group-class-enrollment-store";
import { pushStudentNotification } from "@/lib/notifications-store";
import { refundBookingPayments, type Refund } from "@/lib/payment-plans-store";
import { cancelPrivateLesson, getPrivateLessons, reschedulePrivateLesson } from "@/lib/private-lessons-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { pushTutorNotification } from "@/lib/tutor-notifications-store";
import { isTutorBookedInRange, parseDurationMinutes, parseTimeToMinutes, toISODate } from "@/lib/tutor-availability";

// This demo has exactly one real signed-in student and one real signed-in
// tutor persona — everyone else (other tutors/students by name) has no real
// account/email anywhere in this app. `@example.com` matches the same
// explicit "not a real address" placeholder convention dashboardStudent's
// own seed email already uses, rather than inventing a new placeholder
// scheme.
function emailFor(name: string): string {
  if (name === dashboardStudent.name) return dashboardStudent.email;
  if (name === dashboardTutor.name) return `${dashboardTutor.slug}@example.com`;
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`;
}

export type BookingKind = "Private" | "Group";

export type BookingEventType =
  | "created"
  | "confirmed"
  | "reschedule_requested"
  | "rescheduled"
  | "cancelled"
  | "refund_initiated"
  | "refund_completed"
  | "refund_failed"
  | "completed"
  | "student_no_show"
  | "teacher_no_show";

export interface BookingEvent {
  id: string;
  bookingId: string;
  kind: BookingKind;
  eventType: BookingEventType;
  actorName: string;
  actorRole: CancelledByRole;
  previousStart?: string;
  previousEnd?: string;
  newStart?: string;
  newEnd?: string;
  metadata?: Record<string, string | number>;
  atMs: number;
}

export type CancellationReason =
  | "I can no longer attend"
  | "I need a different time"
  | "I booked by mistake"
  | "I found another option"
  | "Personal reasons"
  | "Other";

export interface CancellationDetails {
  bookingId: string;
  kind: BookingKind;
  cancelledBy: CancelledByRole;
  cancelledByName: string;
  cancelledAtMs: number;
  reason: CancellationReason;
  notes?: string;
  originalStart: string;
  originalEnd: string;
  originalAmount: number;
  cancellationFee: number;
  refundAmount: number;
  refundPercentage: number;
  policyApplied: string;
  policyVersion: string;
  refundStatus: "none" | "processing" | "completed" | "failed";
  refundIds: string[];
  adminOverride?: { additionalRefund: number; reason: string; adminName: string; atMs: number };
}

export interface RescheduleEntry {
  id: string;
  bookingId: string;
  kind: BookingKind;
  requestedBy: CancelledByRole;
  requestedByName: string;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  reason?: string;
  atMs: number;
}

const EVENTS_KEY = "ensena_booking_events";
const CANCELLATIONS_KEY = "ensena_booking_cancellations";
const RESCHEDULES_KEY = "ensena_booking_reschedules";
export const BOOKING_LIFECYCLE_EVENT = "ensena:booking-lifecycle-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const EMPTY_EVENTS: BookingEvent[] = [];
const EMPTY_CANCELLATIONS: CancellationDetails[] = [];
const EMPTY_RESCHEDULES: RescheduleEntry[] = [];
const readEventsRaw = makeCachedReader<BookingEvent[]>(EVENTS_KEY, EMPTY_EVENTS);
const readCancellationsRaw = makeCachedReader<CancellationDetails[]>(CANCELLATIONS_KEY, EMPTY_CANCELLATIONS);
const readReschedulesRaw = makeCachedReader<RescheduleEntry[]>(RESCHEDULES_KEY, EMPTY_RESCHEDULES);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(BOOKING_LIFECYCLE_EVENT));
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getBookingEvents(bookingId: string): BookingEvent[] {
  return readEventsRaw()
    .filter((e) => e.bookingId === bookingId)
    .sort((a, b) => a.atMs - b.atMs);
}

export function getCancellationDetails(bookingId: string): CancellationDetails | undefined {
  return readCancellationsRaw().find((c) => c.bookingId === bookingId);
}

export function getRescheduleHistory(bookingId: string): RescheduleEntry[] {
  return readReschedulesRaw()
    .filter((r) => r.bookingId === bookingId)
    .sort((a, b) => a.atMs - b.atMs);
}

function recordEvent(input: Omit<BookingEvent, "id" | "atMs">): void {
  const event: BookingEvent = { ...input, id: randomId("evt"), atMs: Date.now() };
  writeJson(EVENTS_KEY, [...readEventsRaw(), event]);
}

// Idempotent: cancelling an already-cancelled booking is a no-op that
// returns the existing record rather than double-refunding or sending a
// second round of notifications (the exact "cancel API called twice"
// scenario the refund/notification layer must be safe against).
export function cancelBooking(input: {
  bookingId: string;
  kind: BookingKind;
  cancelledBy: CancelledByRole;
  cancelledByName: string;
  otherPartyName: string;
  subject: string;
  reason: CancellationReason;
  notes?: string;
  originalStart: string;
  originalEnd: string;
  originalStartMs: number;
  originalAmount: number;
  nowMs?: number;
  outcome?: CancellationOutcome;
  // Two separate URLs, not one — the notification/email always goes to
  // `otherPartyName` (whichever role DIDN'T act), so the link must be THAT
  // role's own view of the booking, never the actor's. Passing only one
  // shared `detailUrl` was the exact bug that sent students into
  // /tutor-dashboard/... links (and vice versa): every caller was only ever
  // supplying their OWN dashboard's URL for a link meant for the other party.
  studentDetailUrl: string;
  tutorDetailUrl: string;
}): CancellationDetails {
  const existing = getCancellationDetails(input.bookingId);
  if (existing) return existing;

  const nowMs = input.nowMs ?? Date.now();
  const policy = computeCancellationPolicy({
    amount: input.originalAmount,
    startMs: input.originalStartMs,
    nowMs,
    cancelledBy: input.cancelledBy,
    outcome: input.outcome,
  });

  // Release the slot / mark the underlying record cancelled — never delete
  // it. Both stores already do this correctly (cancelPrivateLesson only
  // flips status; cancelEnrollment only flips status since this same pass
  // fixed it to stop deleting the record).
  if (input.kind === "Private") cancelPrivateLesson(input.bookingId);
  else cancelEnrollment(input.bookingId);

  let refunds: Refund[] = [];
  if (policy.refundAmount > 0) {
    refunds = refundBookingPayments(input.bookingId, policy.refundAmount, policy.policyApplied);
  }

  const details: CancellationDetails = {
    bookingId: input.bookingId,
    kind: input.kind,
    cancelledBy: input.cancelledBy,
    cancelledByName: input.cancelledByName,
    cancelledAtMs: nowMs,
    reason: input.reason,
    notes: input.notes,
    originalStart: input.originalStart,
    originalEnd: input.originalEnd,
    originalAmount: input.originalAmount,
    cancellationFee: policy.cancellationFee,
    refundAmount: policy.refundAmount,
    refundPercentage: policy.refundPercentage,
    policyApplied: policy.policyApplied,
    policyVersion: policy.policyVersion,
    refundStatus: policy.refundAmount > 0 ? (refunds.length > 0 ? "completed" : "failed") : "none",
    refundIds: refunds.map((r) => r.id),
  };
  writeJson(CANCELLATIONS_KEY, [...readCancellationsRaw(), details]);

  recordEvent({
    bookingId: input.bookingId,
    kind: input.kind,
    eventType: "cancelled",
    actorName: input.cancelledByName,
    actorRole: input.cancelledBy,
    metadata: { reason: input.reason, refundAmount: policy.refundAmount, cancellationFee: policy.cancellationFee },
  });
  if (policy.refundAmount > 0) {
    recordEvent({
      bookingId: input.bookingId,
      kind: input.kind,
      eventType: details.refundStatus === "completed" ? "refund_completed" : "refund_failed",
      actorName: "Enseña",
      actorRole: "Admin",
      metadata: { amount: policy.refundAmount },
    });
  }

  // The person who DIDN'T cancel is the one who needs telling — a student
  // already knows they just cancelled their own booking. Every path also
  // gets a real email (email-service.ts) alongside the in-app notification —
  // "every major booking event must also generate an email." `otherPartyName`
  // is always the recipient (the caller's own convention — see
  // my-lessons-client.tsx/calendar-client.tsx's cancelBooking calls).
  //
  // Both lines below key off the REAL outcome (details.refundStatus), not
  // just the policy's theoretical entitlement — a refund can be owed but
  // still fail (no real paid PaymentPlan existed to draw it from), and
  // telling the student "a refund has been issued" when it didn't happen
  // would be a false claim, not just an omission.
  const refundLine =
    details.refundStatus === "completed"
      ? ` A refund of ₦${policy.refundAmount.toLocaleString()} has been issued.`
      : details.refundStatus === "failed"
        ? ` We attempted to refund ₦${policy.refundAmount.toLocaleString()} but it couldn't be processed automatically. Please contact support@ensena.co so we can sort this out.`
        : "";
  // The recipient of this notification/email is always `otherPartyName` —
  // whichever role DIDN'T cancel — so the link must be THEIR own dashboard's
  // view, not the actor's.
  const recipientUrl = input.cancelledBy === "Student" ? input.tutorDetailUrl : input.studentDetailUrl;
  const baseEmailVars = {
    subject: input.subject,
    date: input.originalStart,
    time: input.originalEnd,
    bookingReference: input.bookingId,
    bookingUrl: recipientUrl,
    refundAmount: policy.refundAmount,
    refundFailed: details.refundStatus === "failed",
  };
  if (input.cancelledBy === "Student") {
    pushTutorNotification({
      category: "Booking",
      text: `${input.cancelledByName} cancelled their ${input.subject} session (${input.originalStart} · ${input.originalEnd}). Reason: ${input.reason}.`,
      bookingId: input.bookingId,
      actionUrl: recipientUrl,
    });
    sendBookingEmail({
      to: emailFor(input.otherPartyName),
      template: "booking_cancelled_by_student",
      bookingId: input.bookingId,
      vars: { ...baseEmailVars, recipientName: input.otherPartyName, otherPartyName: input.cancelledByName },
    });
  } else {
    pushStudentNotification({
      category: "Booking",
      text: `Your ${input.subject} session with ${input.otherPartyName} on ${input.originalStart} was cancelled.${refundLine}`,
      bookingId: input.bookingId,
      actionUrl: recipientUrl,
    });
    sendBookingEmail({
      to: emailFor(input.otherPartyName),
      template: "booking_cancelled_by_tutor",
      bookingId: input.bookingId,
      vars: { ...baseEmailVars, recipientName: input.otherPartyName, otherPartyName: input.cancelledByName },
    });
  }

  return details;
}

// Unlimited, last-minute-allowed reschedules would make "Reschedule" a free
// escape hatch from the cancellation-fee policy (which only ever gates
// Cancel) — these two limits close that loophole without inventing a
// separate fee, by simply refusing the reschedule outright past a point,
// same as enrollInGroupClass throwing on capacity. Callers must catch and
// surface the message; this never silently no-ops.
const MAX_RESCHEDULES_PER_BOOKING = 2;
const MIN_HOURS_BEFORE_RESCHEDULE = 2;

export function rescheduleBooking(input: {
  bookingId: string;
  kind: BookingKind;
  requestedBy: CancelledByRole;
  requestedByName: string;
  otherPartyName: string;
  subject: string;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  reason?: string;
  // See the matching comment on cancelBooking's input — the recipient is
  // always `otherPartyName` (whichever role DIDN'T request the reschedule),
  // so the notification/email link must be THEIR own dashboard's view.
  studentDetailUrl: string;
  tutorDetailUrl: string;
}): RescheduleEntry {
  const priorReschedules = getRescheduleHistory(input.bookingId).length;
  if (priorReschedules >= MAX_RESCHEDULES_PER_BOOKING) {
    throw new Error(`This booking has already been rescheduled ${priorReschedules} times, the maximum allowed. Please cancel instead.`);
  }

  const fromStartMs = new Date(`${input.fromDate} ${input.fromTime}`).getTime();
  if (!Number.isNaN(fromStartMs) && fromStartMs > Date.now() && fromStartMs - Date.now() < MIN_HOURS_BEFORE_RESCHEDULE * 3_600_000) {
    throw new Error(`Too close to the session start time to reschedule (less than ${MIN_HOURS_BEFORE_RESCHEDULE} hours away). Please cancel instead.`);
  }

  if (input.kind === "Private") {
    const lesson = getPrivateLessons().find((l) => l.id === input.bookingId);
    if (lesson) {
      const newDate = new Date(input.toDate);
      const newStartMinutes = parseTimeToMinutes(input.toTime);
      if (!Number.isNaN(newDate.getTime()) && newStartMinutes !== null) {
        const newDurationMinutes = parseDurationMinutes(lesson.duration);
        const conflict = isTutorBookedInRange(
          lesson.tutorSlug,
          toISODate(newDate),
          newStartMinutes,
          newStartMinutes + newDurationMinutes,
          lesson.id
        );
        if (conflict) {
          throw new Error("This teacher already has another lesson at that time. Please choose a different time.");
        }
      }
    }
    reschedulePrivateLesson(input.bookingId, input.toDate, input.toTime);
  } else {
    // Group-class cohort schedules are teacher-set, not per-student — a real
    // per-student reschedule of a single group session isn't a concept this
    // app's group-class model supports yet. Refusing outright here (instead
    // of silently no-op'ing the actual schedule while still recording a
    // RescheduleEntry and telling both parties it moved) is what makes this
    // safe even if a future caller forgets the "Group has no Reschedule UI"
    // convention — a caller that ignores this throw would otherwise send a
    // real "your class moved" notification/email for a class that never
    // actually moved, risking a genuine no-show.
    throw new Error("Group class sessions can't be individually rescheduled. Cancel this enrollment instead.");
  }

  const entry: RescheduleEntry = {
    id: randomId("resched"),
    bookingId: input.bookingId,
    kind: input.kind,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    fromDate: input.fromDate,
    fromTime: input.fromTime,
    toDate: input.toDate,
    toTime: input.toTime,
    reason: input.reason,
    atMs: Date.now(),
  };
  writeJson(RESCHEDULES_KEY, [...readReschedulesRaw(), entry]);

  recordEvent({
    bookingId: input.bookingId,
    kind: input.kind,
    eventType: "rescheduled",
    actorName: input.requestedByName,
    actorRole: input.requestedBy,
    previousStart: `${input.fromDate} ${input.fromTime}`,
    newStart: `${input.toDate} ${input.toTime}`,
  });

  const recipientUrl = input.requestedBy === "Student" ? input.tutorDetailUrl : input.studentDetailUrl;
  const message = `${input.requestedByName === input.otherPartyName ? "Your tutor" : "Your session"} for ${input.subject} was rescheduled from ${input.fromDate} · ${input.fromTime} to ${input.toDate} · ${input.toTime}.`;
  const rescheduleEmailVars = {
    subject: input.subject,
    date: input.fromDate,
    time: input.fromTime,
    newDate: input.toDate,
    newTime: input.toTime,
    bookingReference: input.bookingId,
    bookingUrl: recipientUrl,
  };
  if (input.requestedBy === "Student") {
    pushTutorNotification({ category: "Booking", text: `${input.requestedByName} rescheduled their ${input.subject} session to ${input.toDate} · ${input.toTime}.`, bookingId: input.bookingId, actionUrl: recipientUrl });
    sendBookingEmail({
      to: emailFor(input.otherPartyName),
      template: "booking_rescheduled",
      bookingId: input.bookingId,
      vars: { ...rescheduleEmailVars, recipientName: input.otherPartyName, otherPartyName: input.requestedByName },
    });
  } else {
    pushStudentNotification({ category: "Booking", text: message, bookingId: input.bookingId, actionUrl: recipientUrl });
    sendBookingEmail({
      to: emailFor(input.otherPartyName),
      template: "booking_rescheduled",
      bookingId: input.bookingId,
      vars: { ...rescheduleEmailVars, recipientName: input.otherPartyName, otherPartyName: input.requestedByName },
    });
  }

  return entry;
}

export function subscribeBookingLifecycle(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BOOKING_LIFECYCLE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BOOKING_LIFECYCLE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

