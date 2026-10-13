"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { useActiveRestriction, useRestrictionHistory } from "@/hooks/use-restriction";
import { currentActorLabel } from "@/lib/admin-session";
import {
  applyRestrictionResolved,
  formatRestorationMoment,
  removeRestrictionEarly,
  resolveRestrictionResolved,
  RESTRICTION_DURATION_PRESETS,
  type ActorRole,
  type RestrictionRecord,
  type RestrictionType,
} from "@/lib/moderation-store";
import { cn } from "@/lib/utils";

const statusStyles: Record<RestrictionRecord["status"], string> = {
  Active: "bg-amber-100 text-amber-700",
  UnderReview: "bg-sky-100 text-sky-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Expired: "bg-ensena-bg-soft text-ensena-muted",
  Escalated: "bg-violet-100 text-violet-700",
  Suspended: "bg-rose-100 text-rose-700",
};

const typeLabels: Record<RestrictionType, string> = {
  Warning: "Warning",
  MessagingRestriction: "Messaging Restriction",
  Suspension: "Account Suspension",
};

function formatDateTimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function humanDuration(startMs: number, endMs: number | null): string {
  if (endMs === null) return "No expiration";
  const hours = Math.round((endMs - startMs) / (60 * 60 * 1000));
  if (hours <= 0) return "0 hours";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

// The one admin surface for reviewing and acting on a user's messaging
// restriction state — shared by the tutor and student full-details "Safety"
// tabs so both sides of a case (whoever sent the message) get an identical
// review experience. Two decisions only: either there was no real violation
// (Resolve — No Violation Found, unlocks immediately) or the violation is
// real and the admin applies a real, explicitly-timed enforcement action
// (Apply Account Action) — never a bare "Resolved" that leaves messaging
// state disconnected from the ticket, per the platform's own rule that the
// enforcement system and the UI must stay connected.
export function ModerationRestrictionPanel({ actorName, actorRole, actorEmail }: { actorName: string; actorRole: ActorRole; actorEmail?: string }) {
  const active = useActiveRestriction(actorName, actorRole, actorEmail);
  const history = useRestrictionHistory(actorName, actorRole, actorEmail);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeNote, setRemoveNote] = useState("");
  const [actionOpen, setActionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [actionType, setActionType] = useState<RestrictionType>("MessagingRestriction");
  const [actionReason, setActionReason] = useState("");
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [presetHours, setPresetHours] = useState<number>(RESTRICTION_DURATION_PRESETS[1].hours);
  const [customStart, setCustomStart] = useState(() => formatDateTimeLocalValue(Date.now()));
  const [customEnd, setCustomEnd] = useState(() => formatDateTimeLocalValue(Date.now() + 7 * 24 * 60 * 60 * 1000));
  // Captured once when the modal opens (never read live during render) so
  // the "Starts:"/"Duration:" preview stays stable while the admin fills
  // out the rest of the form — components/hooks must stay pure, never call
  // an impure function like Date.now() directly in the render body.
  const [actionNowMs, setActionNowMs] = useState(() => Date.now());

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 3000);
  }

  function openAction() {
    const now = Date.now();
    setActionType(active?.type ?? "MessagingRestriction");
    setActionReason("");
    setDurationMode("preset");
    setPresetHours(RESTRICTION_DURATION_PRESETS[1].hours);
    setCustomStart(formatDateTimeLocalValue(now));
    setCustomEnd(formatDateTimeLocalValue(now + 7 * 24 * 60 * 60 * 1000));
    setActionNowMs(now);
    setActionOpen(true);
  }

  const startMs = durationMode === "custom" ? new Date(customStart).getTime() : actionNowMs;
  const endMs = actionType === "Warning" ? null : durationMode === "custom" ? new Date(customEnd).getTime() : startMs + presetHours * 60 * 60 * 1000;
  const durationLabel = actionType === "Warning" ? "No expiration" : humanDuration(startMs, endMs);
  const canConfirmAction = actionReason.trim().length > 0 && (actionType === "Warning" || (endMs !== null && endMs > startMs));

  async function confirmResolve() {
    if (!active || submitting) return;
    setSubmitting(true);
    try {
      await resolveRestrictionResolved(active, currentActorLabel(), resolveReason.trim() || "No policy violation found on review.");
      setResolveOpen(false);
      setResolveReason("");
      flash("Restriction resolved — access restored.");
    } catch {
      flash("Couldn't resolve the restriction — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRemove() {
    if (!active || submitting) return;
    setSubmitting(true);
    try {
      await removeRestrictionEarly(active, currentActorLabel(), removeNote);
      setRemoveOpen(false);
      setRemoveNote("");
      flash("Restriction removed — access restored immediately.");
    } catch {
      flash("Couldn't remove the restriction — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAction() {
    if (!canConfirmAction || submitting) return;
    setSubmitting(true);
    try {
      await applyRestrictionResolved({
        actorName,
        actorRole,
        actorEmail,
        type: actionType,
        reason: actionReason.trim(),
        violationCountAtTime: active?.violationCountAtTime ?? 0,
        createdBy: currentActorLabel(),
        startAtMs: durationMode === "custom" ? startMs : undefined,
        endAtMs: actionType === "Warning" ? null : endMs,
        caseReportId: active?.caseReportId,
        supersedesId: active?.id,
      });
      setActionOpen(false);
      flash(`${typeLabels[actionType]} applied${endMs ? ` — ends ${formatRestorationMoment(endMs)}` : ""}.`);
    } catch {
      flash("Couldn't apply this action — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-ensena-border p-4">
        {active ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", statusStyles[active.status])}>
                {typeLabels[active.type]} · {active.status}
              </span>
              <span className="text-sm text-ensena-muted">{active.durationLabel}</span>
            </div>
            <p className="text-sm text-ensena-ink">{active.reason}</p>
            <dl className="mt-1 grid grid-cols-1 gap-1 text-xs text-ensena-muted sm:grid-cols-2">
              <div>Started: {formatRestorationMoment(active.startAtMs)}</div>
              <div>{active.endAtMs ? `Ends: ${formatRestorationMoment(active.endAtMs)}` : "No expiration"}</div>
              <div>Applied by: {active.createdBy}</div>
              <div>Violation count at time: {active.violationCountAtTime}</div>
            </dl>
            {active.caseReportId && (
              <Link href={`/admin/reports/${active.caseReportId}`} className="text-xs font-semibold text-ensena-primary hover:underline">View related case</Link>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResolveOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <ShieldCheck className="size-3.5" /> Resolve — No Violation Found
              </button>
              {/* Distinct from "Resolve — No Violation Found": the violation
                  stands, the admin is just ending enforcement before its
                  scheduled expiration (brief item 8) — different wording so
                  the audit trail and the affected user's history never imply
                  the case itself was unfounded. */}
              <button
                type="button"
                onClick={() => setRemoveOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                <ShieldOff className="size-3.5" /> Remove Restriction
              </button>
              <button
                type="button"
                onClick={openAction}
                className="flex h-9 items-center gap-1.5 rounded-full bg-ensena-primary px-3.5 text-xs font-semibold text-white hover:bg-ensena-primary-hover"
              >
                <AlertTriangle className="size-3.5" /> Apply Account Action
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">No active restriction</span>
            <button
              type="button"
              onClick={openAction}
              className="h-9 rounded-full border border-ensena-border px-3.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Apply Account Action
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Enforcement history</h3>
          <ul className="flex flex-col gap-2">
            {history.map((r) => (
              <li key={r.id} className="rounded-xl border border-ensena-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[r.status])}>{typeLabels[r.type]} · {r.status}</span>
                  <span className="text-xs text-ensena-muted">{r.durationLabel}</span>
                </div>
                <p className="mt-1 text-ensena-ink">{r.reason}</p>
                <p className="mt-1 text-xs text-ensena-muted">
                  {formatRestorationMoment(r.startAtMs)}{r.endAtMs ? ` → ${formatRestorationMoment(r.endAtMs)}` : ""} · Applied by {r.createdBy}
                </p>
                {r.status === "Resolved" && (
                  <p className="mt-1 text-xs text-emerald-700">Resolved by {r.resolvedBy}{r.resolvedAtMs ? ` on ${formatRestorationMoment(r.resolvedAtMs)}` : ""}{r.resolutionReason ? `: ${r.resolutionReason}` : ""}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resolve — No Violation Found */}
      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve — No Violation Found" widthClassName="max-w-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            This immediately removes the restriction and restores messaging access — the user does not wait for the original expiration.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Resolution reason</span>
            <textarea value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} rows={3} className="resize-none rounded-xl border border-ensena-border px-3 py-2 text-sm" placeholder="Why was no violation found?" />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={confirmResolve}
            className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-60"
          >
            {submitting ? "Resolving…" : "Resolve and restore access"}
          </button>
        </div>
      </Modal>

      {/* Remove Restriction — ends an active, presumed-valid restriction
          early. Kept as its own modal/wording (never merged into the Resolve
          modal above) so the audit trail and the affected user's history
          never imply the underlying violation was unfounded. */}
      <Modal open={removeOpen} onClose={() => setRemoveOpen(false)} title="Remove Restriction" widthClassName="max-w-md">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            Ends this restriction now, before its scheduled expiration, and immediately restores normal access. The violation itself stays on record — this only ends enforcement early.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Note (optional)</span>
            <textarea value={removeNote} onChange={(e) => setRemoveNote(e.target.value)} rows={3} className="resize-none rounded-xl border border-ensena-border px-3 py-2 text-sm" placeholder="e.g. Escalated to a formal review instead" />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={confirmRemove}
            className="h-11 w-full rounded-full bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? "Removing…" : "Remove restriction now"}
          </button>
        </div>
      </Modal>

      {/* Apply Account Action */}
      <Modal open={actionOpen} onClose={() => setActionOpen(false)} title="Apply Account Action" widthClassName="max-w-lg">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Action</span>
            <select value={actionType} onChange={(e) => setActionType(e.target.value as RestrictionType)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink">
              <option value="Warning">Warning</option>
              <option value="MessagingRestriction">Messaging Restriction</option>
              <option value="Suspension">Account Suspension</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={2} className="resize-none rounded-xl border border-ensena-border px-3 py-2 text-sm" placeholder="e.g. Repeated communication policy violations" />
          </label>

          {actionType !== "Warning" && (
            <div className="flex flex-col gap-2 rounded-xl border border-ensena-border p-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setDurationMode("preset")} className={cn("h-8 rounded-full px-3 text-xs font-semibold", durationMode === "preset" ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-muted")}>Preset duration</button>
                <button type="button" onClick={() => setDurationMode("custom")} className={cn("h-8 rounded-full px-3 text-xs font-semibold", durationMode === "custom" ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-muted")}>Custom start/end</button>
              </div>
              {durationMode === "preset" ? (
                <div className="flex flex-wrap gap-1.5">
                  {RESTRICTION_DURATION_PRESETS.map((p) => (
                    <button key={p.hours} type="button" onClick={() => setPresetHours(p.hours)} className={cn("h-8 rounded-full px-3 text-xs font-medium", presetHours === p.hours ? "bg-ensena-primary/10 text-ensena-primary" : "border border-ensena-border text-ensena-ink")}>
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">Start</span>
                    <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">End</span>
                    <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-ensena-bg-soft p-3.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Account Action</p>
            <p className="mt-1.5 font-medium text-ensena-ink">Action: {typeLabels[actionType]}</p>
            <p className="mt-0.5 text-ensena-muted">Reason: {actionReason.trim() || "—"}</p>
            <p className="mt-0.5 text-ensena-muted">Starts: {formatRestorationMoment(startMs)}</p>
            <p className="mt-0.5 text-ensena-muted">Ends: {endMs ? formatRestorationMoment(endMs) : "No expiration"}</p>
            <p className="mt-0.5 font-medium text-ensena-ink">Duration: {durationLabel}</p>
          </div>

          <button
            type="button"
            disabled={!canConfirmAction || submitting}
            onClick={confirmAction}
            className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-50"
          >
            {submitting ? "Applying…" : actionType === "Warning" ? "Apply warning" : `Apply ${durationLabel} ${actionType === "Suspension" ? "suspension" : "messaging restriction"}`}
          </button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed inset-x-4 bottom-6 z-[120] mx-auto max-w-md rounded-2xl bg-ensena-ink px-4 py-3 text-center text-sm text-white shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
          {toast}
        </div>
      )}
    </div>
  );
}
