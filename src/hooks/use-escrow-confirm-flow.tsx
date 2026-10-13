"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { disputeReasons, type LessonConfirmation } from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { dashboardStudent } from "@/lib/student-dashboard-data";

export interface CompletionStatus {
  label: string;
  tint: string;
  action: "confirm" | "view";
}

export function completionStatus(l: LessonConfirmation): CompletionStatus {
  if (l.confirmationStatus === "Disputed") return { label: "Under Review", tint: "bg-rose-100 text-rose-700", action: "view" };
  if (l.confirmationStatus === "Confirmed") return { label: "Confirmed", tint: "bg-emerald-100 text-emerald-700", action: "view" };
  return { label: "Awaiting Confirmation", tint: "bg-amber-100 text-amber-700", action: "confirm" };
}

// One shared escrow "confirm lesson / report a problem" flow (data, actions
// and modals) used by both the main My Classes page and the full Completed
// Classes list, so the two never drift out of sync on how confirmation
// works. Reuses the same useLessonConfirmations hook that already backs
// escrow-confirmation-panel.tsx elsewhere in the app — not a new system.
export function useEscrowConfirmFlow() {
  const { lessons, confirmLesson, openDispute } = useLessonConfirmations();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState(disputeReasons[0]);
  const [disputeDetails, setDisputeDetails] = useState("");
  const [thankYouId, setThankYouId] = useState<string | null>(null);

  const myConfirmations = lessons.filter((l) => l.student === dashboardStudent.name);
  const confirming = myConfirmations.find((l) => l.id === confirmingId) ?? null;
  const disputing = myConfirmations.find((l) => l.id === disputingId) ?? null;

  function release(id: string) {
    confirmLesson(id, dashboardStudent.name);
    setConfirmingId(null);
    setThankYouId(id);
  }

  function submitDispute() {
    if (!disputing) return;
    openDispute(disputing.id, dashboardStudent.name, disputeReason, disputeDetails);
    setDisputingId(null);
    setDisputeDetails("");
  }

  const modals = (
    <>
      <Modal open={!!confirming && confirming.confirmationStatus === "Pending" && !disputingId} onClose={() => setConfirmingId(null)} title="Confirm Your Lesson">
        {confirming && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ensena-ink">{confirming.subject} with {confirming.tutor}</p>
            <p className="text-sm text-ensena-muted">Did your {confirming.type === "Private" ? "lesson" : "class"} take place as scheduled?</p>
            <Button onClick={() => release(confirming.id)} className="h-10 w-full rounded-full bg-ensena-success text-sm font-semibold text-white hover:bg-ensena-success/90">
              Yes, Lesson Completed
            </Button>
            <p className="text-center text-xs text-ensena-muted">Your payment of {formatNaira(confirming.amountGross)} will be released to your tutor.</p>
            <Button variant="outline" onClick={() => setDisputingId(confirming.id)} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">
              Something went wrong? Report a Problem
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!confirming && confirming.confirmationStatus !== "Pending"} onClose={() => setConfirmingId(null)} title="Class Details">
        {confirming && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-ensena-muted">Subject</span><span className="font-medium text-ensena-ink">{confirming.subject}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Tutor</span><span className="font-medium text-ensena-ink">{confirming.tutor}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Type</span><span className="font-medium text-ensena-ink">{confirming.type === "Private" ? "Private Lesson" : "Group Class"}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Amount</span><span className="font-medium text-ensena-ink">{formatNaira(confirming.amountGross)}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Status</span><span className="font-medium text-ensena-ink">{completionStatus(confirming).label}</span></div>
          </div>
        )}
      </Modal>

      <Modal open={!!disputing} onClose={() => { setDisputingId(null); setConfirmingId(null); }} title="Report a Problem">
        {disputing && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">What went wrong?</span>
              <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {disputeReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
              <textarea value={disputeDetails} onChange={(e) => setDisputeDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>
            <Button onClick={submitDispute} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
              Submit
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!thankYouId} onClose={() => setThankYouId(null)} title="Thank You!">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-ensena-ink">Your payment has been released to your tutor.</p>
          <p className="text-xs text-ensena-muted">We hope you enjoyed your lesson.</p>
        </div>
      </Modal>
    </>
  );

  return { myConfirmations, openConfirm: setConfirmingId, openDispute: setDisputingId, modals };
}
