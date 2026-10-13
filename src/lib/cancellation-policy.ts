// The one real cancellation-policy calculation — a pure function so it can
// be shown to a student BEFORE they confirm a cancellation and reused
// identically wherever a refund actually gets computed, rather than two
// separate implementations silently drifting apart. Versioned so a policy
// change later never retroactively reinterprets a booking made under an
// earlier version (see CANCELLATION_POLICY_VERSION on the caller side).
export const CANCELLATION_POLICY_VERSION = "2026-09-01";

export type CancelledByRole = "Student" | "Tutor" | "Admin";
export type CancellationOutcome = "cancellation" | "studentNoShow" | "teacherNoShow";

export interface CancellationPolicyResult {
  refundPercentage: number;
  refundAmount: number;
  cancellationFee: number;
  policyApplied: string;
  policyVersion: string;
}

function round(amount: number, pct: number): number {
  return Math.round((amount * pct) / 100);
}

// Tutor-initiated cancellations and a tutor no-show always fully refund the
// student — the student did nothing wrong in either case. A student no-show
// forfeits the whole amount. Everything else (a student choosing to cancel)
// is judged purely by how much notice they gave.
export function computeCancellationPolicy({
  amount,
  startMs,
  nowMs,
  cancelledBy,
  outcome = "cancellation",
}: {
  amount: number;
  startMs: number;
  nowMs: number;
  cancelledBy: CancelledByRole;
  outcome?: CancellationOutcome;
}): CancellationPolicyResult {
  const base = { policyVersion: CANCELLATION_POLICY_VERSION };

  if (outcome === "teacherNoShow" || cancelledBy === "Tutor" || cancelledBy === "Admin") {
    return {
      ...base,
      refundPercentage: 100,
      refundAmount: amount,
      cancellationFee: 0,
      policyApplied: outcome === "teacherNoShow" ? "Teacher no-show: full refund" : "Cancelled by teacher: full refund",
    };
  }

  if (outcome === "studentNoShow") {
    return { ...base, refundPercentage: 0, refundAmount: 0, cancellationFee: amount, policyApplied: "Student no-show: no refund" };
  }

  const hoursUntilStart = (startMs - nowMs) / 3_600_000;
  if (hoursUntilStart >= 24) {
    return { ...base, refundPercentage: 100, refundAmount: amount, cancellationFee: 0, policyApplied: "Cancelled 24+ hours before session: full refund" };
  }
  if (hoursUntilStart >= 2) {
    const refundAmount = round(amount, 50);
    return {
      ...base,
      refundPercentage: 50,
      refundAmount,
      cancellationFee: amount - refundAmount,
      policyApplied: "Cancelled 2–24 hours before session: 50% refund",
    };
  }
  return { ...base, refundPercentage: 0, refundAmount: 0, cancellationFee: amount, policyApplied: "Cancelled less than 2 hours before session: no refund" };
}
