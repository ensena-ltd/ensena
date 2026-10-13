// Regression coverage for the one platform-wide, Africa/Lagos-aware clock —
// the root fix for the "August 29 still shows as Upcoming" class of bug:
// every scheduling calculation must go through this, never a bare
// `new Date(year, month, day, hour, minute)` (silently local-timezone).
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatPlatformDate, getPlatformTodayParts, parsePlatformDateTime, platformWallTimeToMs } from "@/lib/platform-time";

test("platformWallTimeToMs: Sep 8, 2026, 2:23 PM Lagos time is the real UTC instant 13:23 (Lagos is UTC+1)", () => {
  const ms = platformWallTimeToMs(2026, 9, 8, 14, 23);
  const asUtc = new Date(ms);
  assert.equal(asUtc.getUTCFullYear(), 2026);
  assert.equal(asUtc.getUTCMonth(), 8); // 0-based -> September
  assert.equal(asUtc.getUTCDate(), 8);
  assert.equal(asUtc.getUTCHours(), 13);
  assert.equal(asUtc.getUTCMinutes(), 23);
});

test("platformWallTimeToMs: midnight Lagos time is 11 PM UTC the PREVIOUS day", () => {
  const ms = platformWallTimeToMs(2026, 9, 8, 0, 0);
  const asUtc = new Date(ms);
  assert.equal(asUtc.getUTCDate(), 7);
  assert.equal(asUtc.getUTCHours(), 23);
});

test("parsePlatformDateTime: a real date string + time parses to the correct Lagos-anchored instant", () => {
  const ms = parsePlatformDateTime("Aug 28, 2026", "4:00 PM");
  const expected = platformWallTimeToMs(2026, 8, 28, 16, 0);
  assert.equal(ms, expected);
});

test("parsePlatformDateTime: 'Today' resolves against Lagos's own current date, not an arbitrary nowMs interpretation", () => {
  const lagosNoonSep8 = platformWallTimeToMs(2026, 9, 8, 12, 0);
  const ms = parsePlatformDateTime("Today", "3:00 PM", lagosNoonSep8);
  const expected = platformWallTimeToMs(2026, 9, 8, 15, 0);
  assert.equal(ms, expected);
});

test("parsePlatformDateTime: 'Tomorrow' resolves to the day after Lagos's current date", () => {
  const lagosNoonSep8 = platformWallTimeToMs(2026, 9, 8, 12, 0);
  const ms = parsePlatformDateTime("Tomorrow", "9:00 AM", lagosNoonSep8);
  const expected = platformWallTimeToMs(2026, 9, 9, 9, 0);
  assert.equal(ms, expected);
});

test("getPlatformTodayParts: a real instant maps to its correct Lagos calendar date", () => {
  const ms = platformWallTimeToMs(2026, 9, 8, 23, 30); // 11:30 PM Lagos
  const parts = getPlatformTodayParts(ms);
  assert.deepEqual(parts, { year: 2026, month: 9, day: 8 });
});

test("getPlatformTodayParts: near-midnight UTC instant that is already the NEXT day in Lagos", () => {
  // 2026-09-08 23:30 UTC is 2026-09-09 00:30 in Lagos (UTC+1) — the exact
  // class of bug a non-timezone-aware "today" calculation would get wrong.
  const utcMs = Date.UTC(2026, 8, 8, 23, 30);
  const parts = getPlatformTodayParts(utcMs);
  assert.deepEqual(parts, { year: 2026, month: 9, day: 9 });
});

test("formatPlatformDate produces the established human-readable convention", () => {
  const ms = platformWallTimeToMs(2026, 9, 8, 12, 0);
  assert.equal(formatPlatformDate(ms), "September 8, 2026");
});

test("noon-local-time regression: the exact reported bug — Aug 29 must be firmly in the past relative to Sep 8, 2:23 PM Lagos", () => {
  const referenceNowMs = platformWallTimeToMs(2026, 9, 8, 14, 23);
  const aug29Ms = parsePlatformDateTime("Aug 29, 2026", "5:00 PM");
  assert.ok(aug29Ms < referenceNowMs, "Aug 29, 2026 must be before Sep 8, 2026 2:23 PM Lagos time");
});
