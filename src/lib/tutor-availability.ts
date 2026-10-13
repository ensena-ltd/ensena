import { getAllDiscoverySessions } from "@/lib/discovery-sessions-store";
import { generateSessionDates, getGroupClassSubmissions } from "@/lib/group-class-submission-store";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { isSlotBlocked as isSlotBlockedGlobal } from "@/lib/tutor-availability-store";
import { getTutorBySlug, type TutorListing } from "@/lib/tutors";

// A tutor's group classes occupy their teaching time exactly like a private
// lesson or Discovery Session — matched by tutorName (GroupClassSubmission
// has no tutorSlug) against the tutor's real structured schedule fields, so
// this reflects genuine class occurrences (respecting excluded dates)
// instead of a naive weekday+range guess. Draft/pending/rejected/cancelled
// submissions never occupy real time — only classes that were actually
// approved to run do.
const LIVE_GROUP_CLASS_STATUSES = new Set(["Live", "Upcoming", "Completed"]);

function groupClassConflicts(tutorName: string, dateISO: string): { startMinutes: number; endMinutes: number }[] {
  const ranges: { startMinutes: number; endMinutes: number }[] = [];
  for (const s of getGroupClassSubmissions()) {
    if (s.tutorName !== tutorName || !LIVE_GROUP_CLASS_STATUSES.has(s.status)) continue;
    const dates = generateSessionDates({
      startDateISO: s.startDateISO,
      days: s.days,
      lengthWeeks: s.lengthWeeks,
      customEndDateISO: s.customEndDateISO,
      excludedDatesISO: s.excludedDatesISO,
    });
    if (!dates.includes(dateISO)) continue;
    const start = parseTimeToMinutes(s.startTime);
    if (start === null) continue;
    ranges.push({ startMinutes: start, endMinutes: start + s.durationMinutes });
  }
  return ranges;
}

export type SlotState = "available" | "booked" | "blocked" | "unavailable";

export const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Next calendar date (starting today) whose day-of-week matches
// `weekdayAbbr` — used to turn a recurring booking's abstract "Tue"/"Thu"
// day selection into a real date to check availability/conflicts against.
export function nextOccurrenceOfWeekday(weekdayAbbr: string, from: Date = new Date()): Date {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const targetIndex = WEEKDAY_ABBR.indexOf(weekdayAbbr);
  if (targetIndex === -1) return base;
  base.setDate(base.getDate() + ((targetIndex - base.getDay() + 7) % 7));
  return base;
}

export interface TimeSlot {
  hour: number;
  label: string;
  state: SlotState;
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDayBookable(tutor: TutorListing, date: Date): boolean {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? tutor.availability.includes("Weekends") : tutor.availability.includes("Weekdays");
}

export function hourRangeFor(tutor: TutorListing, date: Date): { start: number; end: number } {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return { start: 9, end: 14 };
  const hasEvenings = tutor.availability.includes("Evenings");
  return { start: 10, end: hasEvenings ? 20 : 18 };
}

export function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

// "10:00 AM" -> 600. Shared by the real conflict check below and by the
// booking flow when it turns a chosen "10:00 AM – 10:30 AM" range label
// into the start time a new PrivateLesson record is created at.
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (/PM/i.test(match[3])) hour += 12;
  return hour * 60 + Number(match[2]);
}

