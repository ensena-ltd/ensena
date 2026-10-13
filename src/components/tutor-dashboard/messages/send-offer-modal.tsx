"use client";

import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { checkOfferTextAllowed } from "@/lib/messages-store";
import { defaultHourlyRates } from "@/lib/tutor-dashboard-data";
import { subjectOptions } from "@/lib/tutors";
import {
  defaultOfferPolicySettings,
  discountPctFromFinal,
  exceedsMaxDiscount,
  finalPriceFromDiscountPct,
  splitEarningsForTotal,
  type BookingKind,
  type Offer,
  type OfferFrequency,
  type OfferKind,
} from "@/lib/offers-data";
import { cn } from "@/lib/utils";

const durationOptions = [30, 45, 60, 90, 120] as const;
const frequencyOptions: { key: OfferFrequency; label: string }[] = [
  { key: "one-time", label: "One-time" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];
type DiscountMode = "percentage" | "custom";

export function SendOfferModal({
  kind,
  open,
  studentName,
  conversationId,
  tutorName,
  tutorSlug,
  prefillOffer,
  onClose,
  onSend,
}: {
  kind: OfferKind;
  open: boolean;
  studentName: string;
  conversationId: string;
  tutorName: string;
  tutorSlug: string;
  prefillOffer?: Offer;
  onClose: () => void;
  onSend: (offer: Offer) => void;
}) {
  const isSpecialOffer = kind === "special-offer";

  const [bookingKind, setBookingKind] = useState<BookingKind>(prefillOffer?.bookingKind ?? "private-lesson");
  const [subject, setSubject] = useState(prefillOffer?.subject ?? subjectOptions[0]);
  const [date, setDate] = useState(prefillOffer?.date ?? "");
  const [time, setTime] = useState(prefillOffer?.time ?? "");
  const [duration, setDuration] = useState<(typeof durationOptions)[number]>(
    (prefillOffer?.durationMins as (typeof durationOptions)[number]) ?? 60
  );
  const [frequency, setFrequency] = useState<OfferFrequency>(prefillOffer?.frequency ?? "one-time");
  const [daysPerWeek, setDaysPerWeek] = useState(prefillOffer?.daysPerWeek ?? 2);
  const [lessonsCount, setLessonsCount] = useState(prefillOffer?.lessonsCount ?? 1);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percentage");
  const [discountPct, setDiscountPct] = useState(10);
  const [customFinalPrice, setCustomFinalPrice] = useState(0);
  const [message, setMessage] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  if (!open) return null;

  const isFreeDiscovery = bookingKind === "discovery";
  const standardPricePerSession = isFreeDiscovery ? 0 : defaultHourlyRates[duration] ?? 0;

  const finalPricePerSession = isFreeDiscovery
    ? 0
    : !isSpecialOffer
      ? standardPricePerSession
      : discountMode === "percentage"
        ? finalPriceFromDiscountPct(standardPricePerSession, discountPct)
        : customFinalPrice;

  const resolvedDiscountPct = isSpecialOffer && !isFreeDiscovery
    ? discountPctFromFinal(standardPricePerSession, finalPricePerSession)
    : null;

  const overDiscountLimit =
    isSpecialOffer && !isFreeDiscovery && exceedsMaxDiscount(standardPricePerSession, finalPricePerSession, defaultOfferPolicySettings);

  const effectiveLessons = frequency === "one-time" ? 1 : lessonsCount;
  const totalFinal = finalPricePerSession * effectiveLessons;
  const split = splitEarningsForTotal(totalFinal);

  const canSend =
    date &&
    time &&
    !overDiscountLimit &&
    (!isSpecialOffer || !isFreeDiscovery) &&
    (finalPricePerSession > 0 || isFreeDiscovery);

  function handleSend() {
    if (!canSend) return;
    const denied = checkOfferTextAllowed([message], tutorName, "Tutor");
    if (denied && !denied.ok) {
      setBlockedMessage(denied.userMessage);
      return;
    }
    setBlockedMessage(null);
    const nowIso = new Date().toISOString();
    const offer: Offer = {
      id: `off-${Date.now()}`,
      kind,
      bookingKind,
      tutorName,
      tutorSlug,
      studentName,
      conversationId,
      subject,
      date,
      time,
      durationMins: duration,
      frequency,
      daysPerWeek: frequency === "one-time" ? 1 : daysPerWeek,
      lessonsCount: effectiveLessons,
      standardPricePerSession,
      discountPct: resolvedDiscountPct,
      finalPricePerSession,
      message: message.trim() || undefined,
      createdAt: nowIso,
      // Every proposal expires exactly 24 hours after it's sent — a fixed
      // platform rule, never configurable per-offer.
      expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
      status: "Sent",
    };
    onSend(offer);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="send-offer-title">
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="send-offer-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {isSpecialOffer ? "Send Special Offer" : "Send Pre-approval"} to {studentName}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 p-5">
          {!isSpecialOffer && (
            <div className="mb-4 flex gap-2">
              {(["private-lesson", "discovery"] as BookingKind[]).map((bk) => (
                <button
                  key={bk}
                  type="button"
                  onClick={() => setBookingKind(bk)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                    bookingKind === bk ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                  )}
                >
                  {bk === "discovery" ? "Discovery Session" : "Private Lesson"}
                </button>
              ))}
            </div>
          )}
          {isSpecialOffer && (
            <p className="mb-4 rounded-lg bg-ensena-bg-soft px-3 py-2 text-xs text-ensena-muted">
              Special Offers apply to Private Lessons. Discovery Sessions are free for every student, so there&apos;s no price to discount. Send a Pre-approval instead to confirm a specific time.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Subject</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm">
                {subjectOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Duration</span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as (typeof durationOptions)[number])}
                disabled={isFreeDiscovery}
                className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm disabled:opacity-60"
              >
                {isFreeDiscovery ? <option value={25}>25 minutes</option> : durationOptions.map((d) => (<option key={d} value={d}>{d} minutes</option>))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
            </label>
          </div>

          {!isFreeDiscovery && (
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
          )}

          {!isFreeDiscovery && frequency !== "one-time" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Days per week</span>
                <input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Number of lessons</span>
                <input type="number" min={1} value={lessonsCount} onChange={(e) => setLessonsCount(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-2.5 text-sm" />
              </label>
            </div>
          )}

          {!isFreeDiscovery && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
              <span className="text-ensena-muted">Standard rate</span>
              <span className="font-medium text-ensena-ink">{formatNaira(standardPricePerSession)} / session</span>
            </div>
          )}

          {isSpecialOffer && !isFreeDiscovery && (
            <div className="mt-4 rounded-xl border border-ensena-border p-3.5">
              <p className="text-sm font-semibold text-ensena-ink">Discount</p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDiscountMode("percentage")}
                  className={cn("flex-1 rounded-full border px-3 py-1.5 text-xs font-medium", discountMode === "percentage" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
                >
                  Percentage off
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountMode("custom"); setCustomFinalPrice(standardPricePerSession); }}
                  className={cn("flex-1 rounded-full border px-3 py-1.5 text-xs font-medium", discountMode === "custom" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
                >
                  Custom final price
                </button>
              </div>

              {discountMode === "percentage" ? (
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Discount %</span>
                  <input type="number" min={0} max={90} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} className="h-10 w-28 rounded-lg border border-ensena-border px-2.5 text-sm" />
                </label>
              ) : (
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Special price / session</span>
                  <input type="number" min={0} value={customFinalPrice} onChange={(e) => setCustomFinalPrice(Number(e.target.value))} className="h-10 w-36 rounded-lg border border-ensena-border px-2.5 text-sm" />
                </label>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3 text-sm">
                <span className="text-ensena-muted">Special price</span>
                <span className="flex items-center gap-2">
                  <span className="text-ensena-muted line-through">{formatNaira(standardPricePerSession * effectiveLessons)}</span>
                  <span className="font-semibold text-ensena-primary">{formatNaira(totalFinal)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ensena-muted">Discount applied</span>
                <span className="font-medium text-ensena-ink">{resolvedDiscountPct}%</span>
              </div>

              {overDiscountLimit && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  This discount exceeds Ensena&apos;s maximum allowed tutor discount ({defaultOfferPolicySettings.maxTutorDiscountPct}%).
                </p>
              )}

              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-ensena-bg-soft p-2.5 text-xs text-ensena-ink">
                <Info className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" />
                <div>
                  <p>Student pays {formatNaira(split.gross)}</p>
                  <p>Ensena fee (15%): {formatNaira(split.commission)}</p>
                  <p className="font-semibold">You earn: {formatNaira(split.net)}</p>
                </div>
              </div>
            </div>
          )}

          {isSpecialOffer && (
            <p className="mt-3 text-xs text-ensena-muted">
              This offer will expire exactly {defaultOfferPolicySettings.defaultExpirationHours} hours after you send it.
            </p>
          )}

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Optional message</span>
            <textarea value={message} onChange={(e) => { setMessage(e.target.value); setBlockedMessage(null); }} rows={2} placeholder="Add a note for your student…" className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          {blockedMessage && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{blockedMessage}</p>}

          {!isSpecialOffer && !isFreeDiscovery && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
              <span className="font-semibold text-ensena-ink">Total</span>
              <span className="font-semibold text-ensena-primary">{formatNaira(totalFinal)}</span>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
          >
            {isSpecialOffer ? "Send Special Offer" : "Send Pre-approval"}
          </Button>
          <button type="button" onClick={onClose} className="mt-2 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
