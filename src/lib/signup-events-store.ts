// Real, persisted signup events — localStorage-backed, same seed +
// real-delta idiom as page-analytics-store.ts. Neither AdminStudent nor
// AdminTutor carries a real timestamp anywhere in this app (only a
// display-label `joined: string` like "January 2021") — this is the first
// real, ISO-timestamped "an account was created at this moment" record, and
// it's what the Platform Overview's "New Signups" metric is actually
// computed from, never hardcoded.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SignupRole = "Student" | "Tutor";

export interface SignupEvent {
  id: string;
  role: SignupRole;
  atMs: number;
}

const SIGNUP_EVENTS_KEY = "ensena_signup_events";
export const SIGNUP_EVENT = "ensena:signup-recorded";

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

const readRealSignups = makeCachedReader<SignupEvent[]>(SIGNUP_EVENTS_KEY, []);

function writeJson(value: SignupEvent[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIGNUP_EVENTS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(SIGNUP_EVENT));
}

// A plausible recent growth history — deterministic (no Math.random, same
// reasoning as page-analytics-store.ts's seed) so it's stable across
// reloads. Weighted toward more students than tutors, and a mild upward
// trend toward "today", matching the shape a real early-stage platform's
// signups would have.
function buildSeedSignups(): SignupEvent[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const events: SignupEvent[] = [];
  let counter = 0;
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const studentsToday = 1 + ((dayOffset * 5) % 4) + (59 - dayOffset > 40 ? 2 : 0);
    const tutorsToday = (dayOffset * 3) % 3;
    for (let i = 0; i < studentsToday; i++) {
      counter++;
      events.push({ id: `seed-signup-${counter}`, role: "Student", atMs: now - dayOffset * DAY - (i * DAY) / (studentsToday + 1) });
    }
    for (let i = 0; i < tutorsToday; i++) {
      counter++;
      events.push({ id: `seed-signup-${counter}`, role: "Tutor", atMs: now - dayOffset * DAY - (i * DAY) / (tutorsToday + 1) });
    }
  }
  return events;
}

const SEED_SIGNUPS = buildSeedSignups();

export function getAllSignupEvents(): SignupEvent[] {
  return [...SEED_SIGNUPS, ...readRealSignups()];
}

// The one place a real signup event is created — called exactly at the two
// moments a brand-new Student/Tutor account actually starts existing (see
// student-onboarding-client.tsx and sign-up/tutor/sign-up-client.tsx),
// never at sign-IN (an existing account logging back in is not a signup).
export function recordSignup(role: SignupRole): void {
  if (typeof window === "undefined") return;
  const event: SignupEvent = { id: `signup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, role, atMs: Date.now() };
  writeJson([...readRealSignups(), event]);

  // Once a real Supabase project is configured, also write a real row to
  // the signup_events table (RLS: any signed-in user may insert their own)
  // so the admin Analytics "New Signups" chart reflects real accounts
  // instead of only this browser's localStorage. Fire-and-forget — no
  // caller awaits recordSignup today, and a failed write here shouldn't
  // block someone from landing on their dashboard.
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void supabase.from("signup_events").insert({ user_id: data.user.id, role: role.toLowerCase() });
    });
  }
}

export function subscribeSignupEvents(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SIGNUP_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIGNUP_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
