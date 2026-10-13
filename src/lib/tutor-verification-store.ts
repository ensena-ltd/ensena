// Real, persisted admin-tutor records — localStorage-backed, same idiom as
// private-lessons-store.ts. Admin's tutor list, tutor-verification queue, and
// tutor-verification review screens are three separate views of the same
// AdminTutor records — without a shared store, verifying a tutor on one
// screen would silently look unreviewed on the other two, and would never
// reach the public-facing "Verified Teacher" badges at all (they'd have no
// real status to read, only the hardcoded-true default every tutor card
// shows today).
import { initialAdminTutors, type AdminTutor, type AdminVerificationStatus } from "@/lib/admin-data";

const TUTORS_KEY = "ensena_admin_tutors";
export const ADMIN_TUTORS_EVENT = "ensena:admin-tutors-changed";

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

const readTutorsRaw = makeCachedReader<AdminTutor[]>(TUTORS_KEY, initialAdminTutors);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(ADMIN_TUTORS_EVENT));
}

export function getAdminTutors(): AdminTutor[] {
  return readTutorsRaw();
}

export function updateAdminTutor(id: string, patch: Partial<AdminTutor>): void {
  writeJson(TUTORS_KEY, readTutorsRaw().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function setTutorVerification(id: string, verification: AdminVerificationStatus, patch: Partial<AdminTutor> = {}): void {
  updateAdminTutor(id, { verification, ...patch });
}

export function subscribeAdminTutors(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ADMIN_TUTORS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ADMIN_TUTORS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Plain (non-hook) lookup for the public-facing "Verified Teacher" badge —
// most of those call sites render in response to route/prop changes, not a
// long-lived mount that needs live cross-tab reactivity, so a direct read is
// enough (same convention as other plain-function reads elsewhere in this
// app, e.g. hasCompletedFreeDiscovery). This is a trust-critical check: a
// tutor with no matching AdminTutor record has never actually been through
// the verification workflow, so they are NOT verified — defaulting to
// verified here would show a false trust signal for every tutor admin
// hasn't reviewed yet, which is exactly what this function exists to
// prevent.
export function isTutorVerifiedByName(name: string): boolean {
  const match = getAdminTutors().find((t) => t.name === name);
  return match?.verification === "Verified";
}
