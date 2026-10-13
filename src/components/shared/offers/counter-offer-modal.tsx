"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { checkOfferTextAllowed } from "@/lib/messages-store";
import {
  defaultOfferPolicySettings,
  discountPctFromFinal,
  exceedsMaxDiscount,
  totalFinalPrice,
  totalStandardPrice,
  type Offer,
} from "@/lib/offers-data";

// Shared by both roles — a tutor's special offer/pre-approval and a
// student's counter of it are the exact same action (propose a new total
// price on the same negotiation thread), so one modal covers both instead
// of two near-identical ones. Countering never changes the offer's own id:
// it's still the same deal, just at a new price, with the full history kept.
export function CounterOfferModal({
  open,
  offer,
  viewerRole,
  onClose,
  onSend,
}: {
  open: boolean;
  offer: Offer | null;
  viewerRole: "tutor" | "student";
  onClose: () => void;
  onSend: (offer: Offer) => void;
}) {
  const standardTotal = offer ? totalStandardPrice(offer) : 0;
  const currentTotal = offer ? totalFinalPrice(offer) : 0;
  const [counterTotal, setCounterTotal] = useState(currentTotal);
  const [note, setNote] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  if (!open || !offer) return null;

  const lessonsCount = offer.lessonsCount || 1;
  const resolvedDiscountPct = discountPctFromFinal(standardTotal, counterTotal);
  const overLimit = viewerRole === "tutor" && exceedsMaxDiscount(standardTotal, counterTotal, defaultOfferPolicySettings);
  const canSend = counterTotal > 0 && counterTotal <= standardTotal && !overLimit;

  function handleSend() {
    if (!canSend || !offer) return;
    const senderName = viewerRole === "tutor" ? offer.tutorName : offer.studentName;
    const denied = checkOfferTextAllowed([note], senderName, viewerRole === "tutor" ? "Tutor" : "Student");
    if (denied && !denied.ok) {
      setBlockedMessage(denied.userMessage);
      return;
    }
    setBlockedMessage(null);
    const nowIso = new Date().toISOString();
    const finalPricePerSession = Math.round(counterTotal / lessonsCount);
    const priorHistory =
      offer.history && offer.history.length > 0
        ? offer.history
        : [
            {
              price: currentTotal,
              discountPct: offer.discountPct,
              by: (offer.kind === "request" ? "student" : "tutor") as "tutor" | "student",
              at: offer.createdAt,
            },
          ];
    const updated: Offer = {
      ...offer,
      kind: "special-offer",
      finalPricePerSession,
      discountPct: resolvedDiscountPct,
      discountRequestMessage: viewerRole === "student" ? note.trim() || offer.discountRequestMessage : offer.discountRequestMessage,
      message: viewerRole === "tutor" ? note.trim() || offer.message : offer.message,
      counterOfOfferId: offer.id,
      history: [...priorHistory, { price: counterTotal, discountPct: resolvedDiscountPct, by: viewerRole, at: nowIso, note: note.trim() || undefined }],
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
      status: "Sent",
    };
    onSend(updated);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="counter-offer-title">
      <div className="w-full max-w-sm rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="counter-offer-title" className="font-heading text-lg font-semibold text-ensena-ink">
            Make a Counter-Offer
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
            <span className="text-ensena-muted">Current offer</span>
            <span className="font-semibold text-ensena-ink">{formatNaira(currentTotal)}</span>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Your counter price (total)</span>
            <input
              type="number"
              min={1}
              max={standardTotal}
              value={counterTotal}
              onChange={(e) => setCounterTotal(Number(e.target.value))}
              className="h-11 rounded-lg border border-ensena-border px-3 text-sm font-semibold text-ensena-ink"
            />
          </label>
          <p className="mt-1 text-xs text-ensena-muted">
            Standard price {formatNaira(standardTotal)} · {resolvedDiscountPct}% off
          </p>

          {overLimit && (
            <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
              This exceeds Ensena&apos;s maximum allowed discount ({defaultOfferPolicySettings.maxTutorDiscountPct}%).
            </p>
          )}

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Optional note</span>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setBlockedMessage(null); }}
              rows={2}
              placeholder="Add a note for why you're countering…"
              className="rounded-lg border border-ensena-border p-2.5 text-sm"
            />
          </label>
          {blockedMessage && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{blockedMessage}</p>}

          <p className="mt-3 text-xs text-ensena-muted">
            This counter-offer will expire exactly {defaultOfferPolicySettings.defaultExpirationHours} hours after you send it.
          </p>

          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
          >
            Send Counter-Offer
          </Button>
          <button type="button" onClick={onClose} className="mt-2 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
