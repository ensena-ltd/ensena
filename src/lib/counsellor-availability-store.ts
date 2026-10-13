// Real, persisted counsellor-availability settings — localStorage-backed,
// same idiom as tutor-availability-store.ts. Admin's Counsellor Settings
// screen (weekly hours, blocked dates, special one-off availability,
// session settings) previously only held these in local component state —
// every "Save" was a toast with no write-back, so the student-facing
// scheduler (getDaySlots/getWeekSlots in counsellor-data.ts) could never see
// an admin edit. This store is the first real persistence layer for any of
// it; each piece is seeded from the original constants in
// admin-counselling-center-data.ts.
import type { AvailabilityDay, BlockedDate, CounsellorSessionSettings, SpecialAvailabilityDate } from "@/lib/admin-counselling-center-data";
import {
  initialAvailability,
  initialBlockedDates,
  initialCounsellorSessionSettings,
  initialSpecialAvailability,
} from "@/lib/admin-counselling-center-data";

const AVAILABILITY_KEY = "ensena_counsellor_availability";
const BLOCKED_KEY = "ensena_counsellor_blocked_dates";
const SPECIAL_KEY = "ensena_counsellor_special_dates";
const SETTINGS_KEY = "ensena_counsellor_session_settings";
export const COUNSELLOR_AVAILABILITY_EVENT = "ensena:counsellor-availability-changed";

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

// Bumped on every real write — a stable snapshot value for consumers that
// just need to know "did anything in this store change" (see
// getAvailabilityVersion / useCounsellorAvailabilityTick) without recomputing
// a fresh object/array on every call, which useSyncExternalStore requires
// (an unstable snapshot like Date.now() re-renders forever).
let version = 0;
export function getAvailabilityVersion(): number {
  return version;
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  version++;
  window.dispatchEvent(new CustomEvent(COUNSELLOR_AVAILABILITY_EVENT));
}

const readAvailabilityRaw = makeCachedReader<AvailabilityDay[]>(AVAILABILITY_KEY, initialAvailability);
export function getAvailability(): AvailabilityDay[] {
  return readAvailabilityRaw();
}
export function updateAvailabilityDay(day: string, patch: Partial<AvailabilityDay>): void {
  writeJson(AVAILABILITY_KEY, readAvailabilityRaw().map((d) => (d.day === day ? { ...d, ...patch } : d)));
}

const readBlockedRaw = makeCachedReader<BlockedDate[]>(BLOCKED_KEY, initialBlockedDates);
export function getBlockedDates(): BlockedDate[] {
  return readBlockedRaw();
}
export function addBlockedDate(entry: BlockedDate): void {
  writeJson(BLOCKED_KEY, [...readBlockedRaw(), entry]);
}
export function removeBlockedDate(date: string): void {
  writeJson(BLOCKED_KEY, readBlockedRaw().filter((b) => b.date !== date));
}

const readSpecialRaw = makeCachedReader<SpecialAvailabilityDate[]>(SPECIAL_KEY, initialSpecialAvailability);
export function getSpecialDates(): SpecialAvailabilityDate[] {
  return readSpecialRaw();
}
export function addSpecialDate(entry: SpecialAvailabilityDate): void {
  writeJson(SPECIAL_KEY, [...readSpecialRaw(), entry]);
}
export function removeSpecialDate(date: string): void {
  writeJson(SPECIAL_KEY, readSpecialRaw().filter((s) => s.date !== date));
}

const readSettingsRaw = makeCachedReader<CounsellorSessionSettings>(SETTINGS_KEY, initialCounsellorSessionSettings);
export function getSessionSettings(): CounsellorSessionSettings {
  return readSettingsRaw();
}
export function updateSessionSettings(patch: Partial<CounsellorSessionSettings>): void {
  writeJson(SETTINGS_KEY, { ...readSettingsRaw(), ...patch });
}

export function subscribeCounsellorAvailability(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COUNSELLOR_AVAILABILITY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COUNSELLOR_AVAILABILITY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
