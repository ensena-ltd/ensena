"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { checkOfferTextAllowed } from "@/lib/messages-store";
import { defaultOfferPolicySettings, type Offer, type OfferFrequency } from "@/lib/offers-data";
import { cn } from "@/lib/utils";

const durationOptions = [30, 45, 60, 90, 120] as const;
const frequencyOptions: { key: OfferFrequency; label: string }[] = [
  { key: "one-time", label: "One-time" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export function SuggestChangesModal({
  open,
  request,
  onClose,
  onSend,
}: {
  open: boolean;
  request: Offer | null;
  onClose: () => void;
  onSend: (updated: Offer) => void;
}) {
  const [date, setDate] = useState(request?.date ?? "");
  const [time, setTime] = useState(request?.time ?? "");
  const [duration, setDuration] = useState<(typeof durationOptions)[number]>(
    (request?.durationMins as (typeof durationOptions)[number]) ?? 60
  );
  const [frequency, setFrequency] = useState<OfferFrequency>(request?.frequency ?? "one-time");
  const [daysPerWeek, setDaysPerWeek] = useState(request?.daysPerWeek ?? 2);
  const [lessonsCount, setLessonsCount] = useState(request?.lessonsCount ?? 1);
  const [note, setNote] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  if (!open || !request) return null;

  function handleSend() {
    if (!request) return;
    const denied = checkOfferTextAllowed([note], request.tutorName, "Tutor");
    if (denied && !denied.ok) {
      setBlockedMessage(denied.userMessage);
      return;
    }
    setBlockedMessage(null);
    const effectiveLessons = frequency === "one-time" ? 1 : lessonsCount;
    const updated: Offer = {
      ...request,
      kind: "pre-approval",
      date,
      time,
      durationMins: duration,
      frequency,
      daysPerWeek: frequency === "one-time" ? 1 : daysPerWeek,
      lessonsCount: effectiveLessons,
      message: note.trim() || request.message,
      discountRequestMessage: undefined,
      status: "Sent",
      expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
    };
    onSend(updated);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="suggest-changes-title">
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="suggest-changes-title" className="font-heading text-lg font-semibold text-ensena-ink">
            Suggest Changes to {request.studentName.split(" ")[0]}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 p-5">
          <p className="text-xs text-ensena-muted">
            {request.studentName.split(" ")[0]} requested {request.preferredDays?.join(" & ") || "a schedule"} at{" "}
            {request.time}. Adjust anything that doesn&apos;t work for you.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Duration</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as (typeof durationOptions)[number])} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm">
                {durationOptions.map((d) => (<option key={d} value={d}>{d} minutes</option>))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Days per week</span>
              <input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} disabled={frequency === "one-time"} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm disabled:opacity-50" />
            </label>
          </div>

          <div className="mt-3">
            <span className="text-xs font-medium text-ensena-muted">Frequency</span>
            <div className="mt-1.5 flex gap-1.5">
              {frequencyOptions.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFrequency(f.key)}
                  className={cn(
                    "flex-1 rounded-full border px-3 py-1.5 text-xs font-medium",
                    frequency === f.key ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {frequency !== "one-time" && (
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Number of lessons</span>
              <input type="number" min={1} value={lessonsCount} onChange={(e) => setLessonsCount(Number(e.target.value))} className="h-10 w-36 rounded-lg border border-ensena-border px-2.5 text-sm" />
            </label>
          )}

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Note to student</span>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setBlockedMessage(null); }}
              rows={2}
              placeholder="e.g. Tuesday doesn't work for me, but I can do Wednesday and Friday at 5 PM."
              className="rounded-lg border border-ensena-border p-2.5 text-sm"
            />
          </label>
          {blockedMessage && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{blockedMessage}</p>}

          <Button
            onClick={handleSend}
            disabled={!date || !time}
            className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
          >
            Send Updated Proposal
          </Button>
          <button type="button" onClick={onClose} className="mt-2 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
