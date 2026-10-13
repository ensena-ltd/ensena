// The "who is currently logged into Ensena as a Student/Tutor" concept —
// same idiom as admin-session.ts, but for the two roles that previously had
// NO session concept at all: every student/tutor page assumed a single
// always-on demo persona regardless of whether sign-in was ever completed.
// This is what makes "redirect to sign-in, then come back" (see
// pending-action-store.ts) possible — without a real logged-in/logged-out
// distinction there's nothing to gate on.
//
// Like admin-session.ts, this is a client-side, localStorage-backed session:
// genuinely functional for gating within a browser, not a real security
// boundary (this app has no backend to enforce one server-side).
export type SessionRole = "Student" | "Tutor";

export interface UserSession {
  role: SessionRole;
  name: string;
  email: string;
}

const SESSION_KEY = "ensena_user_session";
export const SESSION_EVENT = "ensena:user-session-changed";

// Cached-parse idiom (see admin-session.ts) — required so useSyncExternalStore
// callers get a referentially-stable "logged out" value instead of a new
// `null` triggering a render loop, and a stable parsed object otherwise.
let cachedRaw: string | null = null;
let cachedSession: UserSession | null = null;

export function getCurrentSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as UserSession) : null;
    } catch {
      cachedSession = null;
    }
  }
  return cachedSession;
}

export function isLoggedIn(): boolean {
  return getCurrentSession() !== null;
}

export function setCurrentSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function subscribeSession(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
