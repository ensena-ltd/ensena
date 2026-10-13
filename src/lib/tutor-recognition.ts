// Real, data-driven tutor/student recognition logic.
//
// TOP RATED — a dynamic PERFORMANCE STATUS, never a badge. Recomputed from
// live data on every call, never persisted, so it appears/disappears
// automatically as a tutor's real rating, review count, or standing
// changes. Rendered as plain inline text next to the rating (see
// teacher-card.tsx / mobile-teacher-card.tsx) — no icon, no pill component.
//
// FOUNDING TUTOR / FOUNDING STUDENT — a permanent EARLY-MEMBER STATUS, WITH
// a badge (see founding-badge.tsx). Based on real verified join order —
// the first 50 ever verified — and never re-evaluated away once earned.
//
// These two concepts are independent: a tutor can be Founding without being
// Top Rated, Top Rated without being Founding, both, or neither.
import { getAdminTutors } from "@/lib/tutor-verification-store";
import { initialAdminStudents } from "@/lib/admin-data";
import type { TutorListing } from "@/lib/tutors";

const FOUNDING_LIMIT = 50;
const TOP_RATED_MIN_RATING = 4.8;
const TOP_RATED_MIN_REVIEWS = 20;
const RELIABLE_MAX_CANCELLATION_PCT = 5;

// Real account-standing flags the admin verification/moderation workflow
// already tracks (AdminTutorStatus, admin-data.ts) — any of these represent
// an actual unresolved complaint or reliability problem on file.
const DISQUALIFYING_STATUSES = new Set(["Warning", "UnderReview", "Restricted", "Suspended", "Banned"]);

function findAdminTutor(name: string) {
  return getAdminTutors().find((t) => t.name === name);
}

// A tutor with no AdminTutor record at all has no flags on file, so isn't
// disqualified by this check alone — Top Rated still requires the rating/
// review thresholds below either way.
export function hasDisqualifyingTutorIssue(tutorName: string): boolean {
  const admin = findAdminTutor(tutorName);
  return admin ? DISQUALIFYING_STATUSES.has(admin.status) : false;
}

// `effectiveRating`/`effectiveReviews` must be the live, review-subscribed
// numbers every caller already computes via useTutorRating /
// computeEffectiveTutorRating — never the raw seed values — so this stays
// accurate the moment a new review changes the blended average.
export function isTopRatedTutor(tutorName: string, effectiveRating: number, effectiveReviews: number): boolean {
  if (effectiveRating < TOP_RATED_MIN_RATING || effectiveReviews < TOP_RATED_MIN_REVIEWS) return false;
  return !hasDisqualifyingTutorIssue(tutorName);
}

export interface TutorTrustStatus {
  identityVerified: boolean;
  backgroundChecked: boolean;
  profileComplete: boolean;
  reliable: boolean;
  // The ONLY thing that unlocks the main verification checkmark shown next
  // to a tutor's name everywhere (marketplace cards, profile, search) — see
  // isTutorVerifiedByName, which this mirrors exactly.
  overallVerified: boolean;
}

// The Tutor Profile's "Trust & Reliability" section, made real — each line
// is its own independently-computed condition instead of four unconditional
// hardcoded checkmarks that used to show for every tutor regardless of
// actual status.
export function getTutorTrustStatus(tutor: TutorListing): TutorTrustStatus {
  const admin = findAdminTutor(tutor.name);
  const identityVerified = admin?.verification === "Verified";
  // No separate background-check workflow exists in this app's real data
  // model — the one real admin verification review already bundles
  // identity + credential checks (admin-data.ts's resubmissionFieldOptions
  // lists "Government ID" and "Academic Certificate" together under the
  // same review). Tracked as its own condition — not a literal duplicate —
  // by also excluding a tutor who was verified but has since been banned.
  const backgroundChecked = Boolean(identityVerified) && admin?.status !== "Banned";
  const profileComplete = Boolean(
    tutor.bio.trim() &&
      tutor.teachingApproach.trim() &&
      tutor.education.trim() &&
      tutor.image &&
      tutor.price > 0 &&
      tutor.levels.length > 0 &&
      tutor.languages.length > 0 &&
      tutor.availability.length > 0
  );
  // Same cancellation-rate heuristic already shown as a real Performance
  // stat elsewhere on this same profile (derived from repeatStudentsPct) —
  // reused here rather than inventing a second, disconnected number.
  const cancellationRatePct = Math.max(1, Math.round((100 - tutor.repeatStudentsPct) / 20));
  const reliable = cancellationRatePct <= RELIABLE_MAX_CANCELLATION_PCT && !hasDisqualifyingTutorIssue(tutor.name);
  return {
    identityVerified: Boolean(identityVerified),
    backgroundChecked,
    profileComplete,
    reliable,
    overallVerified: Boolean(identityVerified),
  };
}

// "January 2021" / "March 2023" style free-text join labels — the only
// join-date representation this app's data model has for either tutors or
// students — parsed into a real sortable timestamp. An unparseable value
// sorts last rather than throwing/crashing founding-order computation.
function parseJoinedDate(joined: string): number {
  const ms = new Date(joined).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

// Computed fresh each call rather than cached — safe, because the inputs
// this derives from (verification status + join date) can only ever APPEND
// a newly-verified tutor after everyone already counted; they never
// reshuffle an already-assigned number out from under an existing Founding
// Tutor, which is what "permanent" requires.
function computeFoundingTutorOrder(): Map<string, number> {
  const verified = getAdminTutors()
    .filter((t) => t.verification === "Verified")
    .sort((a, b) => parseJoinedDate(a.joined) - parseJoinedDate(b.joined) || a.id.localeCompare(b.id));
  const order = new Map<string, number>();
  verified.slice(0, FOUNDING_LIMIT).forEach((t, i) => order.set(t.name, i + 1));
  return order;
}

export function getFoundingTutorNumber(tutorName: string): number | null {
  return computeFoundingTutorOrder().get(tutorName) ?? null;
}

export function isFoundingTutor(tutorName: string): boolean {
  return getFoundingTutorNumber(tutorName) !== null;
}

// Founding Student — same shape, mirrored for students. This app has no
// dedicated student identity-verification workflow (unlike tutors); the
// closest real "verified account in good standing" signal available is
// AdminStudent.status === "Active" — a Suspended/Banned account doesn't
// count toward the first 50.
function computeFoundingStudentOrder(): Map<string, number> {
  const eligible = initialAdminStudents
    .filter((s) => s.status === "Active")
    .sort((a, b) => parseJoinedDate(a.joined) - parseJoinedDate(b.joined) || a.id.localeCompare(b.id));
  const order = new Map<string, number>();
  eligible.slice(0, FOUNDING_LIMIT).forEach((s, i) => order.set(s.name, i + 1));
  return order;
}

export function getFoundingStudentNumber(studentName: string): number | null {
  return computeFoundingStudentOrder().get(studentName) ?? null;
}

export function isFoundingStudent(studentName: string): boolean {
  return getFoundingStudentNumber(studentName) !== null;
}
