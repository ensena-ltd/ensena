"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Paperclip, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatNaira } from "@/lib/format";
import { disputeReasons, formatCountdown, reminderStageFor } from "@/lib/escrow-release";
import { analyzeFileUpload, type FileScanStatus } from "@/lib/file-safety";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

export function EscrowConfirmationPanel() {
  const { lessons, nowMs, confirmLesson, openDispute, simulateElapsed } = useLessonConfirmations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState(disputeReasons[0]);
  const [details, setDetails] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileScanStatus, setFileScanStatus] = useState<FileScanStatus | null>(null);
  const [fileScanReason, setFileScanReason] = useState<string | null>(null);
  const [thankYouId, setThankYouId] = useState<string | null>(null);

  // Every file goes through the same pipeline shape a real backend would
  // use: allowlist -> filename content scan -> deep scan -> approve/block.
  // See file-safety.ts for exactly which of those steps are real here vs.
  // simulated (this app has no server to run real malware/OCR scanning on).
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setFileScanReason(null);
    setFileScanStatus("scanning");
    const outcome = await analyzeFileUpload(file.name, dashboardStudent.name, "Student");
    setFileScanStatus(outcome.status);
    setFileScanReason(outcome.reason ?? null);
    if (outcome.status === "blocked") setFileName("");
  }

  const myLessons = lessons.filter((l) => l.student === dashboardStudent.name && l.type === "Private");
  const active = myLessons.find((l) => l.id === activeId) ?? null;

  function release(id: string) {
    confirmLesson(id, dashboardStudent.name);
    setThankYouId(id);
  }

  function submitDispute() {
    if (!active) return;
    if (fileScanStatus === "scanning" || fileScanStatus === "blocked") return;
    openDispute(active.id, dashboardStudent.name, reason, details);
    setDisputing(false);
    setActiveId(null);
    setDetails("");
    setFileName("");
    setFileScanStatus(null);
    setFileScanReason(null);
  }

  if (myLessons.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Lesson Confirmations
      </h2>
      <p className="text-xs text-ensena-muted">Confirm your recent lessons so payment can be released to your tutor.</p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {myLessons.map((l) => {
          const hoursElapsed = (nowMs - l.completedAt) / 3600000;
          const msRemaining = l.autoReleaseAt - nowMs;
          const reminder = l.confirmationStatus === "Pending" ? reminderStageFor(hoursElapsed) : null;
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
                  <p className="text-xs text-ensena-muted">{l.tutor} · {formatNaira(l.amountGross)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    l.escrowStatus === "Held" ? "bg-amber-100 text-amber-700" : l.escrowStatus === "Released" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {l.escrowStatus === "Held" ? "Waiting Confirmation" : l.escrowStatus === "Released" ? "Released" : "Under Review"}
                </span>
              </div>

              {l.confirmationStatus === "Pending" && (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                    <Clock className="size-3.5" /> Auto-releases in {formatCountdown(msRemaining)}
                  </p>
                  {reminder && (
                    <p className="mt-1.5 rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">
                      <span className="font-semibold">{reminder.title}:</span> {reminder.text}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <Button onClick={() => release(l.id)} className="h-8 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">
                      Release Payment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveId(l.id);
                        setDisputing(true);
                      }}
                      className="h-8 rounded-full border-ensena-border text-xs font-medium"
                    >
                      Report an Issue
                    </Button>
                  </div>
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
                  <AlertTriangle className="size-3.5" /> Under review by Ensena support. We&apos;ll update you soon.
                </p>
              )}

              {l.confirmationStatus === "Confirmed" && l.escrowStatus === "Released" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-success">
                  <CheckCircle2 className="size-3.5" /> Payment released to {l.tutor}.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Release confirmation */}
      <Modal open={!!thankYouId} onClose={() => setThankYouId(null)} title="Thank You!">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-10 text-ensena-success" />
          <p className="text-sm text-ensena-ink">Your payment has been released to your tutor.</p>
          <p className="text-xs text-ensena-muted">We hope you enjoyed your lesson.</p>
        </div>
      </Modal>

      {/* Lesson completed / report issue modal */}
      <Modal
        open={!!active && !disputing}
        onClose={() => setActiveId(null)}
        title="Lesson Completed"
      >
        {active && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ensena-ink">How was your lesson?</p>
            <p className="text-sm text-ensena-muted">
              Your tutor has marked today&apos;s {active.subject} lesson as completed. Please confirm that your lesson was successfully delivered.
            </p>
            <Button onClick={() => release(active.id)} className="h-10 w-full rounded-full bg-ensena-success text-sm font-semibold text-white hover:bg-ensena-success/90">
              🟢 Release Payment
            </Button>
            <Button variant="outline" onClick={() => setDisputing(true)} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">
              ⚪ Report an Issue
            </Button>
            <button type="button" onClick={() => setActiveId(null)} className="text-center text-xs font-medium text-ensena-muted">
              I&apos;ll Decide Later
            </button>
          </div>
        )}
      </Modal>

      {/* Dispute form */}
      <Modal open={disputing} onClose={() => { setDisputing(false); setActiveId(null); }} title="Report an Issue">
        {active && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Reason</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {disputeReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>
            <label className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ensena-border text-xs text-ensena-muted">
              <Paperclip className="size-4" />
              {fileName || "Upload screenshots or files (optional)"}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" onChange={handleFileSelected} />
            </label>
            {fileScanStatus === "scanning" && <p className="text-xs font-medium text-ensena-muted">Scanning file…</p>}
            {fileScanStatus === "approved" && <p className="text-xs font-medium text-ensena-success">File approved.</p>}
            {fileScanStatus === "blocked" && fileScanReason && <p className="text-xs font-medium text-rose-600">{fileScanReason}</p>}
            <Button onClick={submitDispute} disabled={fileScanStatus === "scanning"} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
              Submit
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
