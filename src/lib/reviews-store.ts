// Real, persisted, bidirectional reviews — localStorage-backed, same idiom
// as escrow-store.ts. This is the ONE place a review is created, reported,
// or resolved; the Tutor Dashboard, Student Dashboard, and Admin Dashboard
// all read from here, so a review submitted on one side is immediately
// visible everywhere else, and there is exactly one true state per review
// rather than three independently-mutated local copies.
import { logAdminAction } from "@/lib/admin-audit-log";
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import { buildRestrictionMessage, isRestricted, recordViolation, type ActorRole } from "@/lib/moderation-store";
import { issueOrGetReferenceCode } from "@/lib/reference-code-store";
import { reportReasons, seedReviews, type Review, type ReviewDirection } from "@/lib/reviews-data";

const REVIEWS_KEY = "ensena_reviews";
export const REVIEWS_EVENT = "ensena:reviews-changed";

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

const readReviewsRaw = makeCachedReader<Review[]>(REVIEWS_KEY, seedReviews);

function writeJson(value: Review[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(REVIEWS_EVENT));
}

export function getReviews(): Review[] {
  return readReviewsRaw();
}

export function getReviewReferenceCode(review: Review): string {
  return issueOrGetReferenceCode("review", review.id);
}

// Blends a tutor's pre-existing seed rating/review-count (the "historical"
// number baked into tutors.ts long before this store existed) with any real
// reviews submitted since — so a newly-submitted review actually moves the
// number shown across the app instead of every rating badge staying frozen
// at its static seed value forever. If there are no real reviews yet for
// this tutor, the seed value passes through unchanged.
export function computeEffectiveTutorRating(
  tutorName: string,
  baseRating: number,
  baseReviewCount: number
): { rating: number; reviews: number } {
  const real = readReviewsRaw().filter((r) => r.direction === "student-to-tutor" && r.recipientName === tutorName && r.status !== "Removed by Admin");
  if (real.length === 0) return { rating: baseRating, reviews: baseReviewCount };
  const baseSum = baseRating * baseReviewCount;
  const realSum = real.reduce((sum, r) => sum + r.rating, 0);
  const totalCount = baseReviewCount + real.length;
  const avg = totalCount > 0 ? (baseSum + realSum) / totalCount : baseRating;
  return { rating: Math.round(avg * 100) / 100, reviews: totalCount };
}

// Real reviews for a tutor, newest first — used anywhere a full review list
// (not just the aggregate rating) needs to include genuinely-submitted
// reviews alongside a tutor's pre-existing static ones.
export function getRealTutorReviews(tutorName: string): Review[] {
  return readReviewsRaw()
    .filter((r) => r.direction === "student-to-tutor" && r.recipientName === tutorName && r.status !== "Removed by Admin")
    .sort((a, b) => b.submittedAtMs - a.submittedAtMs);
}

// Same blending as computeEffectiveTutorRating, but also folds real reviews
// into a 1-5 star histogram — for surfaces (like the public tutor profile)
// that show a per-star breakdown bar, not just a single average.
export function computeEffectiveRatingBreakdown(
  tutorName: string,
  baseBreakdown: Record<1 | 2 | 3 | 4 | 5, number>
): Record<1 | 2 | 3 | 4 | 5, number> {
  const real = getRealTutorReviews(tutorName);
  if (real.length === 0) return baseBreakdown;
  const next = { ...baseBreakdown };
  for (const r of real) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    next[star] += 1;
  }
  return next;
}

// A reviewer may only review the same booking + recipient, in the same
// direction, once — the dedup key is class + reviewer + reviewee, not just
// class + reviewer. That distinction matters for a Group Class: the same
// tutor (one reviewerName) reviews several different students under the
// SAME bookingId (the group session), so recipientName has to be part of
// the key or the tutor's first student review would wrongly block every
// subsequent one for that same session.
export function hasReviewed(direction: ReviewDirection, bookingId: string, reviewerName: string, recipientName: string): boolean {
  return readReviewsRaw().some(
    (r) => r.direction === direction && r.bookingId === bookingId && r.reviewerName === reviewerName && r.recipientName === recipientName
  );
}

export function findReview(direction: ReviewDirection, bookingId: string, reviewerName: string, recipientName: string): Review | undefined {
  return readReviewsRaw().find(
    (r) => r.direction === direction && r.bookingId === bookingId && r.reviewerName === reviewerName && r.recipientName === recipientName
  );
}

export interface SubmitReviewInput {
  direction: ReviewDirection;
  reviewerName: string;
  reviewerImage?: string;
  recipientName: string;
  recipientImage?: string;
  bookingId: string;
  bookingType: "Private" | "Group" | "Discovery";
  subject: string;
  rating: number;
  comment: string;
}

