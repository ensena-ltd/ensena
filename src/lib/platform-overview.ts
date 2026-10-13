// The Platform Overview aggregation: one pure function that turns real page
// views + real signup events into pre-computed bucketed rows and period
// totals — the UI (admin-analytics-client.tsx) only ever renders this
// output, never loops over raw events itself.
//
// Three metrics, each with one explicit, real definition (never hardcoded,
// never guessed per screen):
//   - Visitors:     distinct visitorId with >=1 tracked page view in the
//                    bucket — includes anonymous visitors, by construction
//                    (page views are recorded regardless of login state).
//   - Active Users: distinct visitorId with >=1 tracked page view recorded
//                    WHILE LOGGED IN (PageViewEvent.loggedIn) in the bucket —
//                    reuses this app's own real session concept
//                    (session-store.ts's isLoggedIn()) rather than inventing
//                    a separate "activity" definition. Deliberately NOT the
//                    same number as Visitors: an anonymous browse-only visit
//                    never counts here.
//   - New Signups:  count of real SignupEvent rows in the bucket.
import { getAllPageViews } from "@/lib/page-analytics-store";
import { getAllSignupEvents } from "@/lib/signup-events-store";

export type PeriodGranularity = "day" | "week" | "month" | "year";

export interface OverviewBucket {
  /** e.g. "Sep 8, 2026" (day), "Week of Sep 7" (week), "Sep 2026" (month), "2026" (year). */
  label: string;
  startMs: number;
  endMs: number;
  visitors: number;
  activeUsers: number;
  newSignups: number;
}

export interface PlatformOverview {
  totals: { visitors: number; activeUsers: number; newSignups: number };
  /** Newest bucket first — the required "activity by date" ordering. */
  buckets: OverviewBucket[];
}

const DAY_MS = 86_400_000;

function startOfDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Monday-start week, matching this app's existing calendar-week convention
// (see schedule-week.ts) — one consistent definition of "week" everywhere.
function startOfWeekMs(ms: number): number {
  const day = startOfDayMs(ms);
  const d = new Date(day);
  const weekday = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d.getTime();
}

function startOfMonthMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function startOfYearMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), 0, 1).getTime();
}

function bucketStart(granularity: PeriodGranularity, ms: number): number {
  if (granularity === "day") return startOfDayMs(ms);
  if (granularity === "week") return startOfWeekMs(ms);
  if (granularity === "month") return startOfMonthMs(ms);
  return startOfYearMs(ms);
}

function nextBucketStart(granularity: PeriodGranularity, startMs: number): number {
  const d = new Date(startMs);
  if (granularity === "day") return startMs + DAY_MS;
  if (granularity === "week") return startMs + 7 * DAY_MS;
  if (granularity === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return new Date(d.getFullYear() + 1, 0, 1).getTime();
}

function bucketLabel(granularity: PeriodGranularity, startMs: number): string {
  const d = new Date(startMs);
  if (granularity === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (granularity === "week") return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  if (granularity === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return String(d.getFullYear());
}

// Builds `bucketCount` most-recent buckets of the given granularity ending
// at `nowMs`'s own bucket (inclusive), oldest-to-newest internally, then
// aggregates real events into them and returns newest-first — the exact
// ordering the Platform Overview activity table requires.
export function getPlatformOverview(granularity: PeriodGranularity, bucketCount: number, nowMs: number = Date.now()): PlatformOverview {
  const currentStart = bucketStart(granularity, nowMs);
  const starts: number[] = [];
  let cursor = currentStart;
  for (let i = 0; i < bucketCount; i++) {
    starts.unshift(cursor);
    // Walk backward one bucket at a time — recompute via nextBucketStart's
    // inverse isn't available, so step back a day/week/month/year directly.
    const d = new Date(cursor);
    if (granularity === "day") cursor -= DAY_MS;
    else if (granularity === "week") cursor -= 7 * DAY_MS;
    else if (granularity === "month") cursor = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    else cursor = new Date(d.getFullYear() - 1, 0, 1).getTime();
  }

  const buckets: (OverviewBucket & { visitorSet: Set<string>; activeSet: Set<string> })[] = starts.map((startMs) => ({
    label: bucketLabel(granularity, startMs),
    startMs,
    endMs: nextBucketStart(granularity, startMs),
    visitors: 0,
    activeUsers: 0,
    newSignups: 0,
    visitorSet: new Set<string>(),
    activeSet: new Set<string>(),
  }));

  const rangeStart = buckets[0]?.startMs ?? currentStart;
  const rangeEnd = buckets[buckets.length - 1]?.endMs ?? nextBucketStart(granularity, currentStart);

  for (const ev of getAllPageViews()) {
    if (ev.atMs < rangeStart || ev.atMs >= rangeEnd) continue;
    const bucket = buckets.find((b) => ev.atMs >= b.startMs && ev.atMs < b.endMs);
    if (!bucket) continue;
    bucket.visitorSet.add(ev.visitorId);
    if (ev.loggedIn) bucket.activeSet.add(ev.visitorId);
  }

  for (const ev of getAllSignupEvents()) {
    if (ev.atMs < rangeStart || ev.atMs >= rangeEnd) continue;
    const bucket = buckets.find((b) => ev.atMs >= b.startMs && ev.atMs < b.endMs);
    if (bucket) bucket.newSignups += 1;
  }

  const finished = buckets.map(({ visitorSet, activeSet, ...b }) => ({ ...b, visitors: visitorSet.size, activeUsers: activeSet.size }));

  const allVisitorIds = new Set<string>();
  const allActiveIds = new Set<string>();
  let totalSignups = 0;
  for (const ev of getAllPageViews()) {
    if (ev.atMs < rangeStart || ev.atMs >= rangeEnd) continue;
    allVisitorIds.add(ev.visitorId);
    if (ev.loggedIn) allActiveIds.add(ev.visitorId);
  }
  for (const ev of getAllSignupEvents()) {
    if (ev.atMs >= rangeStart && ev.atMs < rangeEnd) totalSignups += 1;
  }

  return {
    totals: { visitors: allVisitorIds.size, activeUsers: allActiveIds.size, newSignups: totalSignups },
    buckets: [...finished].reverse(),
  };
}
