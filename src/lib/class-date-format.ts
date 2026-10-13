// Single source of truth for how a scheduled class/lesson/session date and
// time is displayed across the student (and reschedule) experience. Every
// consumer should go through these rather than rolling its own
// toLocaleDateString/toLocaleTimeString options — that's exactly how the
// app ended up with "September 8, 2026" in one place and "Sep 8, 2026" in
// another, and with a bare "Monday, 6:00 PM" that never shows which Monday.
//
// Format: weekday (short) + month (short) + day + year, e.g. "Mon, Sep 14,
// 2026" — never a bare weekday alone, never a full month name.

export function formatClassDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function formatClassTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatClassDateTime(date: Date): string {
  return `${formatClassDate(date)} · ${formatClassTime(date)}`;
}

// For a raw <input type="date"> / <input type="time"> pair (ISO "2026-09-15"
// + 24-hour "18:30"), exactly what every reschedule modal in this app
// collects — formatting here once means no caller ever forwards an
// unformatted ISO string into a notification or email again.
function isoToDate(isoDate: string, time24h = "00:00"): Date {
  const [h, m] = time24h.split(":").map(Number);
  const d = new Date(`${isoDate}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function formatIsoDate(isoDate: string): string {
  return formatClassDate(isoToDate(isoDate));
}

export function formatIsoTime(time24h: string): string {
  return formatClassTime(isoToDate("1970-01-01", time24h));
}

export function formatIsoDateTime(isoDate: string, time24h: string): string {
  return formatClassDateTime(isoToDate(isoDate, time24h));
}
