// Real, persisted tutor-blocked-time — localStorage-backed, same idiom as
// escrow-store.ts/admin-audit-log.ts, so a block a tutor creates survives
// navigation/reload and is visible to every mounted consumer (the calendar,
// and in principle a student-facing booking picker checking availability)
// rather than living only in one component's local state.
const BLOCKS_KEY = "ensena_tutor_blocked_times";
export const BLOCKED_TIMES_EVENT = "ensena:blocked-times-changed";

export interface BlockedTimeEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  startHour: number;
  endHour: number;
  allDay: boolean;
  reason?: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(BLOCKED_TIMES_EVENT));
}

// getSnapshot() for useSyncExternalStore must return the same reference
// until something actually changes — same cached-reader idiom as every
// other store in this app.
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

const EMPTY: BlockedTimeEntry[] = [];
const readBlocksRaw = makeCachedReader<BlockedTimeEntry[]>(BLOCKS_KEY, EMPTY);

export function getBlockedTimes(): BlockedTimeEntry[] {
  return readBlocksRaw();
}

export function addBlockedTimes(entries: BlockedTimeEntry[]): void {
  writeJson(BLOCKS_KEY, [...readJson(BLOCKS_KEY, EMPTY), ...entries]);
}

export function removeBlockedTime(id: string): void {
  writeJson(BLOCKS_KEY, readJson(BLOCKS_KEY, EMPTY).filter((b) => b.id !== id));
}

export function updateBlockedTime(id: string, patch: Partial<BlockedTimeEntry>): void {
  writeJson(BLOCKS_KEY, readJson(BLOCKS_KEY, EMPTY).map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

// Real availability check — a booking flow can call this before letting a
// student pick a slot, so a block genuinely blocks bookings rather than
// only being decorative on the tutor's own calendar.
export function isSlotBlocked(dateISO: string, hour: number): boolean {
  return readBlocksRaw().some((b) => b.date === dateISO && (b.allDay || (hour >= b.startHour && hour < b.endHour)));
}

export function subscribeBlockedTimes(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BLOCKED_TIMES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BLOCKED_TIMES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
