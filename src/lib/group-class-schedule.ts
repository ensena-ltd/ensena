// Real, computed Group Class session instances for a cohort — one session
// per matching weekday between the cohort's start date and its
// (start + durationWeeks) end, generalized from the same "recurring days
// repeated across a date range" model the tutor dashboard's own
// buildGroupClassSessions (tutor-dashboard-data.ts) already uses for its
// own, differently-shaped MyGroupClass/MyGroupClassCohort types — this is
// the student-side equivalent, built from the real Cohort shape
// (group-classes-data.ts) so a real enrollment gets a real, non-empty
// schedule instead of the hardcoded `sessions: []` it had before.
import { computeWeekNumber } from "@/lib/schedule-week";

export interface GroupSessionInstance {
  dateISO: string;
  sessionNumber: number;
  weekNumber: number;
  status: "Completed" | "Live" | "Upcoming";
}

const DAY_ABBR_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function parseDaysList(days: string): number[] {
  return days
    .split(",")
    .map((d) => DAY_ABBR_TO_INDEX[d.trim()])
    .filter((d): d is number => d !== undefined);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// `startDateISO` is a plain "yyyy-mm-dd" — parsed via manual Y/M/D split
// into a LOCAL date, never `new Date(isoString)` directly, which would
// parse as UTC midnight and can roll back a day in a negative-UTC-offset
// timezone (the same bug class already fixed once in this app's
// getCounsellingTimeRange).
export function buildGroupSessionSchedule(
  days: string,
  startDateISO: string,
  durationWeeks: number,
  todayISO: string
): GroupSessionInstance[] {
  const dayIndexes = parseDaysList(days);
  if (dayIndexes.length === 0 || durationWeeks <= 0) return [];

  const [y, m, d] = startDateISO.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + durationWeeks * 7 - 1);

  const sessions: GroupSessionInstance[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (dayIndexes.includes(cursor.getDay())) {
      const dateISO = toISODate(cursor);
      const status: GroupSessionInstance["status"] = dateISO < todayISO ? "Completed" : dateISO === todayISO ? "Live" : "Upcoming";
      sessions.push({
        dateISO,
        sessionNumber: sessions.length + 1,
        weekNumber: computeWeekNumber(startDateISO, dateISO),
        status,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

// Review only unlocks once every session in the real, computed schedule has
// happened — never after just the first one. Takes just the status field
// (not the full GroupSessionInstance shape) so it works directly against
// StudentGroupClassSession too, without needing a field-by-field adapter.
export function isGroupBookingComplete(sessions: { status: GroupSessionInstance["status"] }[]): boolean {
  return sessions.length > 0 && sessions.every((s) => s.status === "Completed");
}
