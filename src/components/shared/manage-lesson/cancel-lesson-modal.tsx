"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CancellationReason } from "@/lib/booking-lifecycle-store";
import { formatNaira } from "@/lib/format";

const reasonOptions: CancellationReason[] = [
  "I can no longer attend",
  "I need a different time",
  "I booked by mistake",
  "I found another option",
  "Personal reasons",
  "Other",
];

export function CancelLessonModal({
  open,
  title,
  summary,
  policyLabel,
  refundAmount,
  cancellationFee,
  onKeep,
  onConfirm,
}: {
  open: boolean;
  title: string;
  summary: string;
  /** e.g. "You are cancelling more than 24 hours before your session." */
  policyLabel: string;
  refundAmount: number;
  cancellationFee: number;
  onKeep: () => void;
  onConfirm: (reason: CancellationReason, notes?: string) => void;
}) {
  const [reason, setReason] = useState<CancellationReason>(reasonOptions[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onKeep();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onKeep]);

  if (!open) return null;

  // Reset happens on the way out (either button), not on open — this modal
  // stays mounted between opens (the parent just toggles `open`), so
  // resetting only here is what keeps each new cancellation starting from a
  // clean reason/notes instead of carrying over whatever was picked for the
  // previous booking.
  function handleKeep() {
    setReason(reasonOptions[0]);
    setNotes("");
    onKeep();
  }
  function handleConfirm() {
    onConfirm(reason, notes || undefined);
    setReason(reasonOptions[0]);
    setNotes("");
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-lesson-title"
    >
      <button type="button" aria-label="Close" onClick={handleKeep} className="absolute inset-0 cursor-default" />
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="cancel-lesson-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleKeep}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-ensena-ink">{summary}</p>

        <div className="mt-3 rounded-xl bg-ensena-bg-soft p-3">
          <p className="text-xs font-semibold text-ensena-ink">Cancellation policy</p>
          <p className="mt-1 text-xs text-ensena-muted">{policyLabel}</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ensena-muted">Refund</span>
            <span className="font-semibold text-ensena-success">{formatNaira(refundAmount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ensena-muted">Cancellation fee</span>
            <span className="font-medium text-ensena-ink">{formatNaira(cancellationFee)}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ensena-ink">Cancellation reason</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {reasonOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-ensena-ink">
                <input type="radio" name="cancel-reason" checked={reason === option} onChange={() => setReason(option)} className="accent-ensena-primary" />
                {option}
              </label>
            ))}
          </div>
          {reason === "Other" && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us more (optional)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-ensena-border px-3 py-2 text-sm"
            />
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleKeep}
            className="h-11 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
          >
            Keep booking
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-11 w-full rounded-full text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}
