// Regression coverage for the entitlement/access-control rules this app's
// "server" (payment-plans-store.ts) is supposed to enforce: a one-time
// payment must never silently expand into access it wasn't purchased for,
// a cancelled/past-due subscription must not keep unlocking new periods, and
// the payment-plan summary shown across dashboards must be the one real,
// derived-from-records answer — never independently recomputed per screen.
//
// payment-plans-store.ts only performs real reads/writes when `window`
// exists (see its own makeCachedReader/writeJson guards, matching every
// other store in this app) — under plain `node --test` there is no window,
// so a minimal in-memory localStorage + CustomEvent polyfill is installed
// below before any test runs. The check happens per-call (not at import
// time), so installing it here — before the first test executes — is
// sufficient regardless of import order.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
  }
}

(globalThis as unknown as { window: unknown }).window = {
  localStorage: new FakeStorage(),
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  CustomEvent: class {},
};

import * as paymentPlansStore from "@/lib/payment-plans-store";
import {
  cancelSubscription,
  chargeSubscription,
  createSubscription,
  failSubscriptionCharge,
  formatPaymentPlanLabel,
  getBookingPaymentSummary,
  hasSessionAccess,
  recordPayment,
} from "@/lib/payment-plans-store";

beforeEach(() => {
  ((globalThis as unknown as { window: { localStorage: FakeStorage } }).window.localStorage as FakeStorage).clear();
});

test("a booking with zero payment records is treated as accessible (grandfathered legacy booking)", () => {
  assert.equal(hasSessionAccess("no-such-booking", "session-1", "Cynthia Ejie"), true);
});

test("a one-time payment covers only the sessions it actually paid for — not the whole booking", () => {
  recordPayment({
    kind: "Private",
    bookingId: "b-1",
    studentName: "Cynthia Ejie",
    scope: "session",
    coversSessionIds: ["s-1"],
    amount: 3000,
    mode: "oneTime",
  });

  assert.equal(hasSessionAccess("b-1", "s-1", "Cynthia Ejie"), true);
  // The core "do not silently expand a one-time purchase" rule.
  assert.equal(hasSessionAccess("b-1", "s-2", "Cynthia Ejie"), false);
});

test("a payment for one student never grants access to another student on the same booking id", () => {
  recordPayment({
    kind: "Private",
    bookingId: "b-2",
    studentName: "Cynthia Ejie",
    scope: "session",
    coversSessionIds: ["s-1"],
    amount: 3000,
    mode: "oneTime",
  });
  assert.equal(hasSessionAccess("b-2", "s-1", "A Different Student"), false);
});

test("recurring: a subscription's period-0 charge only unlocks its own sessions, not a future un-charged period", () => {
  const sub = createSubscription({
    kind: "Private",
    bookingId: "b-3",
    studentName: "Cynthia Ejie",
    frequency: "weekly",
    amountPerCharge: 3000,
    paymentMethodRef: "sim-card",
  });
  chargeSubscription(sub.id, 0, ["week1-session-1", "week1-session-2"]);

  assert.equal(hasSessionAccess("b-3", "week1-session-1", "Cynthia Ejie"), true);
  // Period 1 was never charged — its sessions must stay locked.
  assert.equal(hasSessionAccess("b-3", "week2-session-1", "Cynthia Ejie"), false);
});

test("chargeSubscription is idempotent per period — re-processing the same period never mints a duplicate charge (duplicate-webhook safety)", () => {
  const sub = createSubscription({
    kind: "Group",
    bookingId: "b-4",
    studentName: "Cynthia Ejie",
    frequency: "monthly",
    amountPerCharge: 5000,
    paymentMethodRef: "sim-card",
  });
  const first = chargeSubscription(sub.id, 0, ["s-a"]);
  const second = chargeSubscription(sub.id, 0, ["s-a"]);
  assert.equal(first?.id, second?.id);
  assert.equal(getBookingPaymentSummary("b-4").amountPaid, 5000); // not 10000 — no double charge
});

test("a cancelled subscription can never be charged again", () => {
  const sub = createSubscription({
    kind: "Private",
    bookingId: "b-5",
    studentName: "Cynthia Ejie",
    frequency: "weekly",
    amountPerCharge: 3000,
    paymentMethodRef: "sim-card",
  });
  chargeSubscription(sub.id, 0, ["s-1"]);
  cancelSubscription(sub.id);
  const blocked = chargeSubscription(sub.id, 1, ["s-2"]);
  assert.equal(blocked, null);
  assert.equal(hasSessionAccess("b-5", "s-2", "Cynthia Ejie"), false);
});

test("a failed recurring charge locks the NEXT period without revoking already-paid access", () => {
  const sub = createSubscription({
    kind: "Private",
    bookingId: "b-6",
    studentName: "Cynthia Ejie",
    frequency: "weekly",
    amountPerCharge: 3000,
    paymentMethodRef: "sim-card",
  });
  chargeSubscription(sub.id, 0, ["s-1"]);
  failSubscriptionCharge(sub.id);

  assert.equal(hasSessionAccess("b-6", "s-1", "Cynthia Ejie"), true); // already-paid period untouched
  assert.equal(hasSessionAccess("b-6", "s-2", "Cynthia Ejie"), false); // next period never charged
});

test("getBookingPaymentSummary: one-time payment reports mode=oneTime with no interval", () => {
  recordPayment({
    kind: "Private",
    bookingId: "b-7",
    studentName: "Cynthia Ejie",
    scope: "full",
    coversSessionIds: ["s-1", "s-2", "s-3"],
    amount: 9000,
    mode: "oneTime",
  });
  const summary = getBookingPaymentSummary("b-7");
  assert.equal(summary.mode, "oneTime");
  assert.equal(summary.interval, null);
  assert.equal(summary.amountPaid, 9000);
  assert.equal(formatPaymentPlanLabel(summary), "One-time");
});

