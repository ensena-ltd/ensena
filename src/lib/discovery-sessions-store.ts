// Real, persisted discovery sessions created at runtime — localStorage-backed,
// same idiom as private-lessons-store.ts. `discoverySessions` in
// discovery-sessions-data.ts stays a plain static seed array (many
// components import it directly); this store only holds sessions actually
// booked during this browser session, and getAllDiscoverySessions/
// useAllDiscoverySessions combine the two so a newly-booked session shows up
// everywhere a discovery session list is rendered.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { discoverySessions, type DiscoverySession } from "@/lib/discovery-sessions-data";

const RUNTIME_KEY = "ensena_runtime_discovery_sessions";
// Patches to ANY session (seeded or runtime-booked), keyed by id — the one
// write path for everything that happens to a session after it's created:
// fit feedback, funnel-stage/status transitions, a tutor's recommendation,
// conversion outcome, etc. Layering overrides on top (rather than mutating
// the seed array in place or requiring the caller to know whether an id is
// seeded vs. runtime) keeps a single update function correct for both.
const OVERRIDES_KEY = "ensena_discovery_session_overrides";
export const DISCOVERY_SESSIONS_EVENT = "ensena:discovery-sessions-changed";

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

const EMPTY: DiscoverySession[] = [];
const readRuntimeRaw = makeCachedReader<DiscoverySession[]>(RUNTIME_KEY, EMPTY);
const EMPTY_OVERRIDES: Record<string, Partial<DiscoverySession>> = {};
const readOverridesRaw = makeCachedReader<Record<string, Partial<DiscoverySession>>>(OVERRIDES_KEY, EMPTY_OVERRIDES);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(DISCOVERY_SESSIONS_EVENT));
}

export function getRuntimeDiscoverySessions(): DiscoverySession[] {
  return readRuntimeRaw();
}

// Cached on the same (runtime, overrides) object-identity pair that
// readRuntimeRaw()/readOverridesRaw() themselves only change when the
// underlying localStorage value actually changes — required so this keeps
// returning the exact same array reference across repeated calls with no
// writes in between. useAllDiscoverySessions() reads this directly via
// useSyncExternalStore, which needs a stable snapshot to avoid re-rendering
// (or looping) on every render when nothing has changed.
let mergedCache: { runtime: DiscoverySession[]; overrides: Record<string, Partial<DiscoverySession>>; result: DiscoverySession[] } | null = null;

export function getAllDiscoverySessions(): DiscoverySession[] {
  const runtime = readRuntimeRaw();
  const overrides = readOverridesRaw();
  if (mergedCache && mergedCache.runtime === runtime && mergedCache.overrides === overrides) return mergedCache.result;
  const base = runtime.length === 0 ? discoverySessions : [...discoverySessions, ...runtime];
  const result = Object.keys(overrides).length === 0 ? base : base.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s));
  mergedCache = { runtime, overrides, result };
  return result;
}

// The one write path for updating a session after it's created — fit
// feedback, funnel-stage/status transitions, a submitted recommendation,
// conversion outcome. Works for both a seeded and a runtime-booked session
// since it never touches either array directly, only the overrides layer
// getAllDiscoverySessions() merges on top when reading.
export function updateDiscoverySession(id: string, patch: Partial<DiscoverySession>): void {
  const overrides = readOverridesRaw();
  writeJson(OVERRIDES_KEY, { ...overrides, [id]: { ...overrides[id], ...patch } });
}

// Real booking creation — called once, at the moment a student actually
// books a Discovery Session (see discovery-session-booking-client.tsx),
// never speculatively. The reference code doubles as the record's id.
//
// No conflict check inside this store itself — discovery-sessions-store.ts
// sits in a spot in the module graph (tutor-dashboard-data.ts imports it
// directly) where importing tutor-availability.ts back would create a real
// circular-import crash (confirmed at runtime: a TDZ ReferenceError on
// tutor-dashboard-data.ts's own initialPrivateLessons). The real,
// comprehensive conflict check still runs one layer up, at the moment of
// booking, via getAvailableSlots (discovery-session-booking-client.tsx),
// which itself now accounts for private lessons, other Discovery Sessions,
// AND group classes.
export async function addDiscoverySession(
  session: Omit<DiscoverySession, "id" | "bookingReference">
): Promise<DiscoverySession> {
  const exists = (candidate: string) =>
    discoverySessions.some((s) => s.id === candidate) || readRuntimeRaw().some((s) => s.id === candidate);
  const reference = await generateUniqueReferenceCode("discovery", exists);
  const created: DiscoverySession = { ...session, id: reference, bookingReference: reference };
  writeJson(RUNTIME_KEY, [...readRuntimeRaw(), created]);
  return created;
}

export function subscribeDiscoverySessions(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DISCOVERY_SESSIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DISCOVERY_SESSIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
