// Regression coverage for the self-healing weekNumber correction in
// getPrivateLessons() — proves an EXISTING, already-persisted booking with a
// stale/wrong weekNumber (e.g. from before schedule-week.ts's single shared
// calculation existed) displays correctly without any destructive rewrite,
// without needing a developer to hand-patch that specific booking, and
// without disturbing any other field on the record.
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

import { getPrivateLessons } from "@/lib/private-lessons-store";

const LESSONS_KEY = "ensena_private_lessons";

beforeEach(() => {
  fakeStorage.clear();
});

function seedLessons(lessons: unknown[]): void {
  fakeStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
}

test("an existing booking with a stale 'Week 0' persisted on its first session self-heals to Week 1 on read", () => {
  seedLessons([
    { id: "pl-a", bookingId: "PRV-LEGACY-1", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 0, sessionNumber: 1, totalSessions: 3 },
    { id: "pl-b", bookingId: "PRV-LEGACY-1", student: "Cynthia", date: "Sep 9, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 1, sessionNumber: 2, totalSessions: 3 },
    { id: "pl-c", bookingId: "PRV-LEGACY-1", student: "Cynthia", date: "Sep 10, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 1, sessionNumber: 3, totalSessions: 3 },
  ]);
  const lessons = getPrivateLessons();
  assert.deepEqual(
    lessons.map((l) => l.weekNumber),
    [1, 1, 1]
  );
});

test("correcting weekNumber never touches any other field on the record (price, status, ids all preserved exactly)", () => {
  seedLessons([
    { id: "pl-a", bookingId: "PRV-LEGACY-2", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 0, sessionNumber: 1, totalSessions: 1 },
  ]);
  const [lesson] = getPrivateLessons();
  assert.equal(lesson.price, "₦3,000");
  assert.equal(lesson.status, "Upcoming");
  assert.equal(lesson.student, "Cynthia");
  assert.equal(lesson.id, "pl-a");
  assert.equal(lesson.weekNumber, 1);
});

test("a genuine multi-week booking (real tutor-conflict reschedule) keeps its real Week 2, never forced back to Week 1", () => {
  seedLessons([
    { id: "pl-a", bookingId: "PRV-LEGACY-3", student: "Cynthia", date: "Aug 26, 2026", time: "4:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 1, sessionNumber: 1, totalSessions: 2 },
    // Real reschedule to the following week due to a tutor conflict — this
    // must stay Week 2, not be collapsed into Week 1.
    { id: "pl-b", bookingId: "PRV-LEGACY-3", student: "Cynthia", date: "Sep 4, 2026", time: "4:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 2, sessionNumber: 2, totalSessions: 2 },
  ]);
  const lessons = getPrivateLessons();
  assert.deepEqual(
    lessons.map((l) => l.weekNumber),
    [1, 2]
  );
});

test("a booking that already has correct weekNumbers is returned as the exact same array reference (no unnecessary allocation, useSyncExternalStore-safe)", () => {
  seedLessons([
    { id: "pl-a", bookingId: "PRV-LEGACY-4", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming", weekNumber: 1, sessionNumber: 1, totalSessions: 1 },
  ]);
  const first = getPrivateLessons();
  const second = getPrivateLessons();
  assert.equal(first, second);
});

test("a standalone one-time lesson with no bookingId is left completely untouched", () => {
  seedLessons([{ id: "pl-solo", student: "Cynthia", date: "Sep 8, 2026", time: "12:00 PM", price: "₦3,000", status: "Upcoming" }]);
  const [lesson] = getPrivateLessons();
  assert.equal(lesson.weekNumber, undefined);
});
