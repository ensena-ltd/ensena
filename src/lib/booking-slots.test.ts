import { test } from "node:test";
import assert from "node:assert/strict";

import { addDaysToISO, availableSlots, bookingPrices, dayOfWeekISO, sessionPrice, type WeeklyRange } from "@/lib/booking-slots";
import { platformWallTimeToMs } from "@/lib/platform-time";

// 2026-10-12 is a Monday.
const MONDAY = "2026-10-12";
const weekly: WeeklyRange[] = [{ dayOfWeek: 1, start: "10:00", end: "12:00" }];
const lagos = (h: number, m = 0) => platformWallTimeToMs(2026, 10, 12, h, m);
const longAgo = Date.UTC(2026, 0, 1);

test("weekday of an ISO date", () => {
  assert.equal(dayOfWeekISO(MONDAY), 1);
  assert.equal(dayOfWeekISO(addDaysToISO(MONDAY, 6)), 0);
});

test("slots fill the tutor's range on a 30-minute grid, in Lagos time", () => {
  const slots = availableSlots({ dateISO: MONDAY, durationMinutes: 60, weekly, busy: [], nowMs: longAgo });
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [lagos(10), lagos(10, 30), lagos(11)]
  );
  assert.equal(slots[0].endMs - slots[0].startMs, 60 * 60_000);
});

test("no slots on days the tutor doesn't teach", () => {
  assert.equal(availableSlots({ dateISO: addDaysToISO(MONDAY, 1), durationMinutes: 60, weekly, busy: [], nowMs: longAgo }).length, 0);
});

test("busy intervals block every overlapping start", () => {
  const busy = [{ startMs: lagos(10, 30), endMs: lagos(11) }];
  const slots = availableSlots({ dateISO: MONDAY, durationMinutes: 60, weekly, busy, nowMs: longAgo });
  assert.deepEqual(slots.map((s) => s.startMs), [lagos(11)]);
});

test("back-to-back lessons are allowed", () => {
  const busy = [{ startMs: lagos(10), endMs: lagos(11) }];
  const slots = availableSlots({ dateISO: MONDAY, durationMinutes: 60, weekly, busy, nowMs: longAgo });
  assert.deepEqual(slots.map((s) => s.startMs), [lagos(11)]);
});

test("minimum notice hides slots that start too soon", () => {
  const slots = availableSlots({ dateISO: MONDAY, durationMinutes: 30, weekly, busy: [], nowMs: lagos(9) });
  // 2h notice from 09:00 → earliest 11:00.
  assert.deepEqual(slots.map((s) => s.startMs), [lagos(11), lagos(11, 30)]);
});

test("pricing pro-rates the hourly rate and discounts monthly plans", () => {
  assert.equal(sessionPrice(3000, 60), 3000);
  assert.equal(sessionPrice(3000, 45), 2250);
  assert.deepEqual(bookingPrices(3000, 60, "weekly", 3), { perSession: [3000, 3000, 3000], total: 9000 });
  const monthly = bookingPrices(3000, 60, "monthly", 8);
  assert.equal(monthly.total, 21600);
  assert.equal(monthly.perSession.reduce((a, b) => a + b, 0), monthly.total);
});
