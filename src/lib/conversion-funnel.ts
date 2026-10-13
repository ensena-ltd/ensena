// The top-of-funnel conversion view: Views -> Signups -> Bookings ->
// Payments, each stage a real count from its own real store for the same
// period — never a guessed/hardcoded ratio. This is an AGGREGATE funnel
// (how many at each stage in this period), not yet a per-visitor
// attribution chain (which visitor's view led to which signup led to which
// booking) — every event already carries a real visitorId/timestamp, so
// that finer chain is a straightforward future extension of this same data,
// not a rebuild.
import { getAllPageViews } from "@/lib/page-analytics-store";
import { getAllSignupEvents } from "@/lib/signup-events-store";
import { getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { getPaymentPlans } from "@/lib/payment-plans-store";
import { getPrivateLessons } from "@/lib/private-lessons-store";

export interface ConversionFunnel {
  views: number;
  signups: number;
  bookings: number;
  payments: number;
}

// A multi-session Private booking creates several PrivateLesson rows
// sharing one bookingId — counted once per real booking, not once per
// session, so "Bookings" answers "how many booking decisions were made",
// not "how many lesson rows exist".
function countPrivateBookings(sinceMs: number, untilMs: number): number {
  const inRange = getPrivateLessons().filter((l) => l.createdAtMs !== undefined && l.createdAtMs >= sinceMs && l.createdAtMs < untilMs);
  const distinctBookingKeys = new Set(inRange.map((l) => l.bookingId ?? l.id));
  return distinctBookingKeys.size;
}

function countGroupBookings(sinceMs: number, untilMs: number): number {
  return getGroupClassEnrollments().filter((e) => e.atMs >= sinceMs && e.atMs < untilMs).length;
}

function countSuccessfulPayments(sinceMs: number, untilMs: number): number {
  return getPaymentPlans().filter((p) => p.status === "paid" && p.paidAtMs >= sinceMs && p.paidAtMs < untilMs).length;
}

// A convenience wrapper for the common "last N days ending now" query — the
// default `nowMs` parameter (not a call inside the caller's own render body)
// is what keeps a React component's render/useMemo callback pure; see
// getPlatformOverview in platform-overview.ts for the identical pattern.
export function getConversionFunnelForWindow(windowDays: number, nowMs: number = Date.now()): ConversionFunnel {
  return getConversionFunnel(nowMs - windowDays * 86_400_000, nowMs);
}

export function getConversionFunnel(sinceMs: number, untilMs: number): ConversionFunnel {
  const views = new Set(
    getAllPageViews()
      .filter((ev) => ev.atMs >= sinceMs && ev.atMs < untilMs)
      .map((ev) => ev.visitorId)
  ).size;
  const signups = getAllSignupEvents().filter((ev) => ev.atMs >= sinceMs && ev.atMs < untilMs).length;
  const bookings = countPrivateBookings(sinceMs, untilMs) + countGroupBookings(sinceMs, untilMs);
  const payments = countSuccessfulPayments(sinceMs, untilMs);
  return { views, signups, bookings, payments };
}
