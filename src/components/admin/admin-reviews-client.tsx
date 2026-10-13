"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, Flag, Search, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useReviews } from "@/hooks/use-reviews";
import { useAdminSession } from "@/hooks/use-admin-session";
import { currentActorLabel } from "@/lib/admin-session";
import { getReviewReferenceCode, resolveReviewReport } from "@/lib/reviews-store";
import { reviewStatusStyles, type Review, type ReviewDirection } from "@/lib/reviews-data";
import { cn } from "@/lib/utils";

type DirectionFilter = "All" | ReviewDirection;
type StatusFilter = "All" | "Reported" | "Removed by Admin";

const directionTabs: { key: DirectionFilter; label: string }[] = [
  { key: "All", label: "All Reviews" },
  { key: "student-to-tutor", label: "Teacher Reviews" },
  { key: "tutor-to-student", label: "Student Reviews" },
];

function reviewerTypeLabel(direction: ReviewDirection): string {
  return direction === "student-to-tutor" ? "Student" : "Tutor";
}
function recipientTypeLabel(direction: ReviewDirection): string {
  return direction === "student-to-tutor" ? "Tutor" : "Student";
}

export function AdminReviewsClient() {
  const allReviews = useReviews();
  const session = useAdminSession();
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter | "All">("All");
  const [ratingFilter, setRatingFilter] = useState<number | "All">("All");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Review | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return allReviews
      .filter((r) => directionFilter === "All" || r.direction === directionFilter)
      .filter((r) => statusFilter === "All" || r.status === statusFilter)
      .filter((r) => ratingFilter === "All" || r.rating === ratingFilter)
      .filter((r) => {
        if (!q) return true;
        return (
          r.reviewerName.toLowerCase().includes(q) ||
          r.recipientName.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          getReviewReferenceCode(r).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.submittedAtMs - a.submittedAtMs);
  }, [allReviews, directionFilter, statusFilter, ratingFilter, q]);

  const reportedCount = allReviews.filter((r) => r.status === "Reported").length;
  const removedCount = allReviews.filter((r) => r.status === "Removed by Admin").length;
  const teacherReviewCount = allReviews.filter((r) => r.direction === "student-to-tutor").length;
  const studentReviewCount = allReviews.filter((r) => r.direction === "tutor-to-student").length;

  function openView(r: Review) {
    setViewing(r);
    setNote(r.adminNote ?? "");
  }

  function handleResolve(outcome: "keep" | "remove") {
    if (!viewing) return;
    resolveReviewReport(viewing.id, currentActorLabel(), outcome, note);
    flash(outcome === "remove" ? "Review removed from public view." : "Review kept. Report dismissed.");
    setViewing(null);
  }

  const summaryCards = [
    { label: "Total Reviews", value: allReviews.length, icon: Star, tint: "bg-ensena-primary/10 text-ensena-primary" },
    { label: "Teacher Reviews", value: teacherReviewCount, icon: Star, tint: "bg-blue-100 text-blue-700" },
    { label: "Student Reviews", value: studentReviewCount, icon: Star, tint: "bg-violet-100 text-violet-700" },
    { label: "Pending Removal Requests", value: reportedCount, icon: Flag, tint: "bg-amber-100 text-amber-700" },
    { label: "Removed by Admin", value: removedCount, icon: Trash2, tint: "bg-rose-100 text-rose-700" },
  ];

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Reviews Management</h1>
        <p className="mt-1 text-sm text-ensena-muted">Every review on the platform, in both directions, plus removal requests from teachers and students.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <div className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}><c.icon className="size-4.5" /></div>
            <p className="mt-2.5 text-xl font-semibold text-ensena-ink">{c.value}</p>
            <p className="text-xs font-medium text-ensena-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          {directionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setDirectionFilter(tab.key)}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", directionFilter === tab.key ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reviewer, recipient, subject, or code…"
              className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option value="All">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Removed by Admin">Removed by Admin</option>
          </select>
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value === "All" ? "All" : Number(e.target.value))} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option value="All">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} Stars</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Review ID</th>
                <th className="py-2 pr-4 font-medium">Reviewer</th>
                <th className="py-2 pr-4 font-medium">Recipient</th>
                <th className="py-2 pr-4 font-medium">Rating</th>
                <th className="py-2 pr-4 font-medium">Booking</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4 font-mono text-xs font-semibold text-ensena-primary">{getReviewReferenceCode(r)}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ensena-ink">{r.reviewerName}</p>
                    <p className="text-xs text-ensena-muted">{reviewerTypeLabel(r.direction)}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ensena-ink">{r.recipientName}</p>
                    <p className="text-xs text-ensena-muted">{recipientTypeLabel(r.direction)}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1 text-amber-600"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {r.rating}</span>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">{r.subject} · {r.bookingType}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{r.submittedAtLabel}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", reviewStatusStyles[r.status])}>{r.status}</span></td>
                  <td className="py-3 pr-4 text-right">
                    <button type="button" onClick={() => openView(r)} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                      {r.status === "Reported" ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-ensena-muted">No reviews match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Review Details" widthClassName="max-w-lg">
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-ensena-bg-soft">
                {viewing.reviewerImage && <Image src={viewing.reviewerImage} alt={viewing.reviewerName} fill sizes="44px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{viewing.reviewerName} <span className="font-normal text-ensena-muted">({reviewerTypeLabel(viewing.direction)}) reviewed</span> {viewing.recipientName}</p>
                <p className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("size-3.5", i < viewing.rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                  ))}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", reviewStatusStyles[viewing.status])}>{viewing.status}</span>
            </div>

            <p className="rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">&ldquo;{viewing.comment}&rdquo;</p>

            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ensena-muted">Review ID</dt><dd className="font-mono font-medium text-ensena-ink">{getReviewReferenceCode(viewing)}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Booking / Class</dt><dd className="font-medium text-ensena-ink">{viewing.subject} · {viewing.bookingType}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Submitted</dt><dd className="font-medium text-ensena-ink">{viewing.submittedAtLabel}</dd></div>
              {viewing.tutorReply && <div className="flex justify-between gap-3"><dt className="shrink-0 text-ensena-muted">Tutor reply</dt><dd className="text-right font-medium text-ensena-ink">{viewing.tutorReply}</dd></div>}
            </dl>

            {viewing.reportReason && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-amber-700"><AlertTriangle className="size-4" /> Report Reason: {viewing.reportReason}</p>
                {viewing.reportDetails && <p className="mt-1 text-amber-700/90">{viewing.reportDetails}</p>}
                {viewing.reportedAtLabel && <p className="mt-1 text-xs text-amber-700/70">Reported {viewing.reportedAtLabel}</p>}
              </div>
            )}

            {viewing.resolvedBy && (
              <p className="text-xs text-ensena-muted">Resolved by {viewing.resolvedBy} · {viewing.resolvedAtLabel}</p>
            )}

            {session.role === "Super Admin" ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Admin note (internal)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleResolve("keep")} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">
                    <CheckCircle2 className="size-4" /> Keep Review
                  </Button>
                  <Button onClick={() => handleResolve("remove")} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
                    <Trash2 className="size-4" /> Remove Review
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-ensena-muted">Only a Super Admin can keep, remove, or annotate a review.</p>
            )}
          </div>
        )}
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
