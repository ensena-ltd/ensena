// The ONE decision function every surface that shows a session's status must
// call — desktop dashboard, mobile dashboard, Group Class page, classroom
// page, session cards, the payment page, and any direct-route guard. Nothing
// else in the app should independently decide "is this paid / can this be
// entered / what do I call this."
//
// This deliberately composes three ALREADY-real, separately-owned signals
// instead of re-deriving any of them:
//   - payment entitlement:  hasSessionAccess() / getSubscriptionForBooking()
//     (payment-plans-store.ts) — "did the student actually pay for this"
//   - time gate:             getClassEntryState()/canEnterClassroom()
//     (class-entry-access.ts) — "is it time to enter yet"
//   - attendance:            each booking type's own existing attendance
//     signal (e.g. Group Class's buildSessionAttendance) — "did they show up"
//     Passed in as an explicit, optional input rather than guessed here: a
//     booking type with no real attendance tracking (Private lessons today)
//     must pass `undefined`, never a fabricated "missed".
//
// Enrollment, payment entitlement, and session access are three different
// questions (see the file-level comment in payment-plans-store.ts for
// entitlement) — this function answers only the third, from the first two
// plus time and attendance.
import { canEnterClassroom, type ClassEntryState } from "@/lib/class-entry-access";
import type { SubscriptionStatus } from "@/lib/payment-plans-store";

export type SessionAccessState =
  | "paid-upcoming"
  | "paid-joinable"
  | "attended"
  | "missed"
  | "payment-required"
  | "payment-scheduled"
  | "not-paid"
  | "cancelled";

// Exact copy per state — the one place this wording is decided, so no two
// surfaces can ever show different words for the same underlying state.
export const SESSION_ACCESS_LABEL: Record<SessionAccessState, string> = {
  "paid-upcoming": "Upcoming",
  "paid-joinable": "Join class",
  attended: "Attended",
  missed: "Missed",
  "payment-required": "Payment required",
  "payment-scheduled": "Payment scheduled",
  "not-paid": "Not paid",
  cancelled: "Cancelled",
};

export interface SessionAccessResult {
  state: SessionAccessState;
  label: string;
  /** True whenever the student may not enter the classroom for this session right now. */
  locked: boolean;
  /** Present only for "paid-joinable" — the one state where an entry action is real. */
  canJoin: boolean;
  /** Present only for "payment-required" — e.g. "Pay for Week 3". Never shown for "payment-scheduled": that state must not prompt manual action. */
  payCtaLabel?: string;
}

// Whether an unpaid, not-yet-ended session's next charge is genuinely
// upcoming ("scheduled" — a live recurring plan will auto-charge before the
// period starts, so this must not look like a failure) versus something the
// student must act on right now ("required" — no live plan, or the plan's
// last charge attempt actually failed / is genuinely overdue). This is the
// addendum's core distinction: never grant access, and never alarm the
// student, based only on an active plan existing.
export function getUnpaidPaymentTiming(subscriptionStatus: SubscriptionStatus | null, nextChargeAtMs: number | null, nowMs: number): "scheduled" | "required" {
  if (subscriptionStatus !== "active") return "required"; // no subscription, cancelled, or already pastDue
  if (nextChargeAtMs === null) return "required";
  return nextChargeAtMs > nowMs ? "scheduled" : "required"; // active but overdue is treated as required, never left as a silent "scheduled" forever
}

export function getSessionAccessState(input: {
  hasPaid: boolean;
  entryState: ClassEntryState;
  cancelled?: boolean;
  /** Only ever set by a caller with a real, existing attendance signal for this booking type — never guessed. */
  attendance?: "attended" | "missed";
  /** Only meaningful when hasPaid is false. */
  unpaidTiming?: "scheduled" | "required";
  /** e.g. "Week 3" — used to build the "Pay for Week 3" CTA on "payment-required". */
  weekLabel?: string;
}): SessionAccessResult {
  if (input.cancelled) {
    return { state: "cancelled", label: SESSION_ACCESS_LABEL.cancelled, locked: true, canJoin: false };
  }

  if (input.hasPaid) {
    if (input.attendance === "attended") {
      return { state: "attended", label: SESSION_ACCESS_LABEL.attended, locked: false, canJoin: false };
    }
    if (input.attendance === "missed") {
      return { state: "missed", label: SESSION_ACCESS_LABEL.missed, locked: true, canJoin: false };
    }
    if (canEnterClassroom(input.entryState)) {
      return { state: "paid-joinable", label: SESSION_ACCESS_LABEL["paid-joinable"], locked: false, canJoin: true };
    }
    return { state: "paid-upcoming", label: SESSION_ACCESS_LABEL["paid-upcoming"], locked: true, canJoin: false };
  }

  // Unpaid: a session whose time has already passed is simply "Not paid" —
  // never "Missed" (the student never had access to miss) — regardless of
  // whether a recurring plan on the booking was scheduled or failed.
  if (input.entryState === "ended") {
    return { state: "not-paid", label: SESSION_ACCESS_LABEL["not-paid"], locked: true, canJoin: false };
  }

  if (input.unpaidTiming === "scheduled") {
    return { state: "payment-scheduled", label: SESSION_ACCESS_LABEL["payment-scheduled"], locked: true, canJoin: false };
  }

  const weekLabel = input.weekLabel;
  return {
    state: "payment-required",
    label: SESSION_ACCESS_LABEL["payment-required"],
    locked: true,
    canJoin: false,
    payCtaLabel: weekLabel ? `Pay for ${weekLabel}` : "Pay now",
  };
}
