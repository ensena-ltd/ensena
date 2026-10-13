// One shared date-generation engine for a multi-session Private booking
// (weekly/monthly), used by both the Review page (to preview the full
// schedule before payment) and the actual lesson-creation step — so a
// preview can never disagree with what actually gets booked. Also the
// shared helpers for reading a created booking's sibling lessons and
// deciding whether the whole programme is done.
import type { FrequencyKey } from "@/components/find-teachers/tutor-booking-sidebar";
import { parseDurationLabelMinutes, parseLegacyDateTime } from "@/lib/class-entry-access";
import { computeWeekNumberFromDates } from "@/lib/schedule-week";
import { findNextBookableOccurrence, WEEKDAY_ABBR } from "@/lib/tutor-availability";
import type { PrivateLesson, PrivateLessonStatus } from "@/lib/tutor-dashboard-data";
import type { TutorListing } from "@/lib/tutors";

// Mirrors exactly the day-by-day search the booking-confirm step already
// used inline: the student's explicitly picked Start Date anchors the
// first occurrence of its own weekday; every other occurrence (later
// repeats of that day, and every occurrence of any other selected day) is
// found via findNextBookableOccurrence, which skips genuinely unavailable
// dates rather than assuming a fixed 7-day cadence.
export function buildPrivateLessonSchedule({
  tutor,
  startDate,
  frequency,
  selectedDays,
  sessionsForFrequency,
  startMinutes,
  endMinutes,
}: {
  tutor: TutorListing;
  startDate: Date;
  frequency: FrequencyKey;
  selectedDays: string[];
  sessionsForFrequency: number;
  startMinutes: number;
  endMinutes: number;
}): Date[] {
  if (frequency === "oneTime" || selectedDays.length === 0) {
    return [startDate];
  }

  const startDateWeekday = WEEKDAY_ABBR[startDate.getDay()];
  const repeatsPerDay = Math.max(1, Math.round(sessionsForFrequency / selectedDays.length));
  const dates: Date[] = [];

  for (const day of selectedDays) {
    let cursorFrom: Date | undefined;
    for (let i = 0; i < repeatsPerDay; i++) {
      let date: Date | null;
      if (i === 0 && day === startDateWeekday) {
        date = startDate;
      } else {
        // The very first occurrence of a day other than the chosen start
        // weekday must search forward from `startDate`, never from
        // `findNextBookableOccurrence`'s own default of "today" — this is
        // exactly the bug that produced "Week 0": with an undefined anchor,
        // a day like Tuesday could resolve to a date *before* the student's
        // chosen Thursday start date (whenever today's real date preceded
        // it), so numberSchedule's week calculation (see schedule-week.ts)
        // went negative and floored to week 0. Anchoring every day's search at
        // `startDate` guarantees no session is ever generated before the
        // booking's own start date, which is what actually fixes the week
        // numbering rather than papering over the symptom.
        date = findNextBookableOccurrence(tutor, startMinutes, endMinutes, { weekdayAbbr: day, from: cursorFrom ?? startDate });
      }
      if (!date) break;
      cursorFrom = date;
      dates.push(date);
    }
  }

  return dates;
}

export interface ScheduledOccurrence {
  date: Date;
  sessionNumber: number;
  totalSessions: number;
  weekNumber: number;
}

// Sorted chronologically and numbered 1..N — the single ordering used
// everywhere a "Session 3 of 12" / "Week 2" label is shown, so the
// schedule preview, the created PrivateLesson records, and the grouped
// View Class page all agree. weekNumber comes from computeWeekNumberFromDates
// (see schedule-week.ts) — the one shared calendar-week calculation every
// scheduling engine in the app now uses — so it stays correct even when the
// tutor's availability isn't perfectly weekly-periodic.
export function numberSchedule(dates: Date[], startDate: Date): ScheduledOccurrence[] {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  return sorted.map((date, i) => ({
    date,
    sessionNumber: i + 1,
    totalSessions: sorted.length,
    weekNumber: computeWeekNumberFromDates(startDate, date),
  }));
}

export function getBookingSiblings(lessons: PrivateLesson[], bookingId: string): PrivateLesson[] {
  return lessons.filter((l) => l.bookingId === bookingId);
}

// True once every non-cancelled session in the programme is done (a
// cancelled session never permanently blocks the booking from finishing —
// an explicit product decision, not an oversight). "Done" is `status ===
// "Completed"` OR `effectivelyEnded` — a real, runtime-created PrivateLesson
// never gets its `status` flipped to "Completed" automatically just because
// its scheduled time passed (see class-detail-client.tsx's own long-standing
// comment on this), so the caller must also pass whether each session's real
// scheduled end time (via getClassEntryState) has actually passed.
export function isPrivateBookingComplete(sessions: { status: PrivateLessonStatus; effectivelyEnded: boolean }[]): boolean {
  const relevant = sessions.filter((s) => s.status !== "Cancelled");
  return relevant.length > 0 && relevant.every((s) => s.status === "Completed" || s.effectivelyEnded);
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function joinWithAmpersand(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

export function frequencyLabel(frequency: FrequencyKey | undefined): "One-time" | "Weekly" | "Monthly" | null {
  if (frequency === "oneTime") return "One-time";
  if (frequency === "weekly") return "Weekly";
  if (frequency === "monthly") return "Monthly";
  return null; // legacy lesson created before `frequency` was persisted — unknown, not guessed
}

export interface ScheduleSummary {
  /** e.g. "September 14, 2026" — the earliest session's date, real to the booking, never today's date. */
  startDateLabel: string;
  /** e.g. "Monday, Wednesday & Friday" — every distinct weekday actually used across the booking's real sessions. */
  daysLabel: string;
  /** Distinct weekdays used per week — same number `computeTutorBookingPricing` used to price the booking. */
  sessionsPerWeek: number;
  /** e.g. "10:00 AM – 11:00 AM" — real start time plus the real booked duration, never assumed to be 60 minutes. */
  timeLabel: string;
  /** e.g. "60 minutes". */
  durationLabel: string;
  /** null only for a lesson created before `frequency` existed on the record — never guessed. */
  frequencyLabel: "One-time" | "Weekly" | "Monthly" | null;
}

// One real summary of a booking's actual schedule, built from its real
// session records — not a second, hand-entered copy of what was picked at
// booking time. Works identically for a single one-time lesson (an array of
// one) and a multi-session weekly/monthly programme (every sibling sharing
// a bookingId), so both the Student and Tutor View Class pages can call
// this one function and always agree.
export function summarizeSchedule(
  lessons: { date: string; time: string; duration: string; frequency?: FrequencyKey }[]
): ScheduleSummary {
  const sorted = [...lessons].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];

  const startDateLabel = new Date(first.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const dayIndices = new Set(sorted.map((l) => new Date(l.date).getDay()));
  const daysLabel = joinWithAmpersand(WEEKDAY_NAMES.filter((_, i) => dayIndices.has(i)));
  const sessionsPerWeek = dayIndices.size;

  const startMs = parseLegacyDateTime(first.date, first.time);
  const durationMinutes = parseDurationLabelMinutes(first.duration);
  const endMs = startMs + durationMinutes * 60_000;
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const timeLabel = `${fmt(startMs)} – ${fmt(endMs)}`;
  const durationLabel = `${durationMinutes} minutes`;

  return { startDateLabel, daysLabel, sessionsPerWeek, timeLabel, durationLabel, frequencyLabel: frequencyLabel(first.frequency) };
}
