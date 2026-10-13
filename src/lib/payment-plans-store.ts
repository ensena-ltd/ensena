// Real, persisted payment/session-entitlement records — localStorage-backed,
// same idiom as escrow-store.ts/group-class-enrollment-store.ts. This is the
// one place "did this student actually pay for this session" is answered,
// used by BOTH Private lessons and Group classes (Discovery Sessions never
// touch this file at all — they stay free by construction).
//
// There's no real payment provider or backend in this app (nothing else here
// has one either), so "charging a card" is simulated exactly the way every
// other "real" feature in this session is: one real function every caller is
// routed through, so access can't be granted by editing local component
// state. A `Subscription` record only tracks recurring-billing metadata
// (next charge date, frequency, failure count) — the actual entitlement a
// student holds always comes from a `PaymentPlan.coversSessionIds` entry,
// whether that plan was created directly (one-time payment) or minted by
// `chargeSubscription` (a recurring charge) — one source of truth for access.
export type PaymentBookingKind = "Private" | "Group";
export type PaymentScope = "session" | "week" | "month" | "full" | "installment";
export type PaymentMode = "oneTime" | "recurring";
export type PaymentStatus = "paid" | "refunded" | "partiallyRefunded" | "cancelled";

export interface PaymentPlan {
  id: string;
  kind: PaymentBookingKind;
  bookingId: string;
  studentName: string;
  scope: PaymentScope;
  coversSessionIds: string[];
  amount: number;
  mode: PaymentMode;
  subscriptionId?: string;
  status: PaymentStatus;
  paidAtMs: number;
  // How much of `amount` has actually been refunded — only set once a
  // refund (full or partial) has been recorded against this plan. The
  // refund itself is a separate Refund record (see below); this is just the
  // running total kept on the plan so hasSessionAccess/UI never need to
  // re-sum every Refund row to know what's left.
  refundedAmount?: number;
}

// A refund is its own financial record — never just a number changed on the
// booking/plan — so accounting/reconciliation always has a real transaction
// to point to, matching how a real payment provider would model it.
export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export interface Refund {
  id: string;
  bookingId: string;
  paymentPlanId: string;
  studentName: string;
  amount: number;
  status: RefundStatus;
  reason: string;
  initiatedAtMs: number;
  completedAtMs?: number;
  failedReason?: string;
}

export type SubscriptionFrequency = "weekly" | "monthly";
export type SubscriptionStatus = "active" | "pastDue" | "cancelled";

export interface Subscription {
  id: string;
  kind: PaymentBookingKind;
  bookingId: string;
  studentName: string;
  frequency: SubscriptionFrequency;
  amountPerCharge: number;
  nextChargeAtMs: number;
  status: SubscriptionStatus;
  // An opaque reference only — never raw card/bank details. Nothing in this
  // app ever collects real card data, so this is always a simulated token.
  paymentMethodRef: string;
  failedAttempts: number;
}

const PLANS_KEY = "ensena_payment_plans";
const SUBSCRIPTIONS_KEY = "ensena_payment_subscriptions";
const REFUNDS_KEY = "ensena_payment_refunds";
export const PAYMENT_EVENT = "ensena:payment-changed";

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

const EMPTY_PLANS: PaymentPlan[] = [];
const EMPTY_SUBS: Subscription[] = [];
const EMPTY_REFUNDS: Refund[] = [];
const readPlansRaw = makeCachedReader<PaymentPlan[]>(PLANS_KEY, EMPTY_PLANS);
const readSubsRaw = makeCachedReader<Subscription[]>(SUBSCRIPTIONS_KEY, EMPTY_SUBS);
const readRefundsRaw = makeCachedReader<Refund[]>(REFUNDS_KEY, EMPTY_REFUNDS);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PAYMENT_EVENT));
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPaymentPlans(): PaymentPlan[] {
  return readPlansRaw();
}

export function getSubscriptions(): Subscription[] {
  return readSubsRaw();
}

export function getPaymentPlansForBooking(bookingId: string): PaymentPlan[] {
  return readPlansRaw().filter((p) => p.bookingId === bookingId);
}

export function getSubscriptionForBooking(bookingId: string): Subscription | undefined {
  return readSubsRaw().find((s) => s.bookingId === bookingId);
}

// How many billing periods a subscription has actually been charged for —
// the next period to charge (on schedule, or on retry after a failure) is
// always this count, since chargeSubscription's period-0 charge happens at
// signup and every successful charge after that mints exactly one more
// "paid" PaymentPlan tied to this subscription.
export function getPeriodsPaid(subscriptionId: string): number {
  return readPlansRaw().filter((p) => p.subscriptionId === subscriptionId && p.status === "paid").length;
}

