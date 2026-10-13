"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatNaira } from "@/lib/format";
import { complaintReasons, formatCountdown } from "@/lib/escrow-release";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

// The Group-class counterpart to EscrowConfirmationPanel — deliberately
// does NOT offer a "Confirm"/"Release Payment" action. A group session's
// payment isn't gated on the student clicking anything; the system already
// holds it and auto-clears it after 24h. The only action a student can take
// is to report a problem, which freezes just their own allocation.
export function GroupSessionReportPanel() {
  const { lessons, nowMs, fileComplaint, simulateElapsed } = useLessonConfirmations();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reason, setReason] = useState(complaintReasons[0]);
  const [details, setDetails] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const mySessions = lessons
    .filter((l) => l.student === dashboardStudent.name && l.type === "Group")
    .filter((l) => nowMs - l.completedAt < 48 * 60 * 60 * 1000) // recent + within/just past the report window — older history moves to Completed Lessons
    .sort((a, b) => b.completedAt - a.completedAt);

  const reporting = mySessions.find((l) => l.id === reportingId) ?? null;

  function submitReport() {
    if (!reporting) return;
    fileComplaint(reporting.id, dashboardStudent.name, reason, details);
    setReportingId(null);
    setSubmittedId(reporting.id);
    setDetails("");
  }

  if (mySessions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Group Class Sessions
      </h2>
      <p className="text-xs text-ensena-muted">If everything was fine, you don&apos;t need to do anything. No action required unless something went wrong.</p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {mySessions.map((l) => {
          const msRemaining = l.autoReleaseAt - nowMs;
          const canReport = l.confirmationStatus === "Pending" && msRemaining > 0;
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
                  <p className="text-xs text-ensena-muted">{l.tutor} · {formatNaira(l.amountGross)}</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> Session Completed
                </span>
              </div>

              <p className="mt-2 text-xs text-ensena-muted">
                {l.attendance?.present === false ? "You did not attend this session." : `You attended: ${l.attendance?.attendedMinutes ?? "—"} minutes`}
              </p>

              {l.confirmationStatus === "Pending" && canReport && (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                    <Clock className="size-3.5" /> You can report a problem within {formatCountdown(msRemaining)}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setReportingId(l.id)}
                    className="mt-2 h-8 w-full rounded-full border-ensena-border text-xs font-medium"
                  >
                    Report a Problem
                  </Button>
                  <button
                    type="button"
                    onClick={() => simulateElapsed(l.id)}
                    className="mt-2 text-[11px] font-medium text-ensena-muted underline decoration-dotted"
                  >
                    ⚙ Demo: simulate 24h elapsed (auto-release)
                  </button>
                </>
              )}

              {l.confirmationStatus === "Disputed" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertTriangle className="size-3.5" /> Your report has been submitted and is being reviewed.
                </p>
              )}

              {l.confirmationStatus === "Confirmed" && l.escrowStatus === "Released" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-success">
                  <CheckCircle2 className="size-3.5" /> No issue reported. This session has cleared.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Report a problem modal */}
      <Modal open={!!reporting} onClose={() => setReportingId(null)} title="What went wrong?">
        {reporting && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Reason</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {complaintReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Tell us what happened</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>
            <Button onClick={submitReport} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
              Submit Complaint
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!submittedId} onClose={() => setSubmittedId(null)} title="Report Submitted">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className={cn("size-10 text-ensena-primary")} />
          <p className="text-sm text-ensena-ink">Your report has been submitted and is being reviewed.</p>
          <p className="text-xs text-ensena-muted">Your allocated payment for this session will stay held until Ensena resolves it.</p>
        </div>
      </Modal>
    </div>
  );
}
