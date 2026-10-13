"use client";

import { useMemo, useSyncExternalStore } from "react";

import { computeEffectiveRatingBreakdown, computeEffectiveTutorRating, getRealTutorReviews, getReviews, subscribeReviews } from "@/lib/reviews-store";
import { seedReviews, type Review } from "@/lib/reviews-data";
import type { TutorListing } from "@/lib/tutors";

// Server snapshot pinned to the literal seed array — same hydration-safety
// reasoning as every other store hook in this app.
function getServerSnapshot(): Review[] {
  return seedReviews;
}

export function useReviews(): Review[] {
  return useSyncExternalStore(subscribeReviews, getReviews, getServerSnapshot);
}

// The rating/review-count badge shown across the app (tutor cards, profile
// pages, dashboards) — blends a tutor's static seed rating with any real
// reviews submitted since, and re-renders live whenever a review is
// submitted, reported, or removed anywhere in the app.
export function useTutorRating(tutorName: string, baseRating: number, baseReviewCount: number): { rating: number; reviews: number } {
  const reviews = useReviews(); // subscribes this component to review changes
  return useMemo(() => computeEffectiveTutorRating(tutorName, baseRating, baseReviewCount), [reviews, tutorName, baseRating, baseReviewCount]);
}

// For the public tutor profile page — the rating, review count, per-star
// breakdown, and the real reviews themselves, all kept in sync with the
// live store.
export function useTutorReviewSummary(
  tutorName: string,
  baseRating: number,
  baseReviewCount: number,
  baseBreakdown: Record<1 | 2 | 3 | 4 | 5, number>
) {
  const reviews = useReviews();
  return useMemo(
    () => ({
      ...computeEffectiveTutorRating(tutorName, baseRating, baseReviewCount),
      breakdown: computeEffectiveRatingBreakdown(tutorName, baseBreakdown),
      realReviews: getRealTutorReviews(tutorName),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviews, tutorName, baseRating, baseReviewCount, baseBreakdown]
  );
}

// One combined, display-ready review shape for a tutor's reviews UI (the
// profile preview card AND the dedicated /reviews page both render this same
// list, so neither can ever show a different set of reviews than the
// other). Blends the two review sources the profile already reads —
// genuinely-submitted reviews from reviews-store.ts (real id, rating,
// comment, submission date) and the tutor's pre-existing static
// tutors.ts#reviewList entries (no date — never fabricated). Real reviews
// come first (newest first, matching getRealTutorReviews), then the static
// ones, matching the order the profile page already rendered them in before
// this hook existed.
export interface DisplayReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  dateLabel: string | null;
}

export function useTutorAllReviews(tutor: TutorListing): DisplayReview[] {
  const reviews = useReviews();
  return useMemo(() => {
    const real: DisplayReview[] = getRealTutorReviews(tutor.name).map((r) => ({
      id: r.id,
      reviewerName: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      dateLabel: r.submittedAtLabel,
    }));
    const legacy: DisplayReview[] = tutor.reviewList.map((r, i) => ({
      id: `legacy-${tutor.slug}-${i}`,
      reviewerName: r.name,
      rating: r.stars,
      comment: r.text,
      dateLabel: null,
    }));
    return [...real, ...legacy];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, tutor]);
}
