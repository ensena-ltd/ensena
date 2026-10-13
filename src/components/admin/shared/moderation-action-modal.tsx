"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModerationActionModal({
  open,
  onClose,
  title,
  description,
  reasons,
  reason,
  setReason,
  confirmLabel,
  confirmClassName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  reasons: readonly string[];
  reason: string;
  setReason: (v: string) => void;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ensena-ink/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">{title}</h2>
        <p className="mt-2 text-sm text-ensena-muted">{description}</p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <Button onClick={onConfirm} className={cn("mt-3 h-10 w-full rounded-full text-sm font-semibold text-white", confirmClassName)}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
