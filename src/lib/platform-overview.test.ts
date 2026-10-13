// Regression coverage for the Platform Overview aggregation. Real page-view
// and signup events are seeded with realistic history anchored to wall-clock
// "now" (see page-analytics-store.ts / signup-events-store.ts), so most of
// these tests use BEFORE/AFTER deltas around a fresh, never-before-used
// visitor/signup rather than asserting exact absolute totals — a delta from
// one guaranteed-unique event is correct regardless of how much seed history
// already exists for "today".
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

import { getPlatformOverview } from "@/lib/platform-overview";
import { recordPageView } from "@/lib/page-analytics-store";
import { recordSignup } from "@/lib/signup-events-store";

beforeEach(() => {
  ((globalThis as unknown as { window: { localStorage: FakeStorage } }).window.localStorage as FakeStorage).clear();
});

test("returns exactly bucketCount buckets, newest first, with strictly decreasing start times", () => {
  const overview = getPlatformOverview("day", 7);
  assert.equal(overview.buckets.length, 7);
  for (let i = 1; i < overview.buckets.length; i++) {
    assert.ok(overview.buckets[i - 1].startMs > overview.buckets[i].startMs, "buckets must be newest-first");
  }
});

test("each day bucket spans exactly 24 hours and each bucket is contiguous with the next", () => {
  const overview = getPlatformOverview("day", 5);
  for (const b of overview.buckets) {
    assert.equal(b.endMs - b.startMs, 86_400_000);
  }
  // oldest-to-newest contiguity: bucket[i].endMs === bucket[i-1].startMs (array is newest-first)
  for (let i = 1; i < overview.buckets.length; i++) {
    assert.equal(overview.buckets[i].endMs, overview.buckets[i - 1].startMs);
  }
});

test("week buckets each span exactly 7 days", () => {
  const overview = getPlatformOverview("week", 4);
  for (const b of overview.buckets) {
    assert.equal(b.endMs - b.startMs, 7 * 86_400_000);
  }
});

test("total New Signups across all buckets equals the reported grand total (signups are never double-bucketed or dropped)", () => {
  const overview = getPlatformOverview("day", 30);
  const summed = overview.buckets.reduce((sum, b) => sum + b.newSignups, 0);
  assert.equal(summed, overview.totals.newSignups);
});

test("a fresh, never-before-seen visitor's page view increases Visitors in today's bucket by exactly 1", () => {
  const before = getPlatformOverview("day", 1);
  recordPageView({ path: "/", device: "Desktop", visitorId: `brand-new-visitor-${Date.now()}`, sessionId: "s1" });
  const after = getPlatformOverview("day", 1);
  assert.equal(after.buckets[0].visitors, before.buckets[0].visitors + 1);
});

test("Active Users only counts a visitor whose view was recorded while logged in — an anonymous-only visitor never counts as active", () => {
  // recordPageView stamps loggedIn from the real session-store, which has no
  // window.localStorage-backed session in this test's fake window — so
  // isLoggedIn() is false here, meaning this visit must NOT move Active Users.
  const before = getPlatformOverview("day", 1);
  const freshVisitor = `anon-visitor-${Date.now()}`;
  recordPageView({ path: "/find-teachers", device: "Mobile", visitorId: freshVisitor, sessionId: "s2" });
  const after = getPlatformOverview("day", 1);
  assert.equal(after.buckets[0].visitors, before.buckets[0].visitors + 1);
  assert.equal(after.buckets[0].activeUsers, before.buckets[0].activeUsers);
});

test("a real recorded signup increases New Signups in today's bucket by exactly 1, per role", () => {
  const before = getPlatformOverview("day", 1);
  recordSignup("Student");
  const afterStudent = getPlatformOverview("day", 1);
  assert.equal(afterStudent.buckets[0].newSignups, before.buckets[0].newSignups + 1);

  recordSignup("Tutor");
  const afterTutor = getPlatformOverview("day", 1);
  assert.equal(afterTutor.buckets[0].newSignups, afterStudent.buckets[0].newSignups + 1);
});

test("the same visitor viewing multiple pages in the same bucket is counted once, not once per view", () => {
  const before = getPlatformOverview("day", 1);
  const visitorId = `repeat-visitor-${Date.now()}`;
  recordPageView({ path: "/", device: "Desktop", visitorId, sessionId: "s3" });
  recordPageView({ path: "/find-teachers", device: "Desktop", visitorId, sessionId: "s3" });
  recordPageView({ path: "/help", device: "Desktop", visitorId, sessionId: "s3" });
  const after = getPlatformOverview("day", 1);
  assert.equal(after.buckets[0].visitors, before.buckets[0].visitors + 1);
});