export type SubmitReviewResult =
  | { ok: true; review: Review }
  | { ok: false; reason: "already-reviewed" | "invalid-rating" }
  | { ok: false; reason: "blocked" | "restricted"; userMessage: string };

// Reviews are only ever created here — never generated in a component's
// local state — so every dashboard that reads getReviews() immediately
// sees it, and there is nowhere else a "second" review record could exist.
// The comment field is free-typed text a reviewer controls, so it goes
// through the same Communication Safety engine as messages — a review is a
// perfectly viable channel for "WhatsApp him at..." otherwise.
export function submitReview(input: SubmitReviewInput): SubmitReviewResult {
  if (input.rating < 1 || input.rating > 5) return { ok: false, reason: "invalid-rating" };
  if (hasReviewed(input.direction, input.bookingId, input.reviewerName, input.recipientName)) return { ok: false, reason: "already-reviewed" };

  const reviewerRole: ActorRole = input.direction === "student-to-tutor" ? "Student" : "Tutor";
  if (isRestricted(input.reviewerName, reviewerRole, "messaging")) {
    return { ok: false, reason: "restricted", userMessage: buildRestrictionMessage(input.reviewerName, reviewerRole) };
  }
  const analysis = analyzeCommunication(input.comment);
  if (analysis.verdict === "block" && analysis.primary) {
    recordViolation(input.reviewerName, reviewerRole, analysis.primary.category, analysis.primary.confidence, "Review", { evidence: input.comment });
    return { ok: false, reason: "blocked", userMessage: BLOCKED_MESSAGE_COPY };
  }

  const now = Date.now();
  const review: Review = {
    id: `rev-${now}-${Math.random().toString(36).slice(2, 7)}`,
    direction: input.direction,
    reviewerName: input.reviewerName,
    reviewerImage: input.reviewerImage,
    recipientName: input.recipientName,
    recipientImage: input.recipientImage,
    bookingId: input.bookingId,
    bookingType: input.bookingType,
    subject: input.subject,
    rating: input.rating,
    comment: input.comment.trim(),
    submittedAtMs: now,
    submittedAtLabel: new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: "Published",
  };
  writeJson([review, ...readReviewsRaw()]);
  logAdminAction(
    input.direction === "student-to-tutor" ? "Student submitted tutor review" : "Tutor submitted student review",
    input.reviewerName,
    `${input.recipientName} · ${input.subject} (${input.rating}★)`
  );
  return { ok: true, review };
}

// The recipient reporting a review to Admin — this NEVER removes or hides
// the review itself (reviews are permanent from the submitter's side); it
// only raises a request Admin can act on.
export function reportReview(id: string, actor: string, reason: string, details: string): void {
  const now = Date.now();
  writeJson(
    readReviewsRaw().map((r) =>
      r.id === id
        ? { ...r, status: "Reported" as const, reportReason: reason, reportDetails: details, reportedAtLabel: new Date(now).toLocaleString() }
        : r
    )
  );
  logAdminAction("Reported a review", actor, `Review ${id}: ${reason}`);
}

// The only two outcomes Admin has: keep it published, or remove it (status
// change only — the record itself is preserved for the audit trail, never
// hard-deleted, per "prefer Published / Reported / Removed by Admin").
export function resolveReviewReport(id: string, actor: string, outcome: "keep" | "remove", note?: string): void {
  const review = readReviewsRaw().find((r) => r.id === id);
  if (!review) return;
  const now = Date.now();
  writeJson(
    readReviewsRaw().map((r) =>
      r.id === id
        ? {
            ...r,
            status: outcome === "remove" ? ("Removed by Admin" as const) : ("Published" as const),
            adminNote: note?.trim() || r.adminNote,
            resolvedBy: actor,
            resolvedAtLabel: new Date(now).toLocaleString(),
          }
        : r
    )
  );
  logAdminAction(
    outcome === "remove" ? "Removed review" : "Kept review (dismissed report)",
    actor,
    `Review ${id} (${review.reviewerName} → ${review.recipientName})${note ? `: ${note}` : ""}`
  );
}

// A tutor publicly replying to a student's review — never touches the
// review's own rating/comment/status.
export function replyToReview(id: string, reply: string): void {
  writeJson(readReviewsRaw().map((r) => (r.id === id ? { ...r, tutorReply: reply.trim() } : r)));
}

// Admin can also add an internal note without changing the outcome (e.g.
// while still investigating).
export function addAdminNote(id: string, actor: string, note: string): void {
  writeJson(readReviewsRaw().map((r) => (r.id === id ? { ...r, adminNote: note.trim() } : r)));
  logAdminAction("Added admin note to review", actor, `Review ${id}`);
}

export function subscribeReviews(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REVIEWS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(REVIEWS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export { reportReasons };
export type { Review, ReviewDirection } from "@/lib/reviews-data";
