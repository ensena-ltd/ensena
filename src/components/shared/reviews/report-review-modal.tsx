"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { reportReasons } from "@/lib/reviews-data";

// Shared by both Tutor and Student dashboards — reporting a review never
// deletes/hides it; it only opens a request Admin can act on.
export function ReportReviewModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}) {
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState("");

  function handleSubmit() {
    onSubmit(reason, details.trim());
    setReason(reportReasons[0]);
    setDetails("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Report / Contact Admin About This Review">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ensena-muted">This does not remove the review. Ensena Admin will review your request and decide whether action is needed.</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
            {reportReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
        </label>
        <Button onClick={handleSubmit} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
          Submit Report
        </Button>
      </div>
    </Modal>
  );
}
