"use client";

import { X, type LucideIcon } from "lucide-react";

export function MilestoneBanner({
  icon: Icon,
  message,
  onDismiss,
}: {
  icon: LucideIcon;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface px-4 py-3">
      <Icon className="size-5 shrink-0 text-ensena-primary" />
      <p className="flex-1 text-sm font-medium text-ensena-ink">{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
        <X className="size-4" />
      </button>
    </div>
  );
}
