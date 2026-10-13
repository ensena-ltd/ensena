"use client";

import { useState } from "react";
import Link from "next/link";

import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { disputeReasons, formatCountdown, type ConfirmationStatus } from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { currentActorLabel } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

const statusStyles: Record<ConfirmationStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-emerald-100 text-emerald-700",
  Disputed: "bg-rose-100 text-rose-700",
};

export function LessonConfirmationFullDetailsClient({ lessonId }: { lessonId: string }) {
  const { lessons, nowMs, adminRelease, adminFreeze, adminRefund, openDispute } = useLessonConfirmations();
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState(disputeReasons[0]);
  const [details, setDetails] = useState("");

  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This lesson confirmation could not be found.</p>
        <Link href="/admin/lesson-confirmations" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Lesson Confirmations</Link>
      </div>
    );
  }

  function submitDispute() {
    openDispute(lessonId, currentActorLabel(), reason, details);
    setDisputing(false);
    setDetails("");
  }

  const msRemaining = lesson.autoReleaseAt - nowMs;

  const actions: FullDetailsAction[] = [
    ...(lesson.escrowStatus !== "Released" ? [{ key: "release", label: "Release Payment", onClick: () => adminRelease(lessonId, currentActorLabel()), variant: "success" as const }] : []),
    ...(lesson.escrowStatus !== "Frozen" && lesson.escrowStatus !== "Released" ? [{ key: "freeze", label: "Freeze Escrow", onClick: () => adminFreeze(lessonId, currentActorLabel()), variant: "warning" as const }] : []),
    ...(lesson.escrowStatus === "Frozen" ? [{ key: "refund", label: "Refund Student", onClick: () => adminRefund(lessonId, currentActorLabel()), variant: "danger" as const }] : []),
    ...(lesson.confirmationStatus !== "Disputed" ? [{ key: "dispute", label: "Open Dispute", onClick: () => setDisputing(true) }] : []),
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/lesson-confirmations"
        backLabel="Back to Lesson Confirmations"
        name={lesson.subject}
        subtitle={`${lesson.student} · ${lesson.tutor} · ${lesson.type}`}
        badges={
          <>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[lesson.confirmationStatus])}>{lesson.confirmationStatus}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", lesson.escrowStatus === "Held" ? "bg-amber-100 text-amber-700" : lesson.escrowStatus === "Released" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{lesson.escrowStatus}</span>
          </>
        }
        actions={actions}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Lesson Details</p>
                  <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-ensena-muted">Amount</dt><dd className="text-ensena-ink">{formatNaira(lesson.amountGross)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Completed At</dt><dd className="text-ensena-ink">{new Date(lesson.completedAt).toLocaleString()}</dd></div>
                    {lesson.type === "Private" ? (
                      <>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Auto-Release At</dt><dd className="text-ensena-ink">{new Date(lesson.autoReleaseAt).toLocaleString()}</dd></div>
                        {lesson.confirmationStatus === "Pending" && <div className="flex justify-between"><dt className="text-ensena-muted">Countdown</dt><dd className="text-ensena-ink">{formatCountdown(msRemaining)}</dd></div>}
                      </>
                    ) : (
                      lesson.attendance && (
                        <>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Attendance</dt><dd className="text-ensena-ink">{lesson.attendance.attendedMinutes}/{lesson.attendance.classDurationMinutes} mins ({lesson.attendance.attendancePct}%)</dd></div>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Class Health Score</dt><dd className="text-ensena-ink">{lesson.attendance.healthScore}/100</dd></div>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Started On Time</dt><dd className="text-ensena-ink">{lesson.attendance.tutorStartedOnTime ? "Yes" : "No"}</dd></div>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Stayed Connected</dt><dd className="text-ensena-ink">{lesson.attendance.tutorStayedConnected ? "Yes" : "No"}</dd></div>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Recording Saved</dt><dd className="text-ensena-ink">{lesson.attendance.recordingSaved ? "Yes" : "No"}</dd></div>
                          <div className="flex justify-between"><dt className="text-ensena-muted">Whiteboard Used</dt><dd className="text-ensena-ink">{lesson.attendance.whiteboardUsed ? "Yes" : "No"}</dd></div>
                        </>
                      )
                    )}
                    {lesson.releasedAt && <div className="flex justify-between"><dt className="text-ensena-muted">Released At</dt><dd className="text-ensena-ink">{new Date(lesson.releasedAt).toLocaleString()}</dd></div>}
                  </dl>
                </div>

                {lesson.disputeReason && (
                  <div className="rounded-2xl bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-700">Dispute Reason: {lesson.disputeReason}</p>
                    {lesson.disputeDetails && <p className="mt-1.5 text-sm text-rose-600">{lesson.disputeDetails}</p>}
                  </div>
                )}

                {lesson.complaintFiled && (
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-700">Complaint: {lesson.complaintReason}</p>
                    {lesson.complaintDetails && <p className="mt-1.5 text-sm text-amber-700">{lesson.complaintDetails}</p>}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal open={disputing} onClose={() => setDisputing(false)} title="Open Dispute">
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
            Open Dispute
          </Button>
        </div>
      </Modal>
    </div>
  );
}
