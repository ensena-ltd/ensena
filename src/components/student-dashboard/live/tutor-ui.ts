// Display helpers shared by the real Find a Tutor, tutor profile, booking,
// review and confirmation pages.
import { getPlatformTodayParts } from "@/lib/platform-time";
import type { TutorDirectoryEntry } from "@/lib/tutor-directory-server";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Mathematics Tutor" — the tutor's first subject. */
export function tutorTitle(t: Pick<TutorDirectoryEntry, "subjects">): string {
  return t.subjects[0] ? `${t.subjects[0]} Tutor` : "Tutor";
}

/** Teaching levels without the "Exams" category (exams are listed by name instead). */
export function teachingLevels(t: Pick<TutorDirectoryEntry, "levels">): string[] {
  return t.levels.filter((l) => l.toLowerCase() !== "exams");
}

/** Subject + level + exam chips, de-duplicated, in that order. */
export function expertiseTags(t: Pick<TutorDirectoryEntry, "subjects" | "levels" | "exams">, limit?: number): string[] {
  const tags = [...new Set([...t.subjects.slice(0, 1), ...teachingLevels(t), ...t.exams])];
  return limit ? tags.slice(0, limit) : tags;
}

/** Platform (Lagos) weekday of `nowMs`, 0 = Sunday. */
export function platformWeekday(nowMs: number): number {
  const { year, month, day } = getPlatformTodayParts(nowMs);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** "Available today" / "Available tomorrow" / "Available Monday", from the tutor's teaching days. */
export function availabilityLabel(t: Pick<TutorDirectoryEntry, "teachingDays" | "onVacation">, nowMs: number): { label: string; today: boolean } {
  if (t.onVacation) return { label: "On a break", today: false };
  if (t.teachingDays.length === 0) return { label: "No hours set yet", today: false };
  const today = platformWeekday(nowMs);
  for (let i = 0; i < 7; i++) {
    const dow = (today + i) % 7;
    if (!t.teachingDays.includes(dow)) continue;
    if (i === 0) return { label: "Available today", today: true };
    if (i === 1) return { label: "Available tomorrow", today: false };
    return { label: `Available ${WEEKDAY_LONG[dow]}`, today: false };
  }
  return { label: "No hours set yet", today: false };
}

/** "January 2021". */
export function monthYear(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
}

/** "6+ years experience" style label from the sign-up answer ("3 – 5 years", "10+ years"). */
export function experienceLabel(years: string): string {
  return years ? `${years} experience` : "Experience not listed";
}

/** "Usually responds within 1 hour" from the tutor's response-time goal. */
export function responseLabel(goal: string): string {
  return goal ? `Usually responds ${goal.charAt(0).toLowerCase()}${goal.slice(1)}` : "Usually responds in a few hours";
}

/** "Tuesday & Thursday" / "Tuesday, Thursday & Friday". */
export function joinDays(days: number[]): string {
  const names = days.map((d) => WEEKDAY_LONG[d]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** "10:00 AM" from "10:00". */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "10:00 AM – 10:30 AM" for a start "HH:MM" and a duration. */
export function timeRange(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const end = h * 60 + m + minutes;
  const endHHMM = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  return `${to12h(hhmm)} – ${to12h(endHHMM)}`;
}

/** Epoch ms of a Lagos wall time (Africa/Lagos is UTC+1 all year). */
export function lagosToMs(iso: string, hhmm: string): number {
  return Date.parse(`${iso}T${hhmm}:00+01:00`);
}
