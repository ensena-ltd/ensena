// Real, persisted attendance — localStorage-backed, same makeCachedReader/
// writeJson + CustomEvent idiom as every other store in this app (e.g.
// payout-store.ts, support-store.ts). Fed by the ONE shared ClassroomShell
// component (classroom-shell.tsx), which every kind (Private, Group,
// Discovery, Counselling) and both roles already render — so this is wired
// once, not per class type.
//
// "Join" here means the real moment ClassroomShell actually renders for
// that participant — this app has no backend session to detect true media/
// WebRTC readiness more precisely across all four kinds, so that's the
// honest, disclosed definition, not oversold as presence-verified. What it
// DOES give: a real record of whether a given person's own browser tab
// actually visited the classroom at all, distinct from "the tutor clicked
// End Class" (the only signal escrow-store.ts's LessonConfirmation records
// today) or a hash-based fake attendance pattern (buildSessionAttendance,
// tutor-dashboard-data.ts, left untouched — a separate, tutor-facing
// concern out of scope here).
export interface AttendanceRecord {
  classroomId: string;
  participantRole: "tutor" | "student";
  participantName: string;
  joinedAtISO: string;
  leftAtISO?: string;
}

export type AttendanceVerdict = "pending" | "both-attended" | "student-absent" | "tutor-absent" | "both-absent";

const ATTENDANCE_KEY = "ensena_class_attendance";
export const ATTENDANCE_EVENT = "ensena:attendance-changed";

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

const readRaw = makeCachedReader<AttendanceRecord[]>(ATTENDANCE_KEY, []);

function writeJson(value: AttendanceRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT));
}

// Memoized per classroomId, invalidated only when the underlying raw array
// reference actually changes (a real write) — useAttendance() feeds this
// straight into useSyncExternalStore, which requires getSnapshot to return
// a referentially STABLE value when nothing changed. A plain `.filter()`
// call returns a brand-new array reference every single call even when the
// contents are identical, which useSyncExternalStore reads as "the store
// changed" on every render — an infinite render loop (confirmed live: this
// exact bug crashed the page with "Maximum update depth exceeded" before
// this memoization was added).
let lastRawRef: AttendanceRecord[] | null = null;
const filteredCache = new Map<string, AttendanceRecord[]>();

export function getAttendance(classroomId: string): AttendanceRecord[] {
  const raw = readRaw();
  if (raw !== lastRawRef) {
    lastRawRef = raw;
    filteredCache.clear();
  }
  const cached = filteredCache.get(classroomId);
  if (cached) return cached;
  const filtered = raw.filter((r) => r.classroomId === classroomId);
  filteredCache.set(classroomId, filtered);
  return filtered;
}

// Every record, unfiltered — for a caller that needs to check several
// classroomIds at once (e.g. a list of many rows) without calling a hook
// once per row, which would violate the Rules of Hooks inside a loop/.map().
// Filter this with a plain classroomId === check per item instead.
export function getAllAttendance(): AttendanceRecord[] {
  return readRaw();
}

// Idempotent per (classroomId, role, name) "session" — a genuinely new join
// (after a full leave, e.g. rejoining) opens a new record rather than
// silently overwriting the previous one, so a real leave/rejoin history is
// preserved instead of just "last join wins."
export function recordJoin(classroomId: string, role: "tutor" | "student", name: string): void {
  const all = readRaw();
  const hasOpenRecord = all.some((r) => r.classroomId === classroomId && r.participantRole === role && r.participantName === name && !r.leftAtISO);
  if (hasOpenRecord) return;
  const record: AttendanceRecord = { classroomId, participantRole: role, participantName: name, joinedAtISO: new Date().toISOString() };
  writeJson([...all, record]);
}

export function recordLeave(classroomId: string, role: "tutor" | "student", name: string): void {
  const all = readRaw();
  let updated = false;
  const next = all.map((r) => {
    if (updated || r.classroomId !== classroomId || r.participantRole !== role || r.participantName !== name || r.leftAtISO) return r;
    updated = true;
    return { ...r, leftAtISO: new Date().toISOString() };
  });
  if (updated) writeJson(next);
}

export function subscribeAttendance(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ATTENDANCE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ATTENDANCE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Only ever decided once the scheduled window has genuinely passed (nowMs
// >= endMs) — per the explicit "don't determine absence early" requirement.
// Purely informational: never touches escrow/payment/dispute state, which
// stay governed by their own existing rules (openDispute/fileComplaint/
// admin review) — this is evidence, not an automatic outcome.
export function getAttendanceVerdict(classroomId: string, endMs: number, nowMs: number): AttendanceVerdict {
  if (nowMs < endMs) return "pending";
  const records = getAttendance(classroomId);
  const tutorAttended = records.some((r) => r.participantRole === "tutor");
  const studentAttended = records.some((r) => r.participantRole === "student");
  if (tutorAttended && studentAttended) return "both-attended";
  if (tutorAttended) return "student-absent";
  if (studentAttended) return "tutor-absent";
  return "both-absent";
}

// Group Class only — per-student verdicts rather than one verdict for the
// whole class, since "every student who participated" needs to be
// individually knowable (matches the same principle the group review system
// already established this session: never one generic record for a group).
export function getGroupAttendanceVerdicts(classroomId: string, studentNames: string[], endMs: number, nowMs: number): Record<string, "pending" | "attended" | "absent"> {
  const result: Record<string, "pending" | "attended" | "absent"> = {};
  const records = nowMs >= endMs ? getAttendance(classroomId) : [];
  for (const name of studentNames) {
    result[name] = nowMs < endMs ? "pending" : records.some((r) => r.participantRole === "student" && r.participantName === name) ? "attended" : "absent";
  }
  return result;
}
