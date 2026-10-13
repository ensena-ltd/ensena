// Which payment options actually make sense for a given booking's real
// schedule — never every possible option unconditionally. A one-session
// private booking should never see "Pay monthly"; a one-week group class
// shouldn't either. Both Private and Group bookings call this SAME
// calculator so the "how would you like to pay" logic never forks per
// booking kind. Pure function, no store reads — the caller supplies the
// booking's real numbers (session count, sessions/week, span in weeks).
import type { PaymentMode, PaymentScope } from "@/lib/payment-plans-store";

export interface PaymentOption {
  id: string;
  label: string;
  description: string;
  mode: PaymentMode;
  scope: PaymentScope;
  amount: number;
  sessionsCovered: number;
}

// A 2-part installment split is only worth offering once the total is large
// enough that splitting it actually helps — an arbitrary but documented
// threshold rather than always showing it.
const INSTALLMENT_THRESHOLD = 50_000;

export function computePaymentOptions({
  sessionCount,
  sessionsPerWeek,
  totalWeeks,
  pricePerSession,
}: {
  sessionCount: number;
  sessionsPerWeek: number;
  totalWeeks: number;
  pricePerSession: number;
}): PaymentOption[] {
  const fullTotal = sessionCount * pricePerSession;

  // A single-session booking has no meaningful distinction between "this
  // session," "this week," or "the full booking" — showing all three would
  // just be the same option worded three ways.
  if (sessionCount <= 1) {
    return [
      {
        id: "full",
        label: "Pay for this class",
        description: "One-time payment for this session",
        mode: "oneTime",
        scope: "full",
        amount: fullTotal,
        sessionsCovered: sessionCount,
      },
    ];
  }

  const options: PaymentOption[] = [];

  if (totalWeeks >= 2) {
    options.push({
      id: "week",
      label: "Pay for this week",
      description: `${sessionsPerWeek} session${sessionsPerWeek === 1 ? "" : "s"} this week`,
      mode: "oneTime",
      scope: "week",
      amount: sessionsPerWeek * pricePerSession,
      sessionsCovered: sessionsPerWeek,
    });
  }

  // Weekly auto-pay only once the class runs long enough for "recurring" to
  // mean something — a 2-week class is basically over before a second
  // charge would even happen.
  if (totalWeeks >= 3) {
    options.push({
      id: "weeklyAuto",
      label: "Set up weekly auto-pay",
      description: "Billed automatically every week, cancel anytime",
      mode: "recurring",
      scope: "week",
      amount: sessionsPerWeek * pricePerSession,
      sessionsCovered: sessionsPerWeek,
    });
  }

  if (totalWeeks >= 5) {
    const sessionsPerMonth = Math.min(sessionCount, sessionsPerWeek * 4);
    options.push({
      id: "month",
      label: "Pay monthly",
      description: `${sessionsPerMonth} sessions this month`,
      mode: "oneTime",
      scope: "month",
      amount: sessionsPerMonth * pricePerSession,
      sessionsCovered: sessionsPerMonth,
    });
    options.push({
      id: "monthlyAuto",
      label: "Set up monthly auto-pay",
      description: "Billed automatically every month, cancel anytime",
      mode: "recurring",
      scope: "month",
      amount: sessionsPerMonth * pricePerSession,
      sessionsCovered: sessionsPerMonth,
    });
  }

  options.push({
    id: "full",
    label: "Pay for the full booking",
    description: `All ${sessionCount} sessions, one payment`,
    mode: "oneTime",
    scope: "full",
    amount: fullTotal,
    sessionsCovered: sessionCount,
  });

  if (fullTotal >= INSTALLMENT_THRESHOLD) {
    const firstHalf = Math.round(fullTotal / 2 / 100) * 100;
    options.push({
      id: "installment",
      label: "Pay in 2 installments",
      description: "Half now, half before the midpoint session",
      mode: "oneTime",
      scope: "installment",
      amount: firstHalf,
      sessionsCovered: Math.ceil(sessionCount / 2),
    });
  }

  return options;
}
