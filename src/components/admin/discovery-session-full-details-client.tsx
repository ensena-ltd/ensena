"use client";

import { useState } from "react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { FullDetailsPageLayout, type FullDetailsAction, type FullDetailsTab } from "@/components/admin/shared/full-details-page-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { splitEarnings } from "@/lib/commission";
import {
  discoveryPaymentStatusStyles,
  discoverySessionStatusStyles,
} from "@/lib/discovery-sessions-data";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { updateDiscoverySession } from "@/lib/discovery-sessions-store";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DiscoverySessionFullDetailsClient({ sessionId }: { sessionId: string }) {
  // See the matching comment in discovery-followup-client.tsx — the hook,
  // not a plain getAllDiscoverySessions() call, is what keeps a
  // runtime-booked session's server/client render from disagreeing.
  const session = useAllDiscoverySessions().find((d) => d.id === sessionId);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [msgOpen, setMsgOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!session) return null;
  const split = splitEarnings(session.price);

  const actions: FullDetailsAction[] = [
    {
      key: "view",
      label: "View Session",
      onClick: () => window.open(`/tutor-dashboard/discovery-sessions/${session.id}/recommend`, "_blank", "noopener,noreferrer"),
    },
    { key: "message", label: "Msg Tutor", onClick: () => setMsgOpen(true) },
    {
      key: "release",
      label: "Release Escrow",
      onClick: () => { updateDiscoverySession(session.id, { paymentStatus: "Released" }); flash("Escrow released."); },
      variant: "success",
    },
    {
      key: "refund",
      label: "Refund",
      onClick: () => { updateDiscoverySession(session.id, { paymentStatus: "Refunded" }); flash("Session refunded."); },
    },
    { key: "dispute", label: "Open Dispute", onClick: () => setDisputing(true), variant: "danger" },
  ];

  const tabs: FullDetailsTab[] = [
    {
      key: "overview",
      label: "Overview",
      content: (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-ensena-border p-4">
              <p className="text-sm font-semibold text-ensena-ink">Session Details</p>
              <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Lesson ID</dt><dd className="font-medium text-ensena-ink">{session.bookingReference}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Date &amp; Time</dt><dd className="text-ensena-ink">{session.date}, {session.time}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="text-ensena-ink">{session.durationMins} mins</dd></div>
                {session.meetingLink && <div className="flex justify-between gap-2"><dt className="shrink-0 text-ensena-muted">Meeting Link</dt><dd className="truncate text-ensena-primary">{session.meetingLink}</dd></div>}
                {session.fitRating && <div className="flex justify-between"><dt className="text-ensena-muted">Fit Rating</dt><dd className="text-ensena-ink">{session.fitRating}</dd></div>}
                {session.overallRating && <div className="flex justify-between"><dt className="text-ensena-muted">Overall Rating</dt><dd className="text-ensena-ink">{session.overallRating} / 5</dd></div>}
                {session.onTimeArrival !== undefined && <div className="flex justify-between"><dt className="text-ensena-muted">On-Time Arrival</dt><dd className="text-ensena-ink">{session.onTimeArrival ? "Yes" : "No"}</dd></div>}
              </dl>
            </div>

            <div className="rounded-2xl border border-ensena-border p-4">
              <p className="text-sm font-semibold text-ensena-ink">Payment</p>
              <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Student Paid</dt><dd className="text-ensena-ink">{formatNaira(split.gross)}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Platform Fee (15%)</dt><dd className="text-rose-600">{formatNaira(split.commission)}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Receives</dt><dd className="text-ensena-success">{formatNaira(split.net)}</dd></div>
                {session.paymentStatus && (
                  <div className="flex justify-between">
                    <dt className="text-ensena-muted">Payment Status</dt>
                    <dd><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", discoveryPaymentStatusStyles[session.paymentStatus])}>{session.paymentStatus}</span></dd>
                  </div>
                )}
                {session.conversionStatus && (
                  <div className="flex justify-between">
                    <dt className="text-ensena-muted">Conversion Status</dt>
                    <dd className="text-ensena-ink">
                      {session.conversionChannel ? `${session.conversionStatus} · ${session.conversionChannel}` : session.conversionStatus}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {session.studentComment && (
            <div className="rounded-2xl border border-ensena-border p-4">
              <p className="text-sm font-semibold text-ensena-ink">Student Feedback</p>
              <p className="mt-1.5 text-sm text-ensena-muted">&ldquo;{session.studentComment}&rdquo;</p>
            </div>
          )}

          {session.notes && (
            <div className="rounded-2xl bg-ensena-primary/5 p-4">
              <p className="text-sm font-semibold text-ensena-ink">Notes</p>
              <p className="mt-1.5 text-sm text-ensena-muted">{session.notes}</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/discovery-sessions"
        backLabel="Back to Discovery Sessions"
        image={session.tutorImage}
        name={session.subject}
        subtitle={`${session.student} · ${session.tutor} · Lesson ID ${session.bookingReference}`}
        badges={<span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", discoverySessionStatusStyles[session.status])}>{session.status}</span>}
        actions={actions}
        tabs={tabs}
      />

      <Modal open={disputing} onClose={() => setDisputing(false)} title="Open Dispute">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={3} placeholder="Describe the issue…" className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button
            onClick={() => { updateDiscoverySession(session.id, { paymentStatus: "Disputed" }); flash("Dispute opened."); setDisputing(false); setDisputeReason(""); }}
            className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Open Dispute
          </Button>
        </div>
      </Modal>

      <AdminMsgTutorModal open={msgOpen} onClose={() => setMsgOpen(false)} recipientName={session.tutor} role="Tutor" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
