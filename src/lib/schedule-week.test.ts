// Regression coverage for the single shared calendar-week calculation used
// by every scheduling engine in the app (private lessons, group classes, and
// the tutor Manage Class sessions tab) — see schedule-week.ts.
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeWeekNumber, computeWeekNumberFromDates } from "@/lib/schedule-week";

test("the start date itself is always Week 1", () => {
  assert.equal(computeWeekNumber("2026-09-08", "2026-09-08"), 1);
});

test("every day within the first 7 days of the start date is Week 1", () => {
  for (const d of ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"]) {
    assert.equal(computeWeekNumber("2026-09-08", d), 1);
  }
});

test("day 7 after start rolls into Week 2", () => {
  assert.equal(computeWeekNumber("2026-09-08", "2026-09-15"), 2);
});

test("a month boundary does not reset the week count", () => {
  assert.equal(computeWeekNumber("2026-09-30", "2026-10-02"), 1);
});

test("a year boundary does not reset the week count", () => {
  assert.equal(computeWeekNumber("2026-12-30", "2027-01-01"), 1);
});

test("a date before the start date is clamped to Week 1, never Week 0 or negative", () => {
  // Structurally unreachable from every real caller (each generation loop
  // only walks forward from its own start date) — this asserts the
  // defense-in-depth clamp itself, since "there is no such thing as Week 0"
  // must hold even under a hypothetical future misuse.
  assert.equal(computeWeekNumber("2026-09-08", "2026-09-01"), 1);
  assert.equal(computeWeekNumber("2026-09-08", "2026-08-01"), 1);
});

test("Date-object overload agrees with the ISO-string version for the same calendar days", () => {
  const start = new Date(2026, 8, 8); // Tue Sep 8, 2026
  const target = new Date(2026, 8, 15); // the following Tue
  assert.equal(computeWeekNumberFromDates(start, target), computeWeekNumber("2026-09-08", "2026-09-15"));
});
