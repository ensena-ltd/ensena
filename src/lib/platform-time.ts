// The ONE shared clock/timezone source of truth for the whole platform.
// Every class/booking/session scheduling calculation must go through this
// — never a bare `new Date(year, month, day, hour, minute)` (silently
// interpreted in whatever timezone the machine executing the code happens
// to be in — the browser's, or a server's own OS timezone), and never the
// local machine's own idea of "today".
//
// Enseña's platform timezone is fixed to Africa/Lagos (West Africa Time,
// UTC+01:00) for every student, every tutor, everywhere — regardless of
// where a browser or server physically is. This uses the real IANA
// timezone identifier via the native Intl API (never a hardcoded "+1"
// offset), per explicit product requirement, even though Africa/Lagos
// happens to never observe daylight saving (so the offset is constant in
// practice — that's a property of this specific zone, not something this
// code assumes or hardcodes).
export const PLATFORM_TIMEZONE = "Africa/Lagos";

// Real current instant. Epoch ms is timezone-independent by definition —
// "now" is the same instant everywhere on Earth; what's timezone-dependent
// is how that instant gets interpreted as a wall-clock date/time, which
// every function below handles relative to Africa/Lagos specifically.
export function getPlatformNowMs(): number {
  return Date.now();
}

// How far `timeZone`'s wall clock is ahead of UTC at a given real instant,
// in ms. Computed by asking Intl what wall-clock time `atMs` shows in that
// zone, then comparing that (reinterpreted as if it were UTC) against the
// real UTC instant — the standard technique for reading an IANA zone's
// offset without a timezone library.
function getTimeZoneOffsetMs(timeZone: string, atMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(atMs);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour") % 24; // some engines report midnight as "24"
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUtc - atMs;
}

// Converts Africa/Lagos WALL-CLOCK components (the numbers a Lagos wall
// clock/calendar would show — 1-based month, hour 0-23) into the real
// epoch ms they represent. This is the direct fix for the platform's root
// scheduling bug: `new Date(year, month, day, hour, minute)` builds that
// same wall-clock time in whatever timezone the CODE happens to be running
// in, not Africa/Lagos — two different real instants whenever those don't
// match. Africa/Lagos never observes daylight saving, so a single-pass
// offset lookup (no DST-transition edge case to iterate around) is exact.
export function platformWallTimeToMs(year: number, month: number, day: number, hour: number, minute: number): number {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMs = getTimeZoneOffsetMs(PLATFORM_TIMEZONE, guessUtc);
  return guessUtc - offsetMs;
}

export interface PlatformDateParts {
  year: number;
  month: number; // 1-based
  day: number;
}

// The calendar date it currently is in Africa/Lagos, right now — never the
// local machine's own "today". A server running in UTC (or a browser in
// another timezone) can genuinely disagree with Lagos about what today's
// date is near midnight; every "is this scheduled for today" check must
// anchor to this, not `new Date()`.
export function getPlatformTodayParts(nowMs: number = getPlatformNowMs()): PlatformDateParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(nowMs);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Parses this app's existing legacy date/time string shapes — "Today" /
// "Tomorrow" / a real date string like "Aug 28, 2026" — plus a
// "4:00 PM"-style time, into a real epoch ms. This is the Africa/Lagos-
// aware replacement for the parsing class-entry-access.ts's
// parseLegacyDateTime and class-list-helpers.ts's parseDateTimeMs used to
// do purely in the local machine's timezone. "Today"/"Tomorrow" resolve
// against Lagos's own current date, not the local machine's.
export function parsePlatformDateTime(dateStr: string, timeStr: string, nowMs: number = getPlatformNowMs()): number {
  let year: number;
  let month: number;
  let day: number;

  if (dateStr === "Today") {
    ({ year, month, day } = getPlatformTodayParts(nowMs));
  } else if (dateStr === "Tomorrow") {
    ({ year, month, day } = getPlatformTodayParts(nowMs + 86_400_000));
  } else {
    // A plain "Aug 28, 2026"-style date-only string has no time-of-day
    // ambiguity, so reading its Y/M/D back via the local Date object's own
    // getters is safe regardless of the local machine's timezone — there is
    // no other instant a bare calendar date could mean.
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      ({ year, month, day } = getPlatformTodayParts(nowMs));
    } else {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  let hour = 0;
  let minute = 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    hour = parseInt(match[1], 10);
    minute = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  }

  return platformWallTimeToMs(year, month, day, hour, minute);
}

// Consistent human-readable date display — "September 8, 2026" — always
// read in Africa/Lagos, never the viewer's own local timezone (which could
// roll a date near midnight the way a plain `toLocaleDateString()` call on
// a Date object would, if the object's own instant is close to a Lagos day
// boundary but the viewer's browser is in a different zone).
export function formatPlatformDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, month: "long", day: "numeric", year: "numeric" }).format(ms);
}

export function formatPlatformTime(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, hour: "numeric", minute: "2-digit" }).format(ms);
}
