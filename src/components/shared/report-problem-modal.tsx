"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { disputeReasons } from "@/lib/escrow-release";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { submitSupportTicket } from "@/lib/actions/support";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { submitSupportRequest } from "@/lib/support-store";
import type { RelatedRecordType, SupportContext } from "@/lib/support-data";

// For Discovery Sessions and Counselling — neither has a LessonConfirmation/
// escrow record (see escrow-store.ts), so there's nothing for openDispute()
// to attach a report to. This submits through the already-fully-built
// support-ticket system instead (support-store.ts) rather than inventing a
// parallel dispute store just for these two kinds. Private/Group keep using
// the real escrow dispute flow (useEscrowConfirmFlow's own modal) as-is.
export function ReportProblemModal({
  open,
  onClose,
  context,
  relatedRecordType,
  relatedRecordId,
  relatedRecordLabel,
}: {
  open: boolean;
  onClose: () => void;
  context: SupportContext;
  relatedRecordType: RelatedRecordType;
  relatedRecordId: string;
  relatedRecordLabel: string;
}) {
  const [reason, setReason] = useState(disputeReasons[0]);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await submitSupportTicket({
        context,
        category: reason,
        message: details.trim() || reason,
        source: "Report",
        relatedRecordType,
        relatedRecordId,
        relatedRecordLabel,
      });
      if (!result.ok) return setError(result.message);
      setSubmitted(true);
      return;
    }
    await submitSupportRequest({
      userName: dashboardStudent.name,
      userRole: "Student",
      context,
      category: reason,
      message: details,
      relatedRecordType,
      relatedRecordId,
      relatedRecordLabel,
    });
    setSubmitted(true);
  }

  function handleClose() {
    setSubmitted(false);
    setReason(disputeReasons[0]);
    setDetails("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report a Problem">
      {submitted ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-8 text-ensena-success" />
          <p className="text-sm font-medium text-ensena-ink">Your report has been submitted to Ensena Support.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">What went wrong?</span>
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
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
          <Button onClick={submit} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            Submit
          </Button>
        </div>
      )}
    </Modal>
  );
}