// The one real access check. A booking with ZERO payment records of any kind
// predates this payment layer entirely (every seed/legacy booking in this
// app was created before payment tracking existed) — those stay exactly as
// accessible as they always were rather than retroactively locking a demo
// booking out the moment this file shipped. Once a booking has even one real
// payment record, access is real: only sessions an actual "paid" record
// covers are unlocked.
export function hasSessionAccess(bookingId: string, sessionId: string, studentName: string): boolean {
  const records = getPaymentPlansForBooking(bookingId);
  if (records.length === 0) return true;
  return records.some((p) => p.status === "paid" && p.studentName === studentName && p.coversSessionIds.includes(sessionId));
}

export function recordPayment(input: {
  kind: PaymentBookingKind;
  bookingId: string;
  studentName: string;
  scope: PaymentScope;
  coversSessionIds: string[];
  amount: number;
  mode: PaymentMode;
  subscriptionId?: string;
}): PaymentPlan {
  const plan: PaymentPlan = {
    id: randomId("pay"),
    status: "paid",
    paidAtMs: Date.now(),
    ...input,
  };
  writeJson(PLANS_KEY, [...readPlansRaw(), plan]);
  return plan;
}

export function getRefundsForBooking(bookingId: string): Refund[] {
  return readRefundsRaw().filter((r) => r.bookingId === bookingId);
}

// Refunds a booking's paid PaymentPlans up to `refundAmount` (a cancellation
// policy might refund only part of what was paid). Real refund provider
// processing doesn't exist (nothing in this app has one), so a refund is
// created directly as "completed" — this is the same simulated-but-honest
// idiom as chargeSubscription's "billing tick": a real Refund record,
// created and completed synchronously rather than left in a fake "pending"
// state nothing would ever resolve. Idempotent: a booking already fully
// refunded produces no new records and returns the existing one(s).
export function refundBookingPayments(bookingId: string, refundAmount: number, reason: string): Refund[] {
  if (refundAmount <= 0) return [];
  const existing = getRefundsForBooking(bookingId);
  if (existing.length > 0) return existing;

  let remaining = refundAmount;
  const newRefunds: Refund[] = [];
  const updatedPlans = readPlansRaw().map((p) => {
    if (p.bookingId !== bookingId || p.status !== "paid" || remaining <= 0) return p;
    const refundForThisPlan = Math.min(p.amount, remaining);
    remaining -= refundForThisPlan;
    const refund: Refund = {
      id: randomId("refund"),
      bookingId,
      paymentPlanId: p.id,
      studentName: p.studentName,
      amount: refundForThisPlan,
      status: "completed",
      reason,
      initiatedAtMs: Date.now(),
      completedAtMs: Date.now(),
    };
    newRefunds.push(refund);
    return { ...p, status: (refundForThisPlan >= p.amount ? "refunded" : "partiallyRefunded") as PaymentStatus, refundedAmount: refundForThisPlan };
  });

  if (newRefunds.length === 0) return [];
  writeJson(PLANS_KEY, updatedPlans);
  writeJson(REFUNDS_KEY, [...readRefundsRaw(), ...newRefunds]);
  return newRefunds;
}

// `nextChargeAtMs` starts as "now" (period 0 is due immediately) rather than
// "now + one period" — the caller is expected to immediately follow this
// with `chargeSubscription(id, 0, ...)` to actually charge period 0, and
// THAT call is what advances nextChargeAtMs to one real period out. Seeding
// it a period ahead here too would double-advance it (a real bug caught
// live: a "weekly" subscription's first real charge ended up 14 days out,
// not 7, because both functions were pushing it forward). Also why this
// never calls the impure `Date.now()` from a component's click handler —
// the one real "now" read for a new subscription lives in this store, same
// as every other timestamp this file writes.
export function createSubscription(input: {
  kind: PaymentBookingKind;
  bookingId: string;
  studentName: string;
  frequency: SubscriptionFrequency;
  amountPerCharge: number;
  paymentMethodRef: string;
}): Subscription {
  const subscription: Subscription = {
    id: randomId("sub"),
    status: "active",
    failedAttempts: 0,
    nextChargeAtMs: Date.now(),
    ...input,
  };
  writeJson(SUBSCRIPTIONS_KEY, [...readSubsRaw(), subscription]);
  return subscription;
}

