// Regression coverage for the one shared classroom-access time gate every
// class kind (Private, Group, Discovery, Counselling) and both roles go
// through — a tutor gets a 24-hour entry window, a student gets 30 minutes.
import { test } from "node:test";
import assert from "node:assert/strict";

import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS, TUTOR_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";

const START = Date.UTC(2026, 8, 10, 12, 0, 0); // Sep 10, 2026, 12:00 UTC
const END = START + 60 * 60 * 1000; // 1-hour class

test("student: locked more than 30 minutes before start", () => {
  const nowMs = START - 31 * 60 * 1000;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs })), false);
});

test("student: unlocked exactly at the 30-minute mark", () => {
  const nowMs = START - STUDENT_ENTRY_WINDOW_MS;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs })), true);
});

test("student: unlocked 1 minute before start", () => {
  const nowMs = START - 60 * 1000;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs })), true);
});

test("tutor: locked more than 24 hours before start", () => {
  const nowMs = START - 25 * 60 * 60 * 1000;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs })), false);
});

test("tutor: unlocked exactly at the 24-hour mark", () => {
  const nowMs = START - TUTOR_ENTRY_WINDOW_MS;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs })), true);
});

test("tutor: unlocked 1 hour before start", () => {
  const nowMs = START - 60 * 60 * 1000;
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs })), true);
});

test("both roles: locked out once the class has ended", () => {
  const nowMs = END + 1000;
  assert.equal(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs }), "ended");
  assert.equal(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs }), "ended");
});

test("both roles: live once the class has actually started", () => {
  const nowMs = START + 1000;
  assert.equal(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs }), "live");
  assert.equal(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs }), "live");
});

test("a tutor's window is strictly wider than a student's for the exact same class", () => {
  const nowMs = START - 2 * 60 * 60 * 1000; // 2 hours before — inside tutor's window, outside student's
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "tutor", nowMs })), true);
  assert.equal(canEnterClassroom(getClassEntryState({ startMs: START, endMs: END, role: "student", nowMs })), false);
});
