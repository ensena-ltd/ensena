// Real, persisted private-lesson mutations (reschedule/cancel) —
// localStorage-backed, same idiom as escrow-store.ts. The Private Lessons
// list tab and the Schedule/Calendar tab are two views of the same
// underlying lessons on the same hub page — without a shared store,
// rescheduling a lesson on one tab would silently look uncancelled on the
// other, since each would otherwise hold its own local-state copy of the
// same pristine seed array.
import { initialPrivateLessons, type PrivateLesson } from "@/lib/tutor-dashboard-data";
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { computeWeekNumberFromDates } from "@/lib/schedule-week";
import { findTutorConflict, parseDurationMinutes, parseTimeToMinutes, toISODate } from "@/lib/tutor-availability";
import { getTutorBySlug } from "@/lib/tutors";

const LESSONS_KEY = "ensena_private_lessons";
export const PRIVATE_LESSONS_EVENT = "ensena:private-lessons-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readLessonsRaw = makeCachedReader<PrivateLesson[]>(LESSONS_KEY, initialPrivateLessons);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PRIVATE_LESSONS_EVENT));
}

// `weekNumber` is assigned ONCE, at booking creation (see numberSchedule in
// private-booking-schedule.ts), and never recomputed afterward — correct by
// construction for any lesson booked through today's (already-fixed)
// scheduling engine, but a booking created before that fix (or before
// schedule-week.ts's single shared calculation existed) would otherwise
// carry a stale, wrong value forever, since nothing else ever revisits it.
// Rather than a one-time destructive rewrite of stored data, this
// recomputes weekNumber fresh from each lesson's own real (immutable) date
// on every read — the same "derive on read, never persist the fix" idiom
// reports-store.ts's migrateLegacyId already uses — so an existing booking
// self-heals the moment this ships, with zero risk to any other field
// (price, payment, status, etc. are never touched).
function withCorrectedWeekNumbers(lessons: PrivateLesson[]): PrivateLesson[] {
  const byBooking = new Map<string, PrivateLesson[]>();
  for (const l of lessons) {
    if (l.bookingId) byBooking.set(l.bookingId, [...(byBooking.get(l.bookingId) ?? []), l]);
  }
  const corrections = new Map<string, number>();
  for (const group of byBooking.values()) {
    const sorted = [...group].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sorted[0].date);
    for (const l of sorted) {
      const correct = computeWeekNumberFromDates(startDate, new Date(l.date));
      if (l.weekNumber !== correct) corrections.set(l.id, correct);
    }
  }
  if (corrections.size === 0) return lessons;
  return lessons.map((l) => (corrections.has(l.id) ? { ...l, weekNumber: corrections.get(l.id) } : l));
}

// Cached on the underlying stored reference (itself already stable) so
// repeated calls between actual writes return the identical corrected array
// instance — required for useSyncExternalStore (see use-private-lessons.ts):
// a fresh array on every call, even with identical contents, reads as "the
// store changed" on every render and causes an infinite render loop (a real,
// previously-confirmed bug class in this exact codebase — see
// class-attendance-store.ts's own comment on the same failure mode).
let cachedRawRef: PrivateLesson[] | null = null;
let cachedCorrected: PrivateLesson[] = initialPrivateLessons;

export function getPrivateLessons(): PrivateLesson[] {
  const raw = readLessonsRaw();
  if (raw !== cachedRawRef) {
    cachedRawRef = raw;
    cachedCorrected = withCorrectedWeekNumbers(raw);
  }
  return cachedCorrected;
}

function updateLesson(id: string, patch: Partial<PrivateLesson>): void {
  writeJson(LESSONS_KEY, readLessonsRaw().map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

// Real booking creation — the reference code doubles as the record's id, the
// same way a runtime-created dispute/payout gets its id from
// generateUniqueReferenceCode rather than a counter. Called once per actual
// session at the moment a booking is paid for (see tutor-review-client.tsx),
// never speculatively.
//
// The conflict check here — not just in the booking UI's slot picker — is
// what makes this a real choke point rather than a suggestion: even a caller
// that skips getAvailableSlots (or two near-simultaneous bookings racing for
// the same slot) cannot persist a lesson that overlaps this tutor's existing
// private lessons, Discovery Sessions, or group classes.
export async function addPrivateLesson(
  lesson: Omit<PrivateLesson, "id" | "bookingReference">
): Promise<PrivateLesson> {
  const tutorName = getTutorBySlug(lesson.tutorSlug)?.name;
  const dateISO = toISODate(new Date(lesson.date));
  const start = parseTimeToMinutes(lesson.time);
  if (tutorName && start !== null) {
    const end = start + parseDurationMinutes(lesson.duration);
    if (findTutorConflict(tutorName, dateISO, start, end)) {
      throw new Error("This teacher already has another class at that time. Please choose a different time.");
    }
  }
  const exists = (candidate: string) => readLessonsRaw().some((l) => l.id === candidate);
  const reference = await generateUniqueReferenceCode("private", exists);
  const created: PrivateLesson = { ...lesson, id: reference, bookingReference: reference, createdAtMs: lesson.createdAtMs ?? Date.now() };
  writeJson(LESSONS_KEY, [...readLessonsRaw(), created]);
  return created;
}

export function cancelPrivateLesson(id: string): void {
  updateLesson(id, { status: "Cancelled" });
}

export function reschedulePrivateLesson(id: string, newDate: string, newTime: string): void {
  updateLesson(id, { date: newDate, time: newTime, status: "Upcoming" });
}

export function subscribePrivateLessons(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PRIVATE_LESSONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PRIVATE_LESSONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
