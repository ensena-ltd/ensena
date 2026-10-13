"use client";

import { AlertCircle, File as FileIcon, Loader2, X } from "lucide-react";

import { formatFileSize } from "@/lib/attachment-store";
import type { PendingAttachment } from "@/hooks/use-attachment-picker";
import { cn } from "@/lib/utils";

// Shown above the composer input for every file picked but not sent yet —
// a real preview of a real async operation (attachment-store.ts saving to
// IndexedDB), not decoration: Uploading/Uploaded/Failed genuinely reflect
// that operation's state, and Retry re-runs it for real.
export function PendingAttachmentsBar({
  pending,
  onRemove,
  onRetry,
}: {
  pending: PendingAttachment[];
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}) {
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-ensena-border bg-ensena-bg-soft/60 px-3 py-2">
      {pending.map((p) => (
        <div
          key={p.localId}
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 text-xs",
            p.status === "failed" ? "border-rose-300" : "border-ensena-border"
          )}
        >
          {p.status === "uploading" ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-ensena-muted" />
          ) : p.status === "failed" ? (
            <AlertCircle className="size-3.5 shrink-0 text-rose-600" />
          ) : (
            <FileIcon className="size-3.5 shrink-0 text-ensena-primary" />
          )}
          <div className="min-w-0">
            <p className="max-w-[10rem] truncate font-medium text-ensena-ink">{p.file.name}</p>
            <p className="text-[10px] text-ensena-muted">
              {p.status === "uploading" ? "Uploading…" : p.status === "failed" ? p.error ?? "Failed" : formatFileSize(p.file.size)}
            </p>
          </div>
          {p.status === "failed" && (
            <button type="button" onClick={() => onRetry(p.localId)} className="text-[11px] font-semibold text-ensena-primary hover:underline">
              Retry
            </button>
          )}
          <button type="button" aria-label={`Remove ${p.file.name}`} onClick={() => onRemove(p.localId)} className="text-ensena-muted hover:text-ensena-ink">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
