"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { markRestrictionUnderReviewResolved, type ActorRole, type RestrictionRecord } from "@/lib/moderation-store";
import { submitSupportTicket } from "@/lib/actions/support";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { submitSupportRequest } from "@/lib/support-store";

// The "Contact Internal Support" step of the restriction notice — submits a
// REAL ticket carrying every piece of context an admin needs to review the
// case (user, restriction type/reason/violation count/window, and a link
// back to the moderation case) rather than a bare "I was restricted"
// message, and moves the restriction itself into UnderReview so the admin
// queue immediately shows it's being actively contested. Submitting this
// does NOT lift the restriction — only a real admin decision does that (see
// resolveRestrictionNoViolation / applyRestriction in moderation-store.ts).
export function RestrictionAppealModal({
  restriction,
  actorEmail,
  actorRole,
  onClose,
}: {
  restriction: RestrictionRecord;
  actorEmail: string | undefined;
  actorRole: ActorRole;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    const restoresLabel = restriction.endAtMs ? new Date(restriction.endAtMs).toLocaleString() : "No expiration set";
    const message = [
      note.trim() ? `Message from ${restriction.actorName}: "${note.trim()}"` : `${restriction.actorName} is contesting a ${restriction.type === "Suspension" ? "suspension" : "messaging restriction"} applied to their account.`,
      "",
      `Restriction type: ${restriction.type}`,
      `Enforcement status: ${restriction.status}`,
      `Policy violation count at time of action: ${restriction.violationCountAtTime}`,
      `Applied by: ${restriction.createdBy}`,
      `Started: ${new Date(restriction.startAtMs).toLocaleString()}`,
      `Scheduled to end: ${restoresLabel}`,
      restriction.caseReportId ? `Related case: ${restriction.caseReportId}` : "",
    ].filter(Boolean).join("\n");

    const ticketInput = {
      context: "account" as const,
      category: "Appeal a messaging restriction or suspension",
      message,
      relatedRecordType: "restriction" as const,
      relatedRecordId: restriction.id,
      relatedRecordLabel: `${restriction.type} — ${restriction.durationLabel}`,
    };
    let ticketId: string;
    if (isSupabaseConfigured()) {
      const result = await submitSupportTicket(ticketInput);
      if (!result.ok) {
        setSubmitting(false);
        return;
      }
      ticketId = result.id;
    } else {
      ticketId = (await submitSupportRequest({ ...ticketInput, userName: restriction.actorName, userEmail: actorEmail, userRole: actorRole })).id;
    }
    await markRestrictionUnderReviewResolved(restriction, ticketId);
    setSubmittedId(ticketId);
    setSubmitting(false);
  }

  return (
    <Modal open onClose={onClose} title="Contact Internal Support" widthClassName="max-w-md">
      {submittedId ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <CheckCircle2 className="size-9 text-ensena-success" />
          <p className="font-heading text-base font-semibold text-ensena-ink">Appeal submitted</p>
          <p className="text-sm text-ensena-muted">
            Your case (reference <span className="font-mono font-semibold text-ensena-ink">{submittedId}</span>) has been sent to Internal Support. We&apos;ll review it and follow up. Your restriction remains in place until a decision is made.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            If you believe this {restriction.type === "Suspension" ? "suspension" : "restriction"} was applied incorrectly, tell us why. Internal Support will review the full case, including the policy violation that triggered it.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Optional: explain why you think this was a mistake…"
            className="w-full resize-none rounded-xl border border-ensena-border px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit to Internal Support"}
          </button>
        </div>
      )}
    </Modal>
  );
}
