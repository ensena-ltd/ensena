// Regression coverage for the top-of-funnel conversion metric — every stage
// must come from its own real store, and each stage must count real events
// only within the requested window (never include the seeded history from
// an unrelated period, never double-count a multi-session booking's
// sibling lessons as separate "bookings").
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

const fakeStorage = new FakeStorage();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: fakeStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  CustomEvent: class {},
};

import { getConversionFunnel } from "@/lib/conversion-funnel";
import { recordPageView } from "@/lib/page-analytics-store";
import { recordPayment } from "@/lib/payment-plans-store";
import { recordSignup } from "@/lib/signup-events-store";

const PRIVATE_LESSONS_KEY = "ensena_private_lessons";
const GROUP_ENROLLMENTS_KEY = "ensena_group_class_enrollments";

beforeEach(() => {
  fakeStorage.clear();
});

test("a fresh window with zero real activity reports all-zero funnel stages", () => {
  const now = Date.now();
  const funnel = getConversionFunnel(now, now + 1);
  assert.deepEqual(funnel, { views: 0, signups: 0, bookings: 0, payments: 0 });
});

test("views counts distinct visitors, not raw page-view events", () => {
  const testStart = Date.now();
  recordPageView({ path: "/", device: "Desktop", visitorId: "v-1", sessionId: "s-1" });
  recordPageView({ path: "/find-teachers", device: "Desktop", visitorId: "v-1", sessionId: "s-1" });
  recordPageView({ path: "/", device: "Mobile", visitorId: "v-2", sessionId: "s-2" });
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.views, 2);
});

test("signups counts real signup events in the window", () => {
  const testStart = Date.now();
  recordSignup("Student");
  recordSignup("Tutor");
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.signups, 2);
});

test("a multi-session private booking (3 sibling lessons sharing one bookingId) counts as ONE booking, not three", () => {
  const testStart = Date.now();
  const lessons = [
    { id: "pl-a", bookingId: "PRV-FUNNEL-1", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", createdAtMs: testStart + 100 },
    { id: "pl-b", bookingId: "PRV-FUNNEL-1", student: "Cynthia", date: "Sep 9, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", createdAtMs: testStart + 100 },
    { id: "pl-c", bookingId: "PRV-FUNNEL-1", student: "Cynthia", date: "Sep 10, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", createdAtMs: testStart + 100 },
  ];
  fakeStorage.setItem(PRIVATE_LESSONS_KEY, JSON.stringify(lessons));
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.bookings, 1);
});

test("a standalone one-time private lesson (no bookingId) counts as its own booking", () => {
  const testStart = Date.now();
  fakeStorage.setItem(
    PRIVATE_LESSONS_KEY,
    JSON.stringify([{ id: "pl-solo", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", createdAtMs: testStart + 100 }])
  );
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.bookings, 1);
});

test("a group class enrollment counts as a booking, added on top of private bookings", () => {
  const testStart = Date.now();
  fakeStorage.setItem(
    GROUP_ENROLLMENTS_KEY,
    JSON.stringify([{ id: "GRP-1", bookingReference: "GRP-1", slug: "neco-physics-bootcamp", cohortIndex: 0, plan: "full", studentName: "Cynthia", atMs: testStart + 100 }])
  );
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.bookings, 1);
});

test("a booking created before the window started is excluded", () => {
  const testStart = Date.now();
  fakeStorage.setItem(
    PRIVATE_LESSONS_KEY,
    JSON.stringify([{ id: "pl-old", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", createdAtMs: testStart - 100_000 }])
  );
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.bookings, 0);
});

test("a legacy lesson with no createdAtMs at all is never counted as a booking (never guessed)", () => {
  fakeStorage.setItem(
    PRIVATE_LESSONS_KEY,
    JSON.stringify([{ id: "pl-legacy", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming" }])
  );
  const funnel = getConversionFunnel(0, Date.now() + 999_999_999);
  assert.equal(funnel.bookings, 0);
});

test("payments counts only real 'paid' PaymentPlan records in the window", () => {
  const testStart = Date.now();
  recordPayment({ kind: "Private", bookingId: "b-funnel", studentName: "Cynthia", scope: "full", coversSessionIds: ["s-1"], amount: 3000, mode: "oneTime" });
  const funnel = getConversionFunnel(testStart, testStart + 10_000);
  assert.equal(funnel.payments, 1);
});
