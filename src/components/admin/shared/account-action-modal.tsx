"use client";

import { useState } from "react";

import { setAccountStatus, type AccountEntityType, type AccountStatus } from "@/lib/account-status-store";
import { cn } from "@/lib/utils";

// Replaces the old separate Suspend/Ban modals with one flow covering the
// full enforcement ladder — Warning / Temporary Restriction / Suspension /
// Ban — so an admin's final decision always goes through the same real
// choke point (setAccountStatus) with `interim: false`, which is exactly
// what overwrites an automatic/interim status the moderation engine may
// have applied while the case was pending review (see moderation-store.ts).
type ActionKind = "Warning" | "Restricted" | "Suspended" | "Banned";

const actionCopy: Record<ActionKind, { title: string; description: string; buttonLabel: string; buttonClass: string; hasDuration: boolean }> = {
  Warning: {
    title: "Issue Warning",
    description: "A formal, recorded warning. Nothing is blocked; this is on notice only.",
    buttonLabel: "Issue Warning",
    buttonClass: "bg-amber-500 hover:bg-amber-600",
    hasDuration: false,
  },
  Restricted: {
    title: "Apply Temporary Restriction",
    description: "New bookings are blocked until the restriction expires. The account stays visible otherwise.",
    buttonLabel: "Apply Restriction",
    buttonClass: "bg-orange-500 hover:bg-orange-600",
    hasDuration: true,
  },
  Suspended: {
    title: "Suspend Account",
    description: "New bookings are blocked and the account is hidden from search/discovery until the suspension expires.",
    buttonLabel: "Suspend Account",
    buttonClass: "bg-rose-600 hover:bg-rose-700",
    hasDuration: true,
  },
  Banned: {
    title: "Ban Account",
    description: "Permanent. The account loses platform access entirely; this cannot be set to expire.",
    buttonLabel: "Ban Account",
    buttonClass: "bg-rose-800 hover:bg-rose-900",
    hasDuration: false,
  },
};

const durationOptions = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "7 days", hours: 24 * 7 },
  { label: "14 days", hours: 24 * 14 },
  { label: "30 days", hours: 24 * 30 },
];

export function AccountActionModal({
  open,
  type,
  entityId,
  entityName,
  reasonOptions,
  actor,
  onClose,
  onDone,
}: {
  open: boolean;
  type: AccountEntityType;
  entityId: string;
  entityName: string;
  reasonOptions: string[];
  actor: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [kind, setKind] = useState<ActionKind>("Warning");
  const [reason, setReason] = useState(reasonOptions[0]);
  const [durationHours, setDurationHours] = useState(durationOptions[2].hours); // 7 days default
  // Captured once (not a live Date.now() read during render) — purely for
  // the "Ends [date]" preview text; the real expiresAt is computed fresh
  // at the moment `apply()` actually runs.
  const [previewNowMs] = useState(() => Date.now());

  if (!open) return null;

  const copy = actionCopy[kind];

  function apply() {
    const status: AccountStatus = kind;
    const expiresAt = copy.hasDuration ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() : undefined;
    setAccountStatus(type, entityId, status, reason, actor, { expiresAt, interim: false });
    onDone(`${entityName}: ${copy.buttonLabel.toLowerCase()} applied.`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ensena-ink/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Take Action: {entityName}</h2>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {(Object.keys(actionCopy) as ActionKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                kind === k ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {k === "Restricted" ? "Temporary Restriction" : k}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-ensena-muted">{copy.description}</p>

        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
            {reasonOptions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>

        {copy.hasDuration && (
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Duration</span>
            <select value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {durationOptions.map((d) => (
                <option key={d.hours} value={d.hours}>{d.label}</option>
              ))}
            </select>
            <span className="text-xs text-ensena-muted">
              Ends {new Date(previewNowMs + durationHours * 60 * 60 * 1000).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          </label>
        )}

        <button type="button" onClick={apply} className={cn("mt-4 h-10 w-full rounded-full text-sm font-semibold text-white", copy.buttonClass)}>
          {copy.buttonLabel}
        </button>
        <button type="button" onClick={onClose} className="mt-2 h-9 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
