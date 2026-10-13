"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ShieldCheck, Star } from "lucide-react";

import { useTutorAllReviews, useTutorReviewSummary } from "@/hooks/use-reviews";
import { qualificationLine } from "@/lib/academic-matching";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import type { TutorListing } from "@/lib/tutors";

// Same Load More convention as class-list-page-shell.tsx (student
// dashboard) — this app never paginates via numbered pages, always
// "Showing X of Y" + a Load More button, so a tutor with 100+ reviews stays
// just as usable as one with 3.
const PAGE_SIZE = 10;

export function TutorReviewsClient({ tutor }: { tutor: TutorListing }) {
  const reviewSummary = useTutorReviewSummary(tutor.name, tutor.rating, tutor.reviews, tutor.ratingBreakdown);
  const allReviews = useTutorAllReviews(tutor);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = allReviews.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-[840px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href={`/find-teachers/${tutor.slug}`}
        className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
      >
        <ChevronLeft className="size-4" /> Back to {tutor.name.split(" ")[0]}&apos;s profile
      </Link>

      {/* Teacher identification */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-ensena-border p-5">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
          <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="64px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="font-heading text-lg font-semibold text-ensena-ink">{tutor.name}</h1>
            {isTutorVerifiedByName(tutor.name) && <BadgeCheck className="size-4 shrink-0 text-ensena-primary" aria-label="Verified tutor" />}
          </div>
          <p className="truncate text-sm text-ensena-muted">{qualificationLine(tutor) ?? tutor.subjectTitle}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{reviewSummary.rating}</span>
            <span className="text-ensena-muted">({reviewSummary.reviews} reviews)</span>
            {isTutorVerifiedByName(tutor.name) && (
              <>
                <span className="text-ensena-border">·</span>
                <span className="flex items-center gap-1 text-ensena-success">
                  <ShieldCheck className="size-3.5" /> Verified Teacher
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Reviews summary — same rating/breakdown block as the profile page */}
      <div className="mt-6 rounded-2xl border border-ensena-border p-6">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Reviews</h2>
        <div className="mt-2 flex items-center gap-2">
          <p className="font-heading text-3xl font-semibold text-ensena-ink">{reviewSummary.rating}</p>
          <div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs text-ensena-muted">Based on {reviewSummary.reviews} reviews</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = reviewSummary.breakdown[star];
            const pct = reviewSummary.reviews > 0 ? (count / reviewSummary.reviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs text-ensena-muted">
                <span className="w-8 shrink-0">{star} ★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual reviews */}
      <div className="mt-6 flex flex-col gap-4">
        {visible.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ensena-border p-10 text-center text-sm text-ensena-muted">
            {tutor.name.split(" ")[0]} doesn&apos;t have any reviews yet.
          </p>
        )}
        {visible.map((review) => (
          <div key={review.id} className="rounded-2xl border border-ensena-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                {review.dateLabel && <span className="text-xs text-ensena-muted">{review.dateLabel}</span>}
              </div>
            </div>
            <p className="mt-2 text-sm text-ensena-muted">{review.comment}</p>
          </div>
        ))}
      </div>

      {allReviews.length > 0 && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-ensena-muted">
            Showing {visible.length} of {allReviews.length} reviews
          </p>
          {visible.length < allReviews.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="h-10 rounded-full border border-ensena-border px-6 text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
