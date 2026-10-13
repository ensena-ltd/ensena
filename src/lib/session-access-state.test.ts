// Regression coverage for the one centralized session-access decision
// function every dashboard/classroom surface must call. Covers the required
// test matrix: paid upcoming/joinable/attended/missed, unpaid future/past,
// payment scheduled vs required (the recurring-vs-one-time distinction), and
// cancelled.
import { test } from "node:test";
import assert from "node:assert/strict";

import { getSessionAccessState, getUnpaidPaymentTiming } from "@/lib/session-access-state";

test("paid + too-early = Upcoming, locked, no join action", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "too-early" });
  assert.equal(r.state, "paid-upcoming");
  assert.equal(r.label, "Upcoming");
  assert.equal(r.locked, true);
  assert.equal(r.canJoin, false);
});

test("paid + entry-available = Join class, unlocked", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "entry-available" });
  assert.equal(r.state, "paid-joinable");
  assert.equal(r.label, "Join class");
  assert.equal(r.locked, false);
  assert.equal(r.canJoin, true);
});

test("paid + live = Join class, unlocked", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "live" });
  assert.equal(r.state, "paid-joinable");
  assert.equal(r.canJoin, true);
});

test("paid + real attendance record 'attended' = Attended, regardless of entry state", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "ended", attendance: "attended" });
  assert.equal(r.state, "attended");
  assert.equal(r.locked, false);
});

test("paid + real attendance record 'missed' = Missed (only reachable when payment access existed)", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "ended", attendance: "missed" });
  assert.equal(r.state, "missed");
  assert.equal(r.locked, true);
});

test("unpaid + session already ended = Not paid, never Missed", () => {
  const r = getSessionAccessState({ hasPaid: false, entryState: "ended", unpaidTiming: "required" });
  assert.equal(r.state, "not-paid");
  assert.equal(r.label, "Not paid");
  assert.notEqual(r.label, "Missed");
});

test("unpaid + upcoming + no live recurring plan = Payment required, with a 'Pay for Week X' CTA", () => {
  const r = getSessionAccessState({ hasPaid: false, entryState: "too-early", unpaidTiming: "required", weekLabel: "Week 2" });
  assert.equal(r.state, "payment-required");
  assert.equal(r.locked, true);
  assert.equal(r.payCtaLabel, "Pay for Week 2");
});

test("unpaid + upcoming + active recurring plan not yet due = Payment scheduled, stays locked, no alarming CTA", () => {
  const r = getSessionAccessState({ hasPaid: false, entryState: "too-early", unpaidTiming: "scheduled" });
  assert.equal(r.state, "payment-scheduled");
  assert.equal(r.locked, true);
  assert.equal(r.payCtaLabel, undefined);
});

test("cancelled session always reports Cancelled regardless of payment state", () => {
  const r = getSessionAccessState({ hasPaid: true, entryState: "too-early", cancelled: true });
  assert.equal(r.state, "cancelled");
  const r2 = getSessionAccessState({ hasPaid: false, entryState: "ended", cancelled: true });
  assert.equal(r2.state, "cancelled");
});

test("getUnpaidPaymentTiming: active subscription with a future charge date is 'scheduled'", () => {
  const now = Date.UTC(2026, 8, 10);
  assert.equal(getUnpaidPaymentTiming("active", now + 86_400_000, now), "scheduled");
});

test("getUnpaidPaymentTiming: active subscription whose charge date has already passed is 'required', never left as 'scheduled' forever", () => {
  const now = Date.UTC(2026, 8, 10);
  assert.equal(getUnpaidPaymentTiming("active", now - 1000, now), "required");
});

test("getUnpaidPaymentTiming: pastDue subscription is 'required'", () => {
  assert.equal(getUnpaidPaymentTiming("pastDue", Date.now() + 999_999, Date.now()), "required");
});

test("getUnpaidPaymentTiming: cancelled subscription is 'required' (no live auto-pay to lean on)", () => {
  assert.equal(getUnpaidPaymentTiming("cancelled", Date.now() + 999_999, Date.now()), "required");
});

test("getUnpaidPaymentTiming: no subscription at all is 'required' (one-time payer)", () => {
  assert.equal(getUnpaidPaymentTiming(null, null, Date.now()), "required");
});