function updateSubscription(id: string, patch: Partial<Subscription>): void {
  writeJson(SUBSCRIPTIONS_KEY, readSubsRaw().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

// Simulates one recurring billing tick. Keyed by a deterministic
// `charge-${subscriptionId}-${periodIndex}` id so re-processing the same
// period (a duplicate/late "webhook", in real-provider terms) is a no-op —
// the existing PaymentPlan is returned rather than a second one being minted.
export function chargeSubscription(subscriptionId: string, periodIndex: number, sessionIdsForPeriod: string[]): PaymentPlan | null {
  const subscription = readSubsRaw().find((s) => s.id === subscriptionId);
  if (!subscription || subscription.status === "cancelled") return null;

  const chargeId = `charge-${subscriptionId}-${periodIndex}`;
  const existing = readPlansRaw().find((p) => p.id === chargeId);
  if (existing) return existing;

  const plan: PaymentPlan = {
    id: chargeId,
    kind: subscription.kind,
    bookingId: subscription.bookingId,
    studentName: subscription.studentName,
    scope: subscription.frequency === "weekly" ? "week" : "month",
    coversSessionIds: sessionIdsForPeriod,
    amount: subscription.amountPerCharge,
    mode: "recurring",
    subscriptionId: subscription.id,
    status: "paid",
    paidAtMs: Date.now(),
  };
  writeJson(PLANS_KEY, [...readPlansRaw(), plan]);

  const periodMs = subscription.frequency === "weekly" ? 7 * 86_400_000 : 30 * 86_400_000;
  updateSubscription(subscription.id, { nextChargeAtMs: subscription.nextChargeAtMs + periodMs, failedAttempts: 0, status: "active" });
  return plan;
}

// A failed recurring charge never deletes the booking/enrollment and never
// touches sessions already unlocked by a prior successful charge — it only
// flips the subscription so the NEXT period's charge (and therefore the next
// period's sessions) stays locked until it succeeds or the student switches
// to a one-time payment.
export function failSubscriptionCharge(subscriptionId: string): void {
  const subscription = readSubsRaw().find((s) => s.id === subscriptionId);
  if (!subscription) return;
  updateSubscription(subscriptionId, { status: "pastDue", failedAttempts: subscription.failedAttempts + 1 });
}

export function cancelSubscription(subscriptionId: string): void {
  updateSubscription(subscriptionId, { status: "cancelled" });
}

// The ONE authoritative "what payment plan did this booking actually sign
// up for" answer — every dashboard (student, tutor, admin) must read this
// instead of independently guessing from schedule/frequency data. This is
// deliberately a DIFFERENT concept from a booking's lesson/session
// frequency (see FrequencyKey in tutor-booking-sidebar.tsx / Cohort.days in
// group-classes-data.ts) — a booking can have 3 sessions/week while its
// payment plan is a one-time purchase, or a once-a-week booking billed
// monthly. Mixing the two up was a real bug (PaymentPlanCard used to render
// the lesson's schedule frequencyLabel under a "Payment Plan" heading) —
// this function and PaymentPlanCard are the fix.
export interface BookingPaymentSummary {
  /** "none" = no real payment record exists for this booking (a legacy/seed booking created before payment tracking existed) — never guessed. */
  mode: PaymentMode | "none";
  /** Billing interval — only meaningful when mode === "recurring". */
  interval: SubscriptionFrequency | null;
  /** Subscription lifecycle — only meaningful when mode === "recurring". */
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionId: string | null;
  /** Net amount actually paid so far (paid + partiallyRefunded amounts, minus any refunded portion) — never a client-supplied price. */
  amountPaid: number;
  /** Status of the most recent payment record, or null if none exists. */
  latestPaymentStatus: PaymentStatus | null;
  /** When the next recurring charge is due — only set for an active/pastDue subscription. */
  nextChargeAtMs: number | null;
}

export function getBookingPaymentSummary(bookingId: string): BookingPaymentSummary {
  const plans = getPaymentPlansForBooking(bookingId);
  if (plans.length === 0) {
    return { mode: "none", interval: null, subscriptionStatus: null, subscriptionId: null, amountPaid: 0, latestPaymentStatus: null, nextChargeAtMs: null };
  }

  const subscriptionId = plans.find((p) => p.subscriptionId)?.subscriptionId ?? getSubscriptionForBooking(bookingId)?.id ?? null;
  const subscription = subscriptionId ? readSubsRaw().find((s) => s.id === subscriptionId) : undefined;

  const amountPaid = plans.reduce((sum, p) => {
    if (p.status === "paid") return sum + p.amount;
    if (p.status === "partiallyRefunded") return sum + (p.amount - (p.refundedAmount ?? 0));
    return sum;
  }, 0);

  const latest = [...plans].sort((a, b) => b.paidAtMs - a.paidAtMs)[0];

  return {
    mode: subscription ? "recurring" : "oneTime",
    interval: subscription?.frequency ?? null,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionId: subscription?.id ?? null,
    amountPaid,
    latestPaymentStatus: latest?.status ?? null,
    nextChargeAtMs: subscription && subscription.status !== "cancelled" ? subscription.nextChargeAtMs : null,
  };
}

// Consistent "One-time" / "Recurring · Weekly" display text — the ONE place
// this label is formatted, so a student, tutor, and admin viewing the same
// booking can never see three differently-worded versions of the same fact.
export function formatPaymentPlanLabel(summary: Pick<BookingPaymentSummary, "mode" | "interval">): string {
  if (summary.mode === "none") return "No payment on file";
  if (summary.mode === "oneTime") return "One-time";
  const intervalLabel = summary.interval === "weekly" ? "Weekly" : summary.interval === "monthly" ? "Monthly" : "";
  return intervalLabel ? `Recurring · ${intervalLabel}` : "Recurring";
}

export function subscribePaymentPlans(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PAYMENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PAYMENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