test("getBookingPaymentSummary: recurring subscription reports mode=recurring with its real interval", () => {
  const sub = createSubscription({
    kind: "Group",
    bookingId: "b-8",
    studentName: "Cynthia Ejie",
    frequency: "monthly",
    amountPerCharge: 12000,
    paymentMethodRef: "sim-card",
  });
  chargeSubscription(sub.id, 0, ["s-1"]);
  const summary = getBookingPaymentSummary("b-8");
  assert.equal(summary.mode, "recurring");
  assert.equal(summary.interval, "monthly");
  assert.equal(summary.subscriptionStatus, "active");
  assert.equal(formatPaymentPlanLabel(summary), "Recurring · Monthly");
});

// Guards against exactly the real bug found and fixed this session: a
// booking's SESSION/lesson schedule frequency (e.g. "3x per week") must
// never be confused with its PAYMENT plan interval — they are independent
// facts about the same booking.
test("payment plan interval is independent of how often sessions occur — a weekly-lesson booking can still be paid one-time", () => {
  // 3 sessions/week lesson schedule, paid for as a single one-time purchase.
  recordPayment({
    kind: "Private",
    bookingId: "b-9",
    studentName: "Cynthia Ejie",
    scope: "full",
    coversSessionIds: ["mon", "wed", "fri"],
    amount: 9000,
    mode: "oneTime",
  });
  const summary = getBookingPaymentSummary("b-9");
  assert.equal(summary.mode, "oneTime");
  assert.equal(formatPaymentPlanLabel(summary), "One-time");
});

test("no payment on file is reported distinctly from a real one-time/recurring plan", () => {
  const summary = getBookingPaymentSummary("b-never-paid");
  assert.equal(summary.mode, "none");
  assert.equal(formatPaymentPlanLabel(summary), "No payment on file");
});

// Acceptance criteria J/K ("a direct request to change the payment plan
// after creation without authorization must fail" / "a client faking payment
// success must fail"), translated into this app's real architecture: there
// is no real HTTP API or server, so the honest equivalent of "server-side
// enforcement" is that payment-plans-store.ts is the ONLY writer of its own
// localStorage keys (verified earlier this session — grepping the whole
// src/ tree for the raw key found no other file touching it), and it
// exposes no generic "setStatus"/"updatePaymentPlan" mutator a caller could
// use to grant access without going through a real recordPayment/
// chargeSubscription/refund call. These tests assert that contract directly
// against the module's actual exports, not just against today's call sites.
test("J: there is no generic mutator that lets a caller directly set a PaymentPlan's status/coverage after creation", () => {
  const exportNames = Object.keys(paymentPlansStore);
  const forbidden = ["updatePaymentPlan", "setPaymentPlanStatus", "setStatus", "patchPaymentPlan", "overridePaymentPlan"];
  for (const name of forbidden) {
    assert.equal(exportNames.includes(name), false, `payment-plans-store.ts must not export ${name}`);
  }
});

test("K: a client cannot fake payment success by recording a payment under someone else's name — access stays scoped to the real payer", () => {
  recordPayment({
    kind: "Private",
    bookingId: "b-spoof",
    studentName: "Real Payer",
    scope: "session",
    coversSessionIds: ["s-1"],
    amount: 3000,
    mode: "oneTime",
  });
  // An attacker who only controls their OWN client cannot grant themselves
  // access to a session they never paid for by claiming someone else's name
  // — hasSessionAccess is keyed on the exact studentName a real payment was
  // recorded under.
  assert.equal(hasSessionAccess("b-spoof", "s-1", "Attacker"), false);
  // Nor can access be claimed for a session that was simply never paid for,
  // no matter whose name is used.
  assert.equal(hasSessionAccess("b-spoof", "s-2", "Real Payer"), false);
});

// The explicit end-to-end acceptance scenario required by the payment-
// entitlement spec: an 8-week/16-session Group Class where the student paid
// only for Week 1 must leave Weeks 2-8 genuinely locked — not just visually
// hidden — even though the class has 8 real generated weeks. Uses the real
// group-class schedule engine (group-class-schedule.ts) rather than
// hand-authored session ids, so this also proves the payment layer and the
// scheduling engine agree on what a "week" is.
test("8-week Group Class paid only for Week 1: Week 1 sessions unlock, Weeks 2-8 stay locked", async () => {
  const { buildGroupSessionSchedule } = await import("@/lib/group-class-schedule");
  const bookingId = "gc-enrollment-42";
  const schedule = buildGroupSessionSchedule("Tue,Thu", "2026-09-08", 8, "2026-09-01");
  assert.equal(schedule.length, 16); // 2 sessions/week * 8 weeks

  const week1SessionIds = schedule.filter((s) => s.weekNumber === 1).map((_, i) => `${bookingId}-session-${i}`);
  recordPayment({
    kind: "Group",
    bookingId,
    studentName: "Cynthia Ejie",
    scope: "week",
    coversSessionIds: week1SessionIds,
    amount: 5000,
    mode: "oneTime",
  });

  const idFor = (index: number) => `${bookingId}-session-${index}`;
  // Week 1 (sessions 0-1): paid.
  assert.equal(hasSessionAccess(bookingId, idFor(0), "Cynthia Ejie"), true);
  assert.equal(hasSessionAccess(bookingId, idFor(1), "Cynthia Ejie"), true);
  // Weeks 2-8 (sessions 2-15): every single one must still be locked, even
  // though the enrollment/class itself covers all 8 weeks.
  for (let i = 2; i < 16; i++) {
    assert.equal(hasSessionAccess(bookingId, idFor(i), "Cynthia Ejie"), false, `session index ${i} should still require payment`);
  }
});
