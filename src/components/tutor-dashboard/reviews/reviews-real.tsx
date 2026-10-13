"use client";

import { useState } from "react";
import { Flag, Send, Star } from "lucide-react";
import { toast } from "sonner";

import { ReportReviewModal } from "@/components/shared/reviews/report-review-modal";
import { PersonAvatar } from "@/components/student-dashboard/live/live-shared";
import { Button } from "@/components/ui/button";
import { replyToStudentReview, reportStudentReview } from "@/lib/actions/tutor-settings";
import type { TutorReviewRow } from "@/lib/tutor-settings-server";
import { cn } from "@/lib/utils";

const ratingFilters = [5, 4, 3, 2, 1] as const;

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn(className ?? "size-3.5", i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
      ))}
    </span>
  );
}

// Reviews students left for this tutor, from the database. A tutor can
// reply publicly once (editable) or report a review to Admin, but never
// edit, hide or delete it.
export function ReviewsReal({ reviews: initial }: { reviews: TutorReviewRow[] }) {
  const [reviews, setReviews] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setReviews(initial);
  }
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const filtered = ratingFilter ? reviews.filter((r) => r.rating === ratingFilter) : reviews;

  async function submitReply(id: string) {
    const text = drafts[id]?.trim();
    if (!text) return;
    setSavingId(id);
    const result = await replyToStudentReview(id, text);
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't post your reply.");
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: text } : r)));
    setDrafts((d) => ({ ...d, [id]: "" }));
    setEditingId(null);
    toast.success("Reply posted — students see it under this review on your profile.");
  }

  async function submitReport(reason: string, details: string) {
    const id = reportingId;
    if (!id) return;
    setReportingId(null);
    const result = await reportStudentReview(id, reason, details);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't send your report.");
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reported: true } : r)));
    toast.success("Your report has been sent to Admin. The review stays visible while it's checked.");
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ensena-muted">See what your students are saying about your lessons.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-center lg:self-start">
          <p className="font-heading text-4xl font-semibold text-ensena-ink">{reviews.length ? avg.toFixed(1) : "–"}</p>
          <div className="mt-1 flex justify-center">
            <Stars rating={avg} className="size-4" />
          </div>
          <p className="mt-1 text-xs text-ensena-muted">
            {reviews.length ? `Based on ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No reviews yet"}
          </p>
          <div className="mt-4 flex flex-col gap-1.5 text-left">
            {ratingFilters.map((star) => {
              const count = breakdown[star];
              const pct = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <button
                  key={star}
                  type="button"
                  disabled={count === 0 && ratingFilter !== star}
                  onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  aria-pressed={ratingFilter === star}
                  className={cn("flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs disabled:cursor-default", ratingFilter === star && "bg-ensena-bg-soft")}
                >
                  <span className="w-12 shrink-0 text-ensena-muted">{star} star{star === 1 ? "" : "s"}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-ensena-muted">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">
              {ratingFilter ? `${ratingFilter}-star reviews` : "All reviews"} ({filtered.length})
            </h2>
            {ratingFilter && (
              <button type="button" onClick={() => setRatingFilter(null)} className="text-xs font-medium text-ensena-primary hover:underline">
                Clear filter
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 rounded-xl bg-ensena-bg-soft px-4 py-8 text-center text-sm text-ensena-muted">
              {reviews.length === 0 ? "No reviews yet. Students can review you after a completed lesson." : "No reviews match this filter."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-ensena-border">
              {filtered.map((r) => {
                const editing = editingId === r.id || !r.reply;
                return (
                  <li key={r.id} className="flex flex-col gap-2 py-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      <PersonAvatar name={r.reviewerName} image={r.reviewerImage} className="size-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ensena-ink">{r.reviewerName}</p>
                          <p className="text-xs text-ensena-muted">{new Date(r.createdAtMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Stars rating={r.rating} />
                          {r.bookingType && <span className="text-[11px] capitalize text-ensena-muted">{r.bookingType} lesson</span>}
                        </div>
                        {r.comment && <p className="mt-1.5 text-sm text-ensena-ink">{r.comment}</p>}
                      </div>
                    </div>

                    <div className="pl-12">
                      {r.reply && !editing ? (
                        <div className="rounded-lg bg-ensena-bg-soft p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-ensena-ink">Your reply</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r.id);
                                setDrafts((d) => ({ ...d, [r.id]: r.reply ?? "" }));
                              }}
                              className="text-xs font-medium text-ensena-primary hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="mt-0.5 text-ensena-muted">{r.reply}</p>
                        </div>
                      ) : (
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void submitReply(r.id);
                          }}
                        >
                          <input
                            value={drafts[r.id] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value.slice(0, 1000) }))}
                            placeholder="Write a public reply…"
                            className="h-9 min-w-0 flex-1 rounded-full border border-ensena-border px-3 text-xs"
                          />
                          <Button type="submit" loading={savingId === r.id} disabled={!drafts[r.id]?.trim()} className="h-9 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white disabled:opacity-50">
                            <Send className="size-3.5" /> Reply
                          </Button>
                          {r.reply && (
                            <button type="button" onClick={() => setEditingId(null)} className="text-xs text-ensena-muted hover:underline">
                              Cancel
                            </button>
                          )}
                        </form>
                      )}
                      <div className="mt-2">
                        {r.reported ? (
                          <span className="text-[11px] font-medium text-amber-600">Reported — Admin is reviewing it</span>
                        ) : (
                          <button type="button" onClick={() => setReportingId(r.id)} className="flex items-center gap-1 text-[11px] font-medium text-ensena-muted hover:text-rose-600">
                            <Flag className="size-3" /> Report review
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ReportReviewModal open={!!reportingId} onClose={() => setReportingId(null)} onSubmit={(reason, details) => void submitReport(reason, details)} />
    </div>
  );
}
