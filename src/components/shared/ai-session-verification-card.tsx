"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquareWarning, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ATTENDANCE_PRESENT_THRESHOLD, complaintReasons, type LessonConfirmation } from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {passed ? <CheckCircle2 className="size-3.5 text-ensena-success" /> : <XCircle className="size-3.5 text-rose-500" />}
      <span className={passed ? "text-ensena-ink" : "text-rose-600"}>{label}</span>
    </li>
  );
}

export function AiSessionVerificationCard({
  lesson,
  role,
  onFileComplaint,
}: {
  lesson: LessonConfirmation;
  role: "student" | "tutor";
  onFileComplaint?: (reason: string, details: string) => void;
}) {
  const [complaining, setComplaining] = useState(false);
  const [reason, setReason] = useState(complaintReasons[0]);
  const [details, setDetails] = useState("");
  const a = lesson.attendance;

  function submit() {
    onFileComplaint?.(reason, details);
    setComplaining(false);
    setDetails("");
  }

  return (
    <div className="rounded-xl border border-ensena-border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ensena-ink">
          <ShieldCheck className="size-3.5 text-ensena-primary" /> Session Verification
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            lesson.escrowStatus === "Released"
              ? "bg-emerald-100 text-emerald-700"
              : lesson.escrowStatus === "Frozen"
                ? "bg-rose-100 text-rose-700"
                : "bg-amber-100 text-amber-700"
          )}
        >
          {lesson.escrowStatus === "Released" ? "Verified & Released" : lesson.escrowStatus === "Frozen" ? "Frozen" : a && !a.present ? "Held: Student Absent" : "Held for Review"}
        </span>
      </div>

      {a && (
        <>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ensena-primary/20 text-sm font-bold text-ensena-primary">
              {a.healthScore}%
            </div>
            <div>
              <p className="text-xs font-semibold text-ensena-ink">Class Health Score</p>
              <p className="text-xs text-ensena-muted">
                {a.attendedMinutes}/{a.classDurationMinutes} mins attended ({a.attendancePct}%)
              </p>
            </div>
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <CheckRow label="Tutor started on time" passed={a.tutorStartedOnTime} />
            <CheckRow label="Tutor stayed connected" passed={a.tutorStayedConnected} />
            <CheckRow label="Recording saved" passed={a.recordingSaved} />
            <CheckRow label="Whiteboard used" passed={a.whiteboardUsed} />
            <CheckRow label={`${a.present ? "Present" : "Absent"} (≥${ATTENDANCE_PRESENT_THRESHOLD}% required)`} passed={a.present} />
          </ul>
        </>
      )}

      {lesson.escrowStatus === "Released" && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ensena-success">
          <CheckCircle2 className="size-3.5" /> Payment released: {formatNaira(lesson.amountGross)} (after 15% Ensena fee)
        </p>
      )}
      {a && !a.present && lesson.escrowStatus !== "Released" && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="size-3.5" /> Attendance below {ATTENDANCE_PRESENT_THRESHOLD}%. Payment withheld pending admin review.
        </p>
      )}

      {lesson.complaintFiled && (
        <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <MessageSquareWarning className="size-3.5 shrink-0" />
          {role === "tutor" ? "A student flagged a complaint on this session. Under Ensena review." : `Complaint sent: ${lesson.complaintReason}. This does not pause payment release.`}
        </p>
      )}

      {role === "student" && !lesson.complaintFiled && (
        <button
          type="button"
          onClick={() => setComplaining(true)}
          className="mt-2.5 text-[11px] font-medium text-ensena-muted underline decoration-dotted"
        >
          Report a complaint about this class
        </button>
      )}

      <Modal open={complaining} onClose={() => setComplaining(false)} title="Report a Complaint">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">
            Complaints are reviewed by Ensena support and don&apos;t automatically pause payment release.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {complaintReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={submit} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            Submit Complaint
          </Button>
        </div>
      </Modal>
    </div>
  );
}
