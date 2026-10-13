// Regression coverage for the "Week 0" / weekday-splitting bug class: a
// student selecting several weekdays that all fall within the same calendar
// week must get them all grouped into Week 1 (not spread across weeks)
// UNLESS the tutor has a genuine conflict on one of those exact dates, in
// which case only that one occurrence should move to its next available
// weekday. See buildPrivateLessonSchedule's own inline comment for the root
// cause this guards against (findNextBookableOccurrence anchoring on
// "today" instead of the booking's own start date).
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPrivateLessonSchedule, numberSchedule } from "@/lib/private-booking-schedule";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { getTutorBySlug, type TutorListing } from "@/lib/tutors";

// A synthetic tutor with no seed private lessons / discovery sessions /
// group classes anywhere in the app's demo data, so these "no conflict"
// tests can assert exact dates without depending on (or being broken by)
// unrelated seed data elsewhere in the codebase.
const noConflictTutor: TutorListing = {
  ...(getTutorBySlug("faruk-musa") as TutorListing),
  slug: "test-tutor-no-real-conflicts",
  name: "Test Tutor NC",
  availability: ["Weekdays", "Weekends", "Evenings"],
};

const NOON = 12 * 60;
const ONE_PM = 13 * 60;

function iso(dates: Date[]): string[] {
  return dates.map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}

test("Tue/Wed/Thu selected in the same week all land in Week 1", () => {
  const startDate = new Date(2026, 8, 8); // Tue Sep 8, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Tue", "Wed", "Thu"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-09-08", "2026-09-09", "2026-09-10"]);
  const numbered = numberSchedule(dates, startDate);
  assert.deepEqual(numbered.map((s) => s.weekNumber), [1, 1, 1]);
});

test("Mon/Tue/Wed selected in the same week all land in Week 1", () => {
  const startDate = new Date(2026, 7, 24); // Mon Aug 24, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Mon", "Tue", "Wed"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-08-24", "2026-08-25", "2026-08-26"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1, 1]);
});

test("Wed/Thu/Fri selected in the same week all land in Week 1", () => {
  const startDate = new Date(2026, 7, 26); // Wed Aug 26, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Wed", "Thu", "Fri"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-08-26", "2026-08-27", "2026-08-28"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1, 1]);
});

test("non-consecutive Mon/Wed/Fri selected in the same week all land in Week 1", () => {
  const startDate = new Date(2026, 7, 24); // Mon Aug 24, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Mon", "Wed", "Fri"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-08-24", "2026-08-26", "2026-08-28"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1, 1]);
});

test("schedule crossing a month boundary stays in Week 1", () => {
  const startDate = new Date(2026, 8, 30); // Wed Sep 30, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Wed", "Thu", "Fri"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-09-30", "2026-10-01", "2026-10-02"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1, 1]);
});

test("schedule crossing a year boundary stays in Week 1", () => {
  const startDate = new Date(2026, 11, 30); // Wed Dec 30, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Wed", "Thu", "Fri"],
    sessionsForFrequency: 3,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-12-30", "2026-12-31", "2027-01-01"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1, 1]);
});

test("start date lands on one of the selected weekdays: that day is used as-is (no search)", () => {
  const startDate = new Date(2026, 8, 8); // Tue Sep 8, 2026
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Tue", "Thu"],
    sessionsForFrequency: 2,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.equal(dates[0].getTime(), startDate.getTime());
});

test("start date does not land on any selected weekday: every day is still found correctly", () => {
  const startDate = new Date(2026, 8, 8); // Tue Sep 8, 2026 — not Wed or Fri
  const dates = buildPrivateLessonSchedule({
    tutor: noConflictTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Wed", "Fri"],
    sessionsForFrequency: 2,
    startMinutes: NOON,
    endMinutes: ONE_PM,
  });
  assert.deepEqual(iso(dates), ["2026-09-09", "2026-09-11"]);
  assert.deepEqual(numberSchedule(dates, startDate).map((s) => s.weekNumber), [1, 1]);
});

// A genuine conflict must still move only the conflicting occurrence — this
// is the one behavior that should NOT be "fixed" away. dashboardTutor's real
// seed data (tutor-dashboard-data.ts) has an actual booked private lesson on
// Fri Aug 28, 2026, 4:00–5:00 PM ("pl-11"), so requesting that exact
// tutor/date/time is a real conflict, not a simulated one.
test("a genuine tutor conflict on one selected day moves only that day to its next occurrence", () => {
  const realTutor = getTutorBySlug(dashboardTutor.slug) as TutorListing;
  const startDate = new Date(2026, 7, 26); // Wed Aug 26, 2026
  const FOUR_PM = 16 * 60;
  const FIVE_PM = 17 * 60;

  const dates = buildPrivateLessonSchedule({
    tutor: realTutor,
    startDate,
    frequency: "weekly",
    selectedDays: ["Wed", "Fri"],
    sessionsForFrequency: 2,
    startMinutes: FOUR_PM,
    endMinutes: FIVE_PM,
  });

  const sortedIso = iso([...dates].sort((a, b) => a.getTime() - b.getTime()));
  assert.equal(sortedIso[0], "2026-08-26"); // Wed — unaffected
  assert.notEqual(sortedIso[1], "2026-08-28"); // Fri Aug 28 is the real booked conflict
  assert.equal(sortedIso[1], "2026-09-04"); // next real Friday after the conflict

  const numbered = numberSchedule(dates, startDate);
  assert.deepEqual(numbered.map((s) => s.weekNumber).sort(), [1, 2]);
});