// 600 -> "10:00 AM" — the inverse of parseTimeToMinutes, matching the exact
// format PrivateLesson.time and the booking flow's slot labels both use.
export function formatMinutesToClockTime(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Matches the "May 22, 2024" style every seed PrivateLesson.date already
// uses, so a real, runtime-created lesson looks identical to the mock data
// everywhere it's displayed.
export function formatLessonDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function parseDurationMinutes(duration: string): number {
  return Number.parseInt(duration, 10) || 0;
}

/**
 * Real per-tutor conflict check against actual PrivateLesson records —
 * replaces the old hash-simulated version. `startMinutes`/`endMinutes` are
 * minutes-since-midnight, so this works for the 30/45/60-minute-wide slots
 * the booking flow actually offers, not just whole-hour boundaries.
 */
function isPrivateLessonBookedInRange(
  tutorSlug: string,
  dateISO: string,
  startMinutes: number,
  endMinutes: number,
  excludeLessonId?: string
): boolean {
  return getPrivateLessons().some((lesson) => {
    if (lesson.tutorSlug !== tutorSlug || lesson.status === "Cancelled") return false;
    if (lesson.id === excludeLessonId) return false;
    const lessonDate = new Date(lesson.date);
    if (Number.isNaN(lessonDate.getTime()) || toISODate(lessonDate) !== dateISO) return false;
    const lessonStart = parseTimeToMinutes(lesson.time);
    if (lessonStart === null) return false;
    const lessonEnd = lessonStart + parseDurationMinutes(lesson.duration);
    return lessonStart < endMinutes && startMinutes < lessonEnd;
  });
}

// The single real choke point for "is this tutor free at this exact
// interval" — checked against every kind of teaching commitment they can
// have (private lessons, Discovery Sessions, group classes), not just
// whichever kind happens to be booked most often. tutorSlug is resolved to
// the tutor's display name once, since Discovery/GroupClass records are
// keyed by name rather than slug. A slug that doesn't resolve to a known
// tutor still gets a real private-lesson check (the only kind that's ever
// keyed by slug) rather than silently skipping validation.
export function isTutorBookedInRange(
  tutorSlug: string,
  dateISO: string,
  startMinutes: number,
  endMinutes: number,
  excludeLessonId?: string
): boolean {
  if (isPrivateLessonBookedInRange(tutorSlug, dateISO, startMinutes, endMinutes, excludeLessonId)) return true;
  const tutorName = getTutorBySlug(tutorSlug)?.name;
  if (!tutorName) return false;
  const overlaps = (r: { startMinutes: number; endMinutes: number }) => r.startMinutes < endMinutes && startMinutes < r.endMinutes;
  if (discoveryConflictsForTutorName(tutorName, dateISO).some(overlaps)) return true;
  if (groupClassConflicts(tutorName, dateISO).some(overlaps)) return true;
  return false;
}

function discoveryConflictsForTutorName(tutorName: string, dateISO: string): { startMinutes: number; endMinutes: number }[] {
  const ranges: { startMinutes: number; endMinutes: number }[] = [];
  for (const session of getAllDiscoverySessions()) {
    if (session.tutor !== tutorName || session.status === "Cancelled") continue;
    const sessionDate = new Date(session.date);
    if (Number.isNaN(sessionDate.getTime()) || toISODate(sessionDate) !== dateISO) continue;
    const start = parseTimeToMinutes(session.time);
    if (start === null) continue;
    ranges.push({ startMinutes: start, endMinutes: start + session.durationMins });
  }
  return ranges;
}

function privateLessonConflictsForTutorName(
  tutorName: string,
  dateISO: string,
  excludeLessonId?: string
): { startMinutes: number; endMinutes: number }[] {
  const ranges: { startMinutes: number; endMinutes: number }[] = [];
  for (const lesson of getPrivateLessons()) {
    if (lesson.status === "Cancelled" || lesson.id === excludeLessonId) continue;
    if (getTutorBySlug(lesson.tutorSlug)?.name !== tutorName) continue;
    const lessonDate = new Date(lesson.date);
    if (Number.isNaN(lessonDate.getTime()) || toISODate(lessonDate) !== dateISO) continue;
    const start = parseTimeToMinutes(lesson.time);
    if (start === null) continue;
    ranges.push({ startMinutes: start, endMinutes: start + parseDurationMinutes(lesson.duration) });
  }
  return ranges;
}

// The real, name-keyed equivalent of isTutorBookedInRange — this is the
// choke point every booking-CREATION function (addPrivateLesson,
// addDiscoverySession, submitGroupClass) calls right before persisting a
// new record, so a conflict is rejected server-side-equivalently rather
// than only ever being caught by a UI slot picker a caller could bypass.
// Takes tutorName directly since two of the three record kinds are already
// keyed by name, and the third (private lessons) resolves its slug to a
// name once per call rather than the other way around.
export function findTutorConflict(
  tutorName: string,
  dateISO: string,
  startMinutes: number,
  endMinutes: number,
  options: { excludePrivateLessonId?: string } = {}
): boolean {
  const overlaps = (r: { startMinutes: number; endMinutes: number }) => r.startMinutes < endMinutes && startMinutes < r.endMinutes;
  if (privateLessonConflictsForTutorName(tutorName, dateISO, options.excludePrivateLessonId).some(overlaps)) return true;
  if (discoveryConflictsForTutorName(tutorName, dateISO).some(overlaps)) return true;
  if (groupClassConflicts(tutorName, dateISO).some(overlaps)) return true;
  return false;
}

function isSlotBooked(tutor: TutorListing, dateISO: string, hour: number): boolean {
  return isTutorBookedInRange(tutor.slug, dateISO, hour * 60, hour * 60 + 60);
}

function isSlotBlocked(tutor: TutorListing, dateISO: string, hour: number): boolean {
  // Blocked time is global (not per-tutor) in the current data model — see
  // tutor-availability-store.ts. A real conflict check against it is still
  // strictly better than never checking it at all.
  return isSlotBlockedGlobal(dateISO, hour);
}

// Finds the next real date (starting tomorrow, or from `options.from`) that
// is bookable for this tutor and free of both blocks and existing lessons at
// the given time range. Pass `weekdayAbbr` to constrain the search to a
// specific recurring day (e.g. every "Tue"); omit it for a one-off session on
// the earliest available day of the right type.
export function findNextBookableOccurrence(
  tutor: TutorListing,
  startMinutes: number,
  endMinutes: number,
  options: { weekdayAbbr?: string; from?: Date } = {}
): Date | null {
  const { weekdayAbbr, from = new Date() } = options;
  const cursorStart = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  for (let i = 0; i < 90; i++) {
    const date = new Date(cursorStart.getFullYear(), cursorStart.getMonth(), cursorStart.getDate() + i);
    if (weekdayAbbr && WEEKDAY_ABBR[date.getDay()] !== weekdayAbbr) continue;
    if (!isDayBookable(tutor, date)) continue;
    const dateISO = toISODate(date);
    const startHour = Math.floor(startMinutes / 60);
    if (isSlotBlockedGlobal(dateISO, startHour)) continue;
    if (isTutorBookedInRange(tutor.slug, dateISO, startMinutes, endMinutes)) continue;
    return date;
  }
  return null;
}

// Slots booked within THIS browser session (e.g. the student just booked one),
// so a second attempt at the same slot is caught without needing a server.
const sessionBookedSlots = new Set<string>();

function sessionKey(tutor: TutorListing, dateISO: string, hour: number): string {
  return `${tutor.slug}|${dateISO}|${hour}`;
}

export function reserveSlotForSession(tutor: TutorListing, dateISO: string, hour: number): void {
  sessionBookedSlots.add(sessionKey(tutor, dateISO, hour));
}

export function isSlotAvailable(tutor: TutorListing, date: Date, hour: number): boolean {
  if (!isDayBookable(tutor, date)) return false;
  const { start, end } = hourRangeFor(tutor, date);
  if (hour < start || hour >= end) return false;
  const dateISO = toISODate(date);
  if (sessionBookedSlots.has(sessionKey(tutor, dateISO, hour))) return false;
  if (isSlotBooked(tutor, dateISO, hour)) return false;
  if (isSlotBlocked(tutor, dateISO, hour)) return false;
  return true;
}

export function getDayState(tutor: TutorListing, date: Date, today: Date): SlotState | "today" {
  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (isPast) return "unavailable";
  if (!isDayBookable(tutor, date)) return "unavailable";
  const { start, end } = hourRangeFor(tutor, date);
  let hasAvailable = false;
  for (let hour = start; hour < end; hour++) {
    if (isSlotAvailable(tutor, date, hour)) {
      hasAvailable = true;
      break;
    }
  }
  return hasAvailable ? "available" : "blocked";
}

export function getTimesForDate(tutor: TutorListing, date: Date): TimeSlot[] {
  if (!isDayBookable(tutor, date)) return [];
  const { start, end } = hourRangeFor(tutor, date);
  const dateISO = toISODate(date);
  const slots: TimeSlot[] = [];
  for (let hour = start; hour < end; hour++) {
    let state: SlotState = "available";
    const key = sessionKey(tutor, dateISO, hour);
    if (sessionBookedSlots.has(key)) state = "booked";
    else if (isSlotBooked(tutor, dateISO, hour)) state = "booked";
    else if (isSlotBlocked(tutor, dateISO, hour)) state = "blocked";
    slots.push({ hour, label: formatHour(hour), state });
  }
  return slots;
}

export interface NextAvailableSlot {
  date: Date;
  dateISO: string;
  hour: number;
  label: string;
  dayLabel: string;
}

// Real, per-tutor bookings on `dateISO` from Private lessons, Discovery
// sessions, AND group classes — a tutor busy with any one of the three must
// be unavailable for the others at the same time. This is the canonical
// "what does this tutor's calendar actually look like on this date" answer;
// getAvailableSlots (below) is the only thing that reads it, and both the
// Private and Discovery student booking flows call getAvailableSlots, so
// neither can ever offer a slot the tutor's calendar disagrees with.
function tutorBookingConflicts(tutor: TutorListing, dateISO: string): { startMinutes: number; endMinutes: number }[] {
  const ranges: { startMinutes: number; endMinutes: number }[] = [];
  for (const lesson of getPrivateLessons()) {
    if (lesson.tutorSlug !== tutor.slug || lesson.status === "Cancelled") continue;
    const lessonDate = new Date(lesson.date);
    if (Number.isNaN(lessonDate.getTime()) || toISODate(lessonDate) !== dateISO) continue;
    const start = parseTimeToMinutes(lesson.time);
    if (start === null) continue;
    ranges.push({ startMinutes: start, endMinutes: start + parseDurationMinutes(lesson.duration) });
  }
  ranges.push(...discoveryConflictsForTutorName(tutor.name, dateISO));
  ranges.push(...groupClassConflicts(tutor.name, dateISO));
  return ranges;
}

export interface DurationSlot {
  label: string;
  startMinutes: number;
  endMinutes: number;
  state: "available" | "unavailable";
}

// The canonical getAvailableSlots(tutor, date, duration) engine — sequential,
// non-overlapping slots the exact width of `durationMinutes`, never
// extending past the tutor's real working hours for that day, checked
// against real existing bookings (both kinds, via tutorBookingConflicts)
// and real tutor-created blocks. Both Private and Discovery booking flows
// call this so neither can drift into a second, divergent notion of
// "available" — Discovery just always passes 25.
export function getAvailableSlots(tutor: TutorListing, date: Date, durationMinutes: number): DurationSlot[] {
  if (!isDayBookable(tutor, date)) return [];
  const { start, end } = hourRangeFor(tutor, date);
  const dateISO = toISODate(date);
  const conflicts = tutorBookingConflicts(tutor, dateISO);
  const startTotal = start * 60;
  const endTotal = end * 60;
  const slots: DurationSlot[] = [];
  for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
    const slotEnd = t + durationMinutes;
    const firstHour = Math.floor(t / 60);
    const lastHour = Math.floor((slotEnd - 1) / 60);
    let blocked = false;
    for (let hour = firstHour; hour <= lastHour; hour++) {
      if (isSlotBlockedGlobal(dateISO, hour)) {
        blocked = true;
        break;
      }
    }
    const hasConflict = !blocked && conflicts.some((c) => c.startMinutes < slotEnd && t < c.endMinutes);
    slots.push({
      label: `${formatMinutesToClockTime(t)} – ${formatMinutesToClockTime(slotEnd)}`,
      startMinutes: t,
      endMinutes: slotEnd,
      state: blocked || hasConflict ? "unavailable" : "available",
    });
  }
  return slots;
}

