"use client";

import Image from "next/image";
import { AlertTriangle, Flag, Star } from "lucide-react";

import type { Review } from "@/lib/reviews-data";
import { cn } from "@/lib/utils";

// One shared review row for both the Tutor Dashboard ("reviews I received")
// and the Student Dashboard ("reviews I received") — same component, same
// rules (no edit/delete, only a "Report to Admin" action), since the
// underlying record and permissions are identical in both directions.
export function ReviewCard({
  review,
  onReport,
  children,
}: {
  review: Review;
  onReport?: () => void;
  children?: React.ReactNode;
}) {
  const isRemoved = review.status === "Removed by Admin";
  const isReported = review.status === "Reported";

  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-4", isRemoved && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-ensena-bg-soft">
          {review.reviewerImage && <Image src={review.reviewerImage} alt={review.reviewerName} fill sizes="44px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
            <span className="text-xs text-ensena-muted">{review.submittedAtLabel}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("size-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
            ))}
            <span className="ml-1 text-xs text-ensena-muted">{review.subject} · {review.bookingType === "Discovery" ? "Discovery Session" : `${review.bookingType} Lesson`}</span>
          </div>
          {isRemoved ? (
            <p className="mt-2 text-sm italic text-ensena-muted">This review was removed by Ensena Admin.</p>
          ) : (
            <p className="mt-2 text-sm text-ensena-ink">{review.comment}</p>
          )}
          {isReported && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="size-3.5" /> Reported: under review by Admin
            </p>
          )}
        </div>
      </div>

      {children && <div className="mt-3 border-t border-ensena-border pt-3">{children}</div>}

      {onReport && !isRemoved && !isReported && (
        <button
          type="button"
          onClick={onReport}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ensena-muted hover:text-rose-600"
        >
          <Flag className="size-3.5" /> Report / Contact Admin About This Review
        </button>
      )}
    </div>
  );
}
