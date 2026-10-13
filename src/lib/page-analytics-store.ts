// Real, persisted page-view tracking — localStorage-backed, same seed +
// real-delta merge idiom as reports-store.ts: a curated seed array supplies
// realistic history (so the Analytics page isn't empty on a fresh browser,
// exactly like admin-analytics-data.ts's own "curated demo cast" for
// platform-scale numbers), and every REAL visit from here on is a genuine
// appended event, never mixed into or replacing the seed.
//
// This tracks page VIEWS, not UI clicks — one event per real navigation to a
// new pathname (see use-page-view-tracking.ts for the one-event-per-
// navigation rule that prevents double-counting from re-renders, remounts,
// or back/forward navigation). Only public, unauthenticated-reachable pages
// are tracked (see PUBLIC_PATH_PREFIXES below) — a logged-in dashboard is not
// "site traffic" in the growth-analytics sense this feature answers.
import { getGroupClassBySlug } from "@/lib/group-classes-data";
import { isLoggedIn } from "@/lib/session-store";
import { getTutorBySlug } from "@/lib/tutors";

export type DeviceType = "Desktop" | "Mobile" | "Tablet";

export type PageCategory =
  | "Home"
  | "Find Teachers"
  | "Tutor Profile"
  | "Group Classes"
  | "Group Class"
  | "Become a Tutor"
  | "Sign In"
  | "Sign Up"
  | "Community"
  | "Help"
  | "Other";

export interface PageViewEvent {
  id: string;
  path: string;
  pageCategory: PageCategory;
  pageTitle: string;
  /** The specific tutor slug / group class slug, only for a dynamic route — never set for a listing/static page. */
  entityId?: string;
  device: DeviceType;
  visitorId: string;
  sessionId: string;
  /** Whether this visitor was logged in (Student or Tutor session) at the moment of this view — the real signal "Active Users" is computed from, see platform-overview.ts. */
  loggedIn: boolean;
  atMs: number;
}

// A pathname this feature tracks at all — every logged-in dashboard area
// (student/tutor/admin/counsellor) is deliberately excluded: this answers
// "how much public traffic does the site get", not "how much do we use our
// own dashboards".
const PUBLIC_PATH_PREFIXES_TO_EXCLUDE = ["/admin", "/student-dashboard", "/tutor-dashboard", "/counsellor-dashboard"];

export function isTrackablePath(pathname: string): boolean {
  return !PUBLIC_PATH_PREFIXES_TO_EXCLUDE.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// The one place a raw pathname becomes a real page identity — every caller
// (the live tracker, the seed data below, any future surface) goes through
// this so "what page is this" is never independently re-guessed per screen.
export function classifyPath(pathname: string): { category: PageCategory; title: string; entityId?: string } {
  if (pathname === "/") return { category: "Home", title: "Home" };
  if (pathname === "/find-teachers") return { category: "Find Teachers", title: "Find Teachers" };

  const tutorMatch = pathname.match(/^\/find-teachers\/([^/]+)/);
  if (tutorMatch) {
    const slug = tutorMatch[1];
    const tutor = getTutorBySlug(slug);
    return { category: "Tutor Profile", title: tutor ? `${tutor.name} — Tutor Profile` : `Tutor Profile (${slug})`, entityId: slug };
  }

  if (pathname === "/group-classes") return { category: "Group Classes", title: "Group Classes" };
  const groupMatch = pathname.match(/^\/group-classes\/([^/]+)/);
  if (groupMatch) {
    const slug = groupMatch[1];
    const groupClass = getGroupClassBySlug(slug);
    return { category: "Group Class", title: groupClass ? `${groupClass.title} — Group Class` : `Group Class (${slug})`, entityId: slug };
  }

  if (pathname === "/become-a-tutor") return { category: "Become a Tutor", title: "Become a Tutor" };
  if (pathname === "/sign-in") return { category: "Sign In", title: "Sign In" };
  if (pathname.startsWith("/sign-up")) return { category: "Sign Up", title: "Sign Up" };
  if (pathname.startsWith("/community")) return { category: "Community", title: "Community" };
  if (pathname.startsWith("/help")) return { category: "Help", title: "Help Center" };

  return { category: "Other", title: pathname };
}

const PAGE_VIEWS_KEY = "ensena_page_views";
export const PAGE_VIEW_EVENT = "ensena:page-view-recorded";

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

const readRealViews = makeCachedReader<PageViewEvent[]>(PAGE_VIEWS_KEY, []);

function writeJson(value: PageViewEvent[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAGE_VIEWS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PAGE_VIEW_EVENT));
}

