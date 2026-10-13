"use client";

import { useMemo, useState } from "react";
import { Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { ReportReviewModal } from "@/components/shared/reviews/report-review-modal";
import { useReviews } from "@/hooks/use-reviews";
import { getReviewReferenceCode, replyToReview, reportReview } from "@/lib/reviews-store";
import { dashboardTutor, reviewKeywords } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const ratingFilters = [5, 4, 3, 2, 1] as const;

// Reviews a student leaves for this tutor are permanent from here on — a
// tutor can reply publicly, or report a review to Admin, but can never
// edit, hide, or delete it (see review-card.tsx / report-review-modal.tsx,
// shared with the Student Dashboard's identical rules in the other
// direction).
export function ReviewsClient() {
  const allReviews = useReviews();
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  const reviews = useMemo(
    () => allReviews.filter((r) => r.direction === "student-to-tutor" && r.recipientName === dashboardTutor.name && r.status !== "Removed by Admin"),
    [allReviews]
  );

  const breakdown = useMemo(() => {
    const map: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) map[r.rating]++;
    return map;
  }, [reviews]);

  const filtered = ratingFilter ? reviews.filter((r) => r.rating === ratingFilter) : reviews;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : dashboardTutor.rating;

  function submitReply(id: string) {
    const text = replyDrafts[id];
    if (!text?.trim()) return;
    replyToReview(id, text);
    setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
  }

  function submitReport(reason: string, details: string) {
    if (!reportingId) return;
    reportReview(reportingId, dashboardTutor.name, reason, details);
    setReportingId(null);
    flash("Your report has been sent to Admin. The review remains visible while it's reviewed.");
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ensena-muted">See what your students are saying about your lessons.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-center">
            <p className="font-heading text-4xl font-semibold text-ensena-ink">{avgRating.toFixed(2)}</p>
            <div className="mt-1 flex items-center justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-1 text-xs text-ensena-muted">Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}</p>

            <div className="mt-4 flex flex-col gap-1.5 text-left">
              {ratingFilters.map((star) => {
                const count = breakdown[star];
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs",
                      ratingFilter === star && "bg-ensena-bg-soft"
                    )}
                  >
                    <span className="w-10 shrink-0 text-ensena-muted">{star} Stars</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-4 shrink-0 text-right text-ensena-muted">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Most Common Keywords</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {reviewKeywords.map((k) => (
                <span key={k} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Reviews ({filtered.length})</h2>
            {ratingFilter && (
              <button type="button" onClick={() => setRatingFilter(null)} className="text-xs font-medium text-ensena-primary hover:underline">
                Clear filter
              </button>
            )}
          </div>
          <ul className="mt-4 flex flex-col gap-4">
            {filtered.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} onReport={() => setReportingId(r.id)}>
                  {r.tutorReply ? (
                    <div className="rounded-lg bg-ensena-bg-soft p-3 text-sm">
                      <p className="text-xs font-semibold text-ensena-ink">Your reply</p>
                      <p className="text-ensena-muted">{r.tutorReply}</p>
                    </div>
                  ) : (
                    r.status === "Published" && (
                      <div className="flex items-center gap-2">
                        <input
                          value={replyDrafts[r.id] ?? ""}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Write a reply…"
                          className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-xs"
                        />
                        <Button onClick={() => submitReply(r.id)} className="h-9 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                          <Send className="size-3.5" /> Reply
                        </Button>
                      </div>
                    )
                  )}
                  <p className="mt-2 font-mono text-[11px] text-ensena-muted">{getReviewReferenceCode(r)}</p>
                </ReviewCard>
              </li>
            ))}
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">{reviews.length === 0 ? "No reviews yet." : "No reviews match this filter."}</p>}
          </ul>
        </div>
      </div>

      <ReportReviewModal open={!!reportingId} onClose={() => setReportingId(null)} onSubmit={submitReport} />

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
