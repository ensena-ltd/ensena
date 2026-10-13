"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";

import { useReviews } from "@/hooks/use-reviews";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useTodayISO } from "@/hooks/use-today-iso";
import {
  buildGroupClassCohorts,
  buildGroupClassSessions,
  dashboardTutor,
  initialMyGroupClasses,
} from "@/lib/tutor-dashboard-data";

// Reviews only apply to Private and Group classes — Discovery Sessions are
// never counted here (same exclusion as everywhere else in the review
// system). Dismissing only hides the banner for this view; the underlying
// pending count (driven by the real reviews store) is untouched, so it
// reappears next visit until the tutor actually reviews or the count changes.
export function TutorPendingReviewsBanner() {
  const todayISO = useTodayISO();
  const privateLessons = usePrivateLessons();
  const allReviews = useReviews();
  const [dismissed, setDismissed] = useState(false);

  function isReviewed(bookingId: string, student: string): boolean {
    return allReviews.some((r) => r.direction === "tutor-to-student" && r.bookingId === bookingId && r.reviewerName === dashboardTutor.name && r.recipientName === student);
  }

  const pending = useMemo(() => {
    let count = 0;
    privateLessons
      .filter((l) => l.status === "Completed")
      .forEach((l) => {
        if (!isReviewed(l.id, l.student)) count += 1;
      });

    for (const groupClass of initialMyGroupClasses) {
      const cohorts = buildGroupClassCohorts(todayISO)[groupClass.id];
      const current = cohorts?.currentCohort ?? null;
      if (!current) continue;
      const sessions = buildGroupClassSessions(groupClass, current, todayISO);
      if (!sessions.some((s) => s.status === "Completed")) continue;
      const roster = groupClass.students.slice(0, current.seatsFilled);
      roster.forEach((s) => {
        if (!isReviewed(groupClass.id, s.name)) count += 1;
      });
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allReviews/isReviewed intentionally re-derive from the same subscribed snapshot each render
  }, [privateLessons, allReviews, todayISO]);

  if (pending === 0 || dismissed) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Star className="size-5 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-medium text-ensena-ink">
        You have {pending} student {pending === 1 ? "review" : "reviews"} pending.
      </p>
      <Link
        href="/tutor-dashboard/private-lessons?tab=Lessons&subtab=Completed&focus=reviews"
        className="shrink-0 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Review Now
      </Link>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