// Duration-aware replacement for getDayState, used to color calendar day
// cells for a specific requested lesson length rather than assuming a bare
// hour is enough — a date with only a 20-minute gap left must read as
// unavailable for a 25-minute Discovery Session even though getDayState
// (hour-granularity) might otherwise call the hour itself "available".
export function getDayAvailabilityState(
  tutor: TutorListing,
  date: Date,
  durationMinutes: number,
  today: Date
): "available" | "unavailable" {
  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (isPast) return "unavailable";
  if (!isDayBookable(tutor, date)) return "unavailable";
  return getAvailableSlots(tutor, date, durationMinutes).some((s) => s.state === "available")
    ? "available"
    : "unavailable";
}

// First real date (today included) with at least one available slot of the
// requested duration — used only to decide which month a Start Date
// calendar should open on by default, never to auto-select a date for the
// student.
export function getNextAvailableDate(tutor: TutorListing, durationMinutes: number, from: Date = new Date()): Date | null {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 90; i++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
    if (getDayAvailabilityState(tutor, date, durationMinutes, from) === "available") return date;
  }
  return null;
}

export function getNextAvailableSlots(tutor: TutorListing, count = 4, from: Date = new Date()): NextAvailableSlot[] {
  const slots: NextAvailableSlot[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let dayOffset = 0; dayOffset < 21 && slots.length < count; dayOffset++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dayOffset);
    if (!isDayBookable(tutor, date)) continue;
    const { start, end } = hourRangeFor(tutor, date);
    for (let hour = start; hour < end && slots.length < count; hour++) {
      if (!isSlotAvailable(tutor, date, hour)) continue;
      const dayLabel = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "long" });
      slots.push({ date, dateISO: toISODate(date), hour, label: formatHour(hour), dayLabel });
    }
  }
  return slots;
}
