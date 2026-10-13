"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RescheduleLessonModal({
  open,
  currentDate,
  currentTime,
  onClose,
  onConfirm,
}: {
  open: boolean;
  currentDate: string;
  currentTime: string;
  onClose: () => void;
  onConfirm: (newDate: string, newTime: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleConfirm() {
    if (!date || !time) return;
    onConfirm(date, time);
    setDate("");
    setTime("");
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-lesson-title"
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative w-full rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="reschedule-lesson-title" className="font-heading text-lg font-semibold text-ensena-ink">
            Reschedule
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-sm">
          <p className="text-xs text-ensena-muted">Current</p>
          <p className="font-medium text-ensena-ink">{currentDate} · {currentTime}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
          </label>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!date || !time}
          className="mt-5 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
        >
          Confirm reschedule
        </Button>
        <button type="button" onClick={onClose} className="mt-2 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
