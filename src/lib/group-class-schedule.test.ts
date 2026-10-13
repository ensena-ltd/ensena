// Regression coverage for the Group Class session/week-numbering engine —
// previously untested; audited alongside private-booking-schedule.test.ts as
// part of the app-wide "Week 0" investigation (see schedule-week.ts, the
// single calendar-week calculation this now shares with the private-lesson
// engine).
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildGroupSessionSchedule } from "@/lib/group-class-schedule";

test("Tue/Thu cohort starting on a Tuesday: first week's sessions are both Week 1", () => {
  const sessions = buildGroupSessionSchedule("Tue,Thu", "2026-09-08", 4, "2026-09-01");
  assert.deepEqual(
    sessions.filter((s) => s.weekNumber === 1).map((s) => s.dateISO),
    ["2026-09-08", "2026-09-10"]
  );
});

test("a 4-week cohort produces exactly 4 distinct week numbers, 1 through 4, never 0", () => {
  const sessions = buildGroupSessionSchedule("Mon,Wed,Fri", "2026-09-07", 4, "2026-09-01");
  const weeks = [...new Set(sessions.map((s) => s.weekNumber))].sort((a, b) => a - b);
  assert.deepEqual(weeks, [1, 2, 3, 4]);
  assert.ok(sessions.every((s) => s.weekNumber >= 1));
});

test("cohort starting mid-week still groups its first partial week as Week 1", () => {
  // Start on a Thursday, days = Tue/Thu — the Thursday itself plus the
  // following Tuesday must both land in Week 1 (within 7 days of start).
  const sessions = buildGroupSessionSchedule("Tue,Thu", "2026-09-10", 3, "2026-09-01");
  const week1 = sessions.filter((s) => s.weekNumber === 1).map((s) => s.dateISO);
  assert.deepEqual(week1, ["2026-09-10", "2026-09-15"]);
});

test("a cohort spanning a month boundary keeps correct week numbers", () => {
  const sessions = buildGroupSessionSchedule("Wed", "2026-09-30", 3, "2026-09-01");
  assert.deepEqual(
    sessions.map((s) => ({ dateISO: s.dateISO, weekNumber: s.weekNumber })),
    [
      { dateISO: "2026-09-30", weekNumber: 1 },
      { dateISO: "2026-10-07", weekNumber: 2 },
      { dateISO: "2026-10-14", weekNumber: 3 },
    ]
  );
});

test("no session in any generated schedule is ever numbered Week 0", () => {
  const scenarios: [string, string, number][] = [
    ["Mon,Tue,Wed,Thu,Fri", "2026-09-08", 8],
    ["Sat,Sun", "2026-09-12", 6],
    ["Tue", "2026-12-29", 5], // year boundary
  ];
  for (const [days, start, weeks] of scenarios) {
    const sessions = buildGroupSessionSchedule(days, start, weeks, "2026-09-01");
    assert.ok(sessions.every((s) => s.weekNumber >= 1), `${days} starting ${start} produced a week < 1`);
  }
});
