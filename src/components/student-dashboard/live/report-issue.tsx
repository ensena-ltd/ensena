"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { reportLessonIssue } from "@/lib/actions/student-learning";
import { complaintReasons, disputeReasons } from "@/lib/escrow-release";
import type { CompletedLesson } from "@/lib/student-learning-server";

// "Report an issue" (private lesson) / "What went wrong?" (group session)
// form, shared by the dashboard panels and Completed Classes.
export function useReportIssue() {
  const router = useRouter();
  const [reporting, setReporting] = useState<CompletedLesson | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, startTransition] = useTransition();

  function open(item: CompletedLesson) {
    setReason((item.bookingType === "private" ? disputeReasons : complaintReasons)[0]);
    setDetails("");
    setReporting(item);
  }

  function submit() {
    if (!reporting) return;
    startTransition(async () => {
      const result = await reportLessonIssue(reporting.id, reason, details);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't submit your report.");
        return;
      }
      toast.success("Your report has been submitted. Ensena support will review it.");
      setReporting(null);
      router.refresh();
    });
  }

  const modal = (
    <Modal open={!!reporting} onClose={() => setReporting(null)} title={reporting?.bookingType === "group" ? "What went wrong?" : "Report an Issue"}>
      {reporting && (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Payment for this lesson stays on hold until Ensena support reviews your report.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {(reporting.bookingType === "private" ? disputeReasons : complaintReasons).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={800} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={submit} loading={submitting} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            Submit
          </Button>
        </div>
      )}
    </Modal>
  );

  return { open, modal };
}

