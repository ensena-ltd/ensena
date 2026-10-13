// Pure slot engine for booking (and rescheduling) a real tutor's private
// lessons. Everything is in the platform timezone (Africa/Lagos) — a tutor's
// "Mondays 10:00–18:00" means Lagos wall-clock time, whoever is looking.
// No I/O here: the server gathers the tutor's weekly hours and every busy
// interval, this decides which start times are actually bookable. The
// server re-runs the same check right before writing, so a slot that was
// taken a second ago can never be double-booked.
import { platformWallTimeToMs } from "@/lib/platform-time";

export interface WeeklyRange {
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** "HH:MM", 24-hour. */
  start: string;
  end: string;
}

export interface BusyInterval {
  startMs: number;
  endMs: number;
}

export interface Slot {
  startMs: number;
  endMs: number;
}

export const SLOT_STEP_MINUTES = 30;
/** Students can't book (or move a lesson to) a start time sooner than this. */
export const MIN_NOTICE_MINUTES = 120;
/** How far ahead a single session can be booked. */
export const MAX_ADVANCE_DAYS = 90;
/** A booking a student never paid for stops holding its slot after this. */
export const UNPAID_HOLD_MINUTES = 30;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes <= 24 * 60 ? minutes : null;
}

export function parseISODate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Day of week (0 = Sunday) of a calendar date. */
export function dayOfWeekISO(iso: string): number {
  const p = parseISODate(iso);
  return p ? new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() : -1;
}

export function addDaysToISO(iso: string, days: number): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days)).toISOString().slice(0, 10);
}

export function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/**
 * Every bookable start time on `dateISO` for a lesson of `durationMinutes`:
 * inside one of the tutor's weekly ranges for that weekday, on a
 * SLOT_STEP_MINUTES grid, not overlapping any busy interval, and at least
 * MIN_NOTICE_MINUTES from now.
 */
export function availableSlots({
  dateISO,
  durationMinutes,
  weekly,
  busy,
  nowMs,
  minNoticeMinutes = MIN_NOTICE_MINUTES,
  stepMinutes = SLOT_STEP_MINUTES,
}: {
  dateISO: string;
  durationMinutes: number;
  weekly: WeeklyRange[];
  busy: BusyInterval[];
  nowMs: number;
  minNoticeMinutes?: number;
  stepMinutes?: number;
}): Slot[] {
  const date = parseISODate(dateISO);
  if (!date || durationMinutes <= 0) return [];
  const dow = dayOfWeekISO(dateISO);
  const earliest = nowMs + minNoticeMinutes * 60_000;
  const seen = new Set<number>();
  const slots: Slot[] = [];

  for (const range of weekly.filter((r) => r.dayOfWeek === dow)) {
    const from = toMinutes(range.start);
    const to = toMinutes(range.end);
    if (from === null || to === null || to <= from) continue;
    const firstStart = Math.ceil(from / stepMinutes) * stepMinutes;
    for (let m = firstStart; m + durationMinutes <= to; m += stepMinutes) {
      const startMs = platformWallTimeToMs(date.year, date.month, date.day, Math.floor(m / 60), m % 60);
      const slot = { startMs, endMs: startMs + durationMinutes * 60_000 };
      if (startMs < earliest || seen.has(startMs)) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      seen.add(startMs);
      slots.push(slot);
    }
  }
  return slots.sort((a, b) => a.startMs - b.startMs);
}

/** Whether a specific start time is one of the bookable slots. */
export function isSlotAvailable(args: Parameters<typeof availableSlots>[0] & { startMs: number }): boolean {
  return availableSlots(args).some((s) => s.startMs === args.startMs);
}

/** Days of the week (0–6) on which the tutor teaches at all. */
export function teachingDays(weekly: WeeklyRange[]): number[] {
  return [...new Set(weekly.map((r) => r.dayOfWeek))].sort((a, b) => a - b);
}

// ── Pricing ────────────────────────────────────────────────────────────

export type BookingFrequency = "oneTime" | "weekly" | "monthly";
/** A monthly plan is 4 weeks of the chosen days, 10% off — same as the existing booking flow. */
export const MONTH_WEEKS = 4;
export const MONTHLY_SAVE_PCT = 10;
export const MAX_WEEKS = 12;

/** Price of one session: the tutor's hourly rate pro-rated to the duration. */
export function sessionPrice(hourlyRate: number, durationMinutes: number): number {
  return Math.round((hourlyRate / 2) * (durationMinutes / 30));
}

/**
 * Per-session prices for a booking of `sessionCount` sessions. Monthly plans
 * get the discount, rounded to the nearest ₦100 like the existing flow, and
 * spread across sessions so they add up to the total exactly.
 */
export function bookingPrices(hourlyRate: number, durationMinutes: number, frequency: BookingFrequency, sessionCount: number): { perSession: number[]; total: number } {
  const standard = sessionPrice(hourlyRate, durationMinutes);
  if (frequency !== "monthly" || sessionCount === 0) {
    return { perSession: Array(sessionCount).fill(standard), total: standard * sessionCount };
  }
  const total = Math.round((standard * sessionCount * (1 - MONTHLY_SAVE_PCT / 100)) / 100) * 100;
  const base = Math.floor(total / sessionCount);
  const perSession = Array.from({ length: sessionCount }, (_, i) => (i === 0 ? total - base * (sessionCount - 1) : base));
  return { perSession, total };
}
