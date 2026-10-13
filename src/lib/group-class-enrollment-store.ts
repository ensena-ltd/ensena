// Real, persisted group-class enrollment — localStorage-backed, same idiom
// as private-lessons-store.ts/discovery-sessions-store.ts. group-classes-data.ts's
// seatsFilled/seatsTotal stay static seed numbers (many components read them
// directly for display); this store tracks enrollments actually made at
// runtime, keyed by slug+cohortIndex, so the ENROLLMENT ACTION itself
// enforces real capacity (never allows past seatsTotal) and mints a real
// GRP… reference code — even though the seed-driven seat-count display
// elsewhere doesn't live-update from this store.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import type { Cohort } from "@/lib/group-classes-data";

const ENROLLMENTS_KEY = "ensena_group_class_enrollments";
export const GROUP_ENROLLMENTS_EVENT = "ensena:group-class-enrollments-changed";

export interface GroupClassEnrollment {
  id: string;
  bookingReference: string;
  slug: string;
  cohortIndex: number;
  plan: string;
  studentName: string;
  atMs: number;
  // Absent (undefined) on every enrollment created before cancellation
  // tracked status here — treated identically to "active" everywhere this
  // is read, so existing persisted enrollments keep working unchanged.
  status?: "active" | "cancelled";
}

function isActive(e: GroupClassEnrollment): boolean {
  return e.status !== "cancelled";
}

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

const EMPTY: GroupClassEnrollment[] = [];
const readEnrollmentsRaw = makeCachedReader<GroupClassEnrollment[]>(ENROLLMENTS_KEY, EMPTY);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(GROUP_ENROLLMENTS_EVENT));
}

export function getGroupClassEnrollments(): GroupClassEnrollment[] {
  return readEnrollmentsRaw();
}

// Extra seats filled this browser session for a given cohort, on top of the
// static seed seatsFilled.
export function extraSeatsFilled(slug: string, cohortIndex: number): number {
  return readEnrollmentsRaw().filter((e) => e.slug === slug && e.cohortIndex === cohortIndex && isActive(e)).length;
}

export function isGroupClassCohortFull(slug: string, cohort: Cohort, cohortIndex: number): boolean {
  return cohort.seatsFilled + extraSeatsFilled(slug, cohortIndex) >= cohort.seatsTotal;
}

// Real enrollment creation — called once, at the moment a student actually
// pays for a group class (see group-class-review-client.tsx), never
// speculatively. Refuses if the cohort is genuinely full (seed + this
// session's own enrollments), so a real capacity ceiling exists even though
// the display elsewhere doesn't live-update.
export async function enrollInGroupClass(
  slug: string,
  cohort: Cohort,
  cohortIndex: number,
  plan: string,
  studentName: string
): Promise<GroupClassEnrollment> {
  if (isGroupClassCohortFull(slug, cohort, cohortIndex)) {
    throw new Error("This cohort just reached capacity. Please choose a different cohort.");
  }
  const exists = (candidate: string) => readEnrollmentsRaw().some((e) => e.id === candidate);
  const reference = await generateUniqueReferenceCode("group", exists);
  const created: GroupClassEnrollment = {
    id: reference,
    bookingReference: reference,
    slug,
    cohortIndex,
    plan,
    studentName,
    atMs: Date.now(),
  };
  writeJson(ENROLLMENTS_KEY, [...readEnrollmentsRaw(), created]);
  return created;
}

// Cancelling marks the record cancelled rather than deleting it — a
// cancelled enrollment stays a permanent part of the student's booking
// history (see booking-lifecycle-store.ts), and the seat frees up because
// extraSeatsFilled/isGroupClassCohortFull only count active enrollments, not
// because the record disappeared.
export function cancelEnrollment(id: string): void {
  writeJson(ENROLLMENTS_KEY, readEnrollmentsRaw().map((e) => (e.id === id ? { ...e, status: "cancelled" as const } : e)));
}

export function subscribeGroupClassEnrollments(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(GROUP_ENROLLMENTS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(GROUP_ENROLLMENTS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
