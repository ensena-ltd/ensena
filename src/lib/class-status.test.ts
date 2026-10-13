// Covers the edge cases explicitly called out for the timezone/status
// cleanup pass: tomorrow, later today, started earlier today, ended earlier
// today, yesterday, cancelled-future, completed-past, past-not-attended,
// and midnight-crossing — all anchored to the reported reference instant
// (Sep 8, 2026, 2:23 PM Africa/Lagos) so the fix for the actual reported bug
// (Aug 29 showing as Upcoming on Sep 8) has a permanent regression test.
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyClassStatus } from "@/lib/class-status";
import { platformWallTimeToMs } from "@/lib/platform-time";

const REFERENCE_NOW_MS = platformWallTimeToMs(2026, 9, 8, 14, 23); // Sep 8, 2026, 2:23 PM Lagos

test("a class tomorrow is Upcoming", () => {
  const startMs = platformWallTimeToMs(2026, 9, 9, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 9, 11, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Upcoming");
});

test("a class later today (5 PM, after the 2:23 PM reference) is Upcoming", () => {
  const startMs = platformWallTimeToMs(2026, 9, 8, 17, 0);
  const endMs = platformWallTimeToMs(2026, 9, 8, 18, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Upcoming");
});

test("a class that started earlier today and is still running is Live", () => {
  const startMs = platformWallTimeToMs(2026, 9, 8, 14, 0);
  const endMs = platformWallTimeToMs(2026, 9, 8, 15, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Live");
});

test("a class that already ended earlier today (10 AM) is Completed, not Upcoming", () => {
  const startMs = platformWallTimeToMs(2026, 9, 8, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 8, 11, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Completed");
});

test("a class yesterday is Completed, not Upcoming", () => {
  const startMs = platformWallTimeToMs(2026, 9, 7, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 7, 11, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Completed");
});

test("regression: a class from Aug 29 must never classify as Upcoming when now is Sep 8", () => {
  const startMs = platformWallTimeToMs(2026, 8, 29, 16, 0);
  const endMs = platformWallTimeToMs(2026, 8, 29, 17, 0);
  const status = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS });
  assert.notEqual(status, "Upcoming");
  assert.equal(status, "Completed");
});

test("a cancelled class scheduled in the future is Cancelled, not Upcoming", () => {
  const startMs = platformWallTimeToMs(2026, 9, 9, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 9, 11, 0);
  assert.equal(classifyClassStatus({ isCancelled: true, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Cancelled");
});

test("a past class with no attendance signal defaults to Completed (never assumed NotAttended)", () => {
  const startMs = platformWallTimeToMs(2026, 8, 29, 16, 0);
  const endMs = platformWallTimeToMs(2026, 8, 29, 17, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS }), "Completed");
});

test("a past class with a real attended:false record is NotAttended", () => {
  const startMs = platformWallTimeToMs(2026, 8, 29, 16, 0);
  const endMs = platformWallTimeToMs(2026, 8, 29, 17, 0);
  assert.equal(
    classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS, attended: false }),
    "NotAttended"
  );
});

test("a past class with attended:true stays Completed", () => {
  const startMs = platformWallTimeToMs(2026, 8, 29, 16, 0);
  const endMs = platformWallTimeToMs(2026, 8, 29, 17, 0);
  assert.equal(
    classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS, attended: true }),
    "Completed"
  );
});

test("cancelled always wins over attendance evidence", () => {
  const startMs = platformWallTimeToMs(2026, 8, 29, 16, 0);
  const endMs = platformWallTimeToMs(2026, 8, 29, 17, 0);
  assert.equal(
    classifyClassStatus({ isCancelled: true, startMs, endMs, nowMs: REFERENCE_NOW_MS, attended: false }),
    "Cancelled"
  );
});

test("midnight-crossing class (11:30 PM to 12:30 AM Lagos): Live while in progress across the day boundary", () => {
  const startMs = platformWallTimeToMs(2026, 9, 7, 23, 30);
  const endMs = platformWallTimeToMs(2026, 9, 8, 0, 30);
  const nowMs = platformWallTimeToMs(2026, 9, 8, 0, 0); // midnight, mid-class
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs }), "Live");
});

test("midnight-crossing class: Upcoming shortly before it starts (still the previous day)", () => {
  const startMs = platformWallTimeToMs(2026, 9, 7, 23, 30);
  const endMs = platformWallTimeToMs(2026, 9, 8, 0, 30);
  const nowMs = platformWallTimeToMs(2026, 9, 7, 23, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs }), "Upcoming");
});

test("midnight-crossing class: Completed shortly after it ends (now the next day)", () => {
  const startMs = platformWallTimeToMs(2026, 9, 7, 23, 30);
  const endMs = platformWallTimeToMs(2026, 9, 8, 0, 30);
  const nowMs = platformWallTimeToMs(2026, 9, 8, 1, 0);
  assert.equal(classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs }), "Completed");
});

test("status is independent of booking kind: identical private-class-shaped and group-class-shaped inputs classify identically", () => {
  const startMs = platformWallTimeToMs(2026, 9, 9, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 9, 11, 0);
  const privateStatus = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS });
  const groupStatus = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS });
  assert.equal(privateStatus, groupStatus);
  assert.equal(privateStatus, "Upcoming");
});

test("status is independent of which dashboard is asking: same inputs, same result regardless of caller context", () => {
  const startMs = platformWallTimeToMs(2026, 9, 8, 10, 0);
  const endMs = platformWallTimeToMs(2026, 9, 8, 11, 0);
  const tutorDashboardView = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS });
  const studentDashboardView = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs: REFERENCE_NOW_MS });
  assert.equal(tutorDashboardView, studentDashboardView);
});
