"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, History, MessageSquareWarning, PauseCircle, RotateCcw, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatNaira } from "@/lib/format";
import { disputeReasons, formatCountdown, type ConfirmationStatus } from "@/lib/escrow-release";
import { currentActorLabel } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

const statusStyles: Record<ConfirmationStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-emerald-100 text-emerald-700",
  Disputed: "bg-rose-100 text-rose-700",
};

const viewTabs = ["Private Lessons", "Group Classes"] as const;
type ViewTab = (typeof viewTabs)[number];

const actionStyles: Record<string, string> = {
  "Student Confirmed": "bg-emerald-100 text-emerald-700",
  "Auto Released": "bg-emerald-100 text-emerald-700",
  "Auto-Verified & Released": "bg-emerald-100 text-emerald-700",
  "Dispute Opened": "bg-rose-100 text-rose-700",
  "Complaint Filed": "bg-amber-100 text-amber-700",
  Refund: "bg-rose-100 text-rose-700",
  "Admin Release": "bg-emerald-100 text-emerald-700",
  "Admin Refund": "bg-rose-100 text-rose-700",
  "Admin Froze Escrow": "bg-amber-100 text-amber-700",
};

export function AdminLessonConfirmationsClient() {
  const router = useRouter();
  const { lessons, auditLog, nowMs, adminRelease, adminFreeze, adminRefund, openDispute } = useLessonConfirmations();
  const [view, setView] = useState<ViewTab>("Private Lessons");
  const [query, setQuery] = useState("");
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [reason, setReason] = useState(disputeReasons[0]);
  const [details, setDetails] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);

  function openLesson(id: string, e: React.MouseEvent) {
    const href = `/admin/lesson-confirmations/${id}`;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  }

  function lessonLabel(lessonId: string) {
    const l = lessons.find((x) => x.id === lessonId);
    return l ? `${l.student} · ${l.subject}` : lessonId;
  }

  const typed = lessons.filter((l) => (view === "Private Lessons" ? l.type === "Private" : l.type === "Group"));
  const filtered = typed.filter((l) => {
    const matchesQuery =
      query.trim() === "" ||
      l.student.toLowerCase().includes(query.toLowerCase()) ||
      l.tutor.toLowerCase().includes(query.toLowerCase()) ||
      l.subject.toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  });

  const counts = {
    Pending: typed.filter((l) => l.confirmationStatus === "Pending").length,
    Disputed: typed.filter((l) => l.confirmationStatus === "Disputed").length,
    Released: typed.filter((l) => l.escrowStatus === "Released").length,
    Held: typed.reduce((sum, l) => (l.escrowStatus === "Held" || l.escrowStatus === "Frozen" ? sum + l.amountGross : sum), 0),
    Complaints: typed.filter((l) => l.complaintFiled).length,
  };

  function submitDispute() {
    if (!disputingId) return;
    openDispute(disputingId, currentActorLabel(), reason, details);
    setDisputingId(null);
    setDetails("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Lesson Confirmations</h1>
          <p className="mt-1 text-sm text-ensena-muted">Monitor and manage escrow releases across the platform.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAuditLog((v) => !v)}
          className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
        >
          <History className="size-4" /> {showAuditLog ? "Hide" : "View"} Audit Log ({auditLog.length})
        </Button>
      </div>

      {showAuditLog && (
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Audit Log</h2>
          <p className="text-xs text-ensena-muted">Every escrow action, recorded with actor and timestamp.</p>
          {auditLog.length === 0 ? (
            <p className="py-8 text-center text-sm text-ensena-muted">No actions recorded yet this session. Release, dispute, freeze, or refund a lesson to see it logged here.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {auditLog.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ensena-border p-3.5 text-sm">
                  <div>
                    <p className="font-medium text-ensena-ink">{lessonLabel(entry.lessonId)}</p>
                    <p className="text-xs text-ensena-muted">
                      by {entry.actor} · {entry.time}
                      {entry.reason && <> · {entry.reason}</>}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", actionStyles[entry.action] ?? "bg-ensena-bg-soft text-ensena-ink")}>
                    {entry.action}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm w-fit">
        {viewTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setView(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium",
              view === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">{view === "Private Lessons" ? "Pending Confirmation" : "Held for Review"}</p>
          <p className="text-xl font-semibold text-amber-600">{counts.Pending}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Disputed</p>
          <p className="text-xl font-semibold text-rose-600">{counts.Disputed}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Released</p>
          <p className="text-xl font-semibold text-ensena-success">{counts.Released}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Held in Escrow</p>
          <p className="text-xl font-semibold text-ensena-ink">{formatNaira(counts.Held)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Complaints Flagged</p>
          <p className="text-xl font-semibold text-amber-600">{counts.Complaints}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ensena-muted">
            {view === "Private Lessons"
              ? "Student confirms, or payment auto-releases 24 hours after the lesson."
              : "Payment releases automatically once attendance is verified. No student confirmation required."}
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, tutor, or subject…"
              className="h-10 w-64 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 font-medium">Lesson</th>
                <th className="py-2 pr-4 font-medium">Completed</th>
                <th className="py-2 pr-4 font-medium">{view === "Private Lessons" ? "Countdown" : "Attendance / Health Score"}</th>
                <th className="py-2 pr-4 font-medium">Escrow</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const msRemaining = l.autoReleaseAt - nowMs;
                return (
                  <tr key={l.id} onClick={(e) => openLesson(l.id, e)} className="cursor-pointer border-b border-ensena-border last:border-0 align-top hover:bg-ensena-bg-soft">
                    <td className="py-3 pr-4 font-medium text-ensena-ink">
                      <span className="flex items-center gap-1.5">
                        {l.student}
                        {l.complaintFiled && (
                          <span title="Complaint filed">
                            <MessageSquareWarning className="size-3.5 text-amber-600" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ensena-ink">{l.tutor}</td>
                    <td className="py-3 pr-4">
                      <p className="text-ensena-ink">{l.subject}</p>
                      <p className="text-xs text-ensena-muted">{l.type} · {formatNaira(l.amountGross)}</p>
                    </td>
                    <td className="py-3 pr-4 text-ensena-muted">{new Date(l.completedAt).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-ensena-muted">
                      {view === "Private Lessons" ? (
                        l.confirmationStatus === "Pending" ? formatCountdown(msRemaining) : "N/A"
                      ) : l.attendance ? (
                        <span className={cn("font-medium", l.attendance.present ? "text-ensena-ink" : "text-rose-600")}>
                          {l.attendance.attendancePct}% · Score {l.attendance.healthScore}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          l.escrowStatus === "Held" ? "bg-amber-100 text-amber-700" : l.escrowStatus === "Released" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {l.escrowStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[l.confirmationStatus])}>
                        {l.confirmationStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {l.escrowStatus !== "Released" && (
                          <button
                            type="button"
                            title="Release Payment"
                            onClick={() => adminRelease(l.id, currentActorLabel())}
                            className="flex size-7 items-center justify-center rounded-full text-ensena-success hover:bg-ensena-success/10"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                        )}
                        {l.escrowStatus !== "Frozen" && l.escrowStatus !== "Released" && (
                          <button
                            type="button"
                            title="Freeze Escrow"
                            onClick={() => adminFreeze(l.id, currentActorLabel())}
                            className="flex size-7 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100"
                          >
                            <PauseCircle className="size-4" />
                          </button>
                        )}
                        {l.escrowStatus === "Frozen" && (
                          <button
                            type="button"
                            title="Refund Student"
                            onClick={() => adminRefund(l.id, currentActorLabel())}
                            className="flex size-7 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100"
                          >
                            <RotateCcw className="size-4" />
                          </button>
                        )}
                        {l.confirmationStatus !== "Disputed" && (
                          <button
                            type="button"
                            title="Open Dispute"
                            onClick={() => setDisputingId(l.id)}
                            className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                          >
                            <AlertTriangle className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No lessons match this filter.</p>}
        </div>
      </div>


      <Modal open={!!disputingId} onClose={() => setDisputingId(null)} title="Open Dispute">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Manually flag this lesson for review and freeze the escrow.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {disputeReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Notes</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={submitDispute} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            <Send className="size-4" /> Open Dispute
          </Button>
        </div>
      </Modal>
    </div>
  );
}
