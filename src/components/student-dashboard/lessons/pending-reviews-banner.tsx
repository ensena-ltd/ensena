"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";

import { completionStatus, useEscrowConfirmFlow } from "@/hooks/use-escrow-confirm-flow";
import { useReviews } from "@/hooks/use-reviews";
import { dashboardStudent, studentLessons } from "@/lib/student-dashboard-data";

// Reviews only apply to Private and Group classes — Discovery Sessions
// never contribute to this count (see reviews-store.ts/completed-classes-
// client.tsx, the same exclusion). Dismissing this banner only hides it for
// the current view; it doesn't touch the underlying hasReviewed() state, so
// it reappears next visit until the student actually reviews or the count
// changes.
export function PendingReviewsBanner() {
  const { myConfirmations } = useEscrowConfirmFlow();
  const allReviews = useReviews();
  const [dismissed, setDismissed] = useState(false);

  function isReviewed(bookingId: string, tutor: string): boolean {
    return allReviews.some((r) => r.direction === "student-to-tutor" && r.bookingId === bookingId && r.reviewerName === dashboardStudent.name && r.recipientName === tutor);
  }

  let pending = 0;
  myConfirmations.forEach((l) => {
    if (completionStatus(l).action !== "view") return;
    if (!isReviewed(l.id, l.tutor)) pending += 1;
  });
  studentLessons
    .filter((l) => l.status === "Completed")
    .forEach((l) => {
      if (!isReviewed(l.id, l.tutor)) pending += 1;
    });

  if (pending === 0 || dismissed) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Star className="size-5 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-medium text-ensena-ink">
        You have {pending} {pending === 1 ? "review" : "reviews"} pending. Let your tutor{pending === 1 ? "" : "s"} know how your {pending === 1 ? "class" : "classes"} went.
      </p>
      <Link href="/student-dashboard/lessons/completed" className="shrink-0 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
        Review Now
      </Link>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