// Realistic-looking history so the Page Analytics ranking and Platform
// Overview activity table aren't empty on a fresh browser — the same
// "curated demo cast" idiom admin-analytics-data.ts already uses for
// platform-scale numbers, built with the real classifyPath so seed rows and
// real rows are structurally identical (never a second, differently-shaped
// "mock" record type). Spread across the last 45 days with a realistic
// device split and a heavier weight on Home/Find Teachers/a few popular
// tutor and group-class pages, exactly the shape real traffic would have.
function buildSeedPageViews(): PageViewEvent[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const popularPaths = [
    "/",
    "/",
    "/",
    "/find-teachers",
    "/find-teachers",
    "/find-teachers/adaeze-okonkwo",
    "/find-teachers/adaobi-chukwuma",
    "/group-classes",
    "/group-classes/neco-physics-bootcamp",
    "/become-a-tutor",
    "/sign-up/student",
    "/sign-in",
    "/community",
    "/help",
  ];
  const devices: DeviceType[] = ["Desktop", "Mobile", "Mobile", "Tablet"];
  const events: PageViewEvent[] = [];
  let counter = 0;
  for (let dayOffset = 44; dayOffset >= 0; dayOffset--) {
    // A gentle upward trend toward "today" plus deterministic per-day
    // variation — deterministic (no Math.random) so the seed is stable
    // across reloads/builds, matching every other seeded store in this app.
    const viewsToday = 6 + ((dayOffset * 7) % 11) + (44 - dayOffset > 30 ? 4 : 0);
    for (let i = 0; i < viewsToday; i++) {
      counter++;
      const path = popularPaths[(dayOffset * 3 + i) % popularPaths.length];
      const { category, title, entityId } = classifyPath(path);
      const atMs = now - dayOffset * DAY - (i * DAY) / (viewsToday + 1);
      events.push({
        id: `seed-pv-${counter}`,
        path,
        pageCategory: category,
        pageTitle: title,
        entityId,
        device: devices[counter % devices.length],
        visitorId: `seed-visitor-${counter % 37}`,
        sessionId: `seed-session-${counter % 60}`,
        loggedIn: counter % 5 === 0,
        atMs,
      });
    }
  }
  return events;
}

const SEED_PAGE_VIEWS = buildSeedPageViews();

// Real + seed together, oldest untouched — never re-derived per call since
// the seed array is a stable module-level constant.
export function getAllPageViews(): PageViewEvent[] {
  return [...SEED_PAGE_VIEWS, ...readRealViews()];
}

// The one place a real page-view event is ever created — the live tracking
// hook (use-page-view-tracking.ts) is the only intended caller. Silently
// no-ops outside the browser or for a non-trackable path, so a stray call
// can never throw and break the page it's instrumenting.
export function recordPageView(input: { path: string; device: DeviceType; visitorId: string; sessionId: string }): void {
  if (typeof window === "undefined" || !isTrackablePath(input.path)) return;
  const { category, title, entityId } = classifyPath(input.path);
  const event: PageViewEvent = {
    id: `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    path: input.path,
    pageCategory: category,
    pageTitle: title,
    entityId,
    device: input.device,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    loggedIn: isLoggedIn(),
    atMs: Date.now(),
  };
  writeJson([...readRealViews(), event]);
}

export function subscribePageViews(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PAGE_VIEW_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PAGE_VIEW_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export interface PageRankingRow {
  path: string;
  pageCategory: PageCategory;
  pageTitle: string;
  entityId?: string;
  views: number;
  uniqueVisitors: number;
  deviceBreakdown: Record<DeviceType, number>;
}

// Aggregated, pre-computed ranking rows — the UI renders this list directly,
// never a raw per-event loop. Ranked highest-views-first by construction (an
// alphabetical or insertion-order list would violate the "ranked, never
// alphabetical" requirement this exists to satisfy).
// A convenience wrapper for the common "last N days ending now" query — the
// default `nowMs` parameter (not a call inside the caller's own render body)
// is what keeps a React component's render/useMemo callback pure; see
// getPlatformOverview in platform-overview.ts for the identical pattern.
export function getPageRankingForWindow(windowDays: number, nowMs: number = Date.now()): PageRankingRow[] {
  return getPageRanking(nowMs - windowDays * 86_400_000, nowMs);
}

export function getPageRanking(sinceMs: number, untilMs: number): PageRankingRow[] {
  const rows = new Map<string, PageRankingRow & { visitorSet: Set<string> }>();
  for (const ev of getAllPageViews()) {
    if (ev.atMs < sinceMs || ev.atMs >= untilMs) continue;
    const key = ev.entityId ? `${ev.pageCategory}:${ev.entityId}` : ev.path;
    const existing = rows.get(key);
    if (existing) {
      existing.views += 1;
      existing.visitorSet.add(ev.visitorId);
      existing.deviceBreakdown[ev.device] += 1;
    } else {
      rows.set(key, {
        path: ev.path,
        pageCategory: ev.pageCategory,
        pageTitle: ev.pageTitle,
        entityId: ev.entityId,
        views: 1,
        uniqueVisitors: 0,
        visitorSet: new Set([ev.visitorId]),
        deviceBreakdown: { Desktop: ev.device === "Desktop" ? 1 : 0, Mobile: ev.device === "Mobile" ? 1 : 0, Tablet: ev.device === "Tablet" ? 1 : 0 },
      });
    }
  }
  return [...rows.values()]
    .map(({ visitorSet, ...row }) => ({ ...row, uniqueVisitors: visitorSet.size }))
    .sort((a, b) => b.views - a.views);
}
