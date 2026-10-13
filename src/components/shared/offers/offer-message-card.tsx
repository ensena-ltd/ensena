"use client";

import { useEffect, useState } from "react";

import { OfferStatusPill } from "@/components/shared/offers/offer-status-pill";
import { formatNaira } from "@/lib/format";
import {
  bookingKindLabel,
  effectiveStatus,
  formatCountdown,
  formatOfferTime,
  lastProposalBy,
  savingsAmount,
  totalFinalPrice,
  totalStandardPrice,
  type Offer,
} from "@/lib/offers-data";
import { calendarViewDate } from "@/lib/tutor-dashboard-data";

export function OfferMessageCard({
  offer,
  viewerRole,
  onAccept,
  onDecline,
  onWithdraw,
  onRequestRenew,
  onRenew,
  onAcceptRequest,
  onSendSpecialOfferForRequest,
  onSuggestChanges,
  onDeclineRequest,
  onCounter,
  onAcceptCounter,
}: {
  offer: Offer;
  viewerRole: "tutor" | "student";
  onAccept?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
  onRequestRenew?: () => void;
  onRenew?: () => void;
  onAcceptRequest?: () => void;
  onSendSpecialOfferForRequest?: () => void;
  onSuggestChanges?: () => void;
  onDeclineRequest?: () => void;
  onCounter?: () => void;
  onAcceptCounter?: () => void;
}) {
  // Starts at the fixed SSR-safe placeholder (same pattern as useTodayISO)
  // so the server render and the client's first render match exactly; the
  // real time is only applied here, post-mount, avoiding a hydration
  // mismatch on the "Expires in Xh Ym" countdown.
  const [now, setNow] = useState(() => new Date(calendarViewDate));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const status = effectiveStatus(offer, now);
  const isRequest = offer.kind === "request";
  const isSpecialOffer = offer.kind === "special-offer";
  const isFree = offer.bookingKind === "discovery" && offer.finalPricePerSession === 0;
  const standardTotal = totalStandardPrice(offer);
  const finalTotal = totalFinalPrice(offer);
  const savings = savingsAmount(offer);
  const isPending = status === "Sent" || status === "Viewed";
  const lastBy = lastProposalBy(offer);
  // Whichever side didn't make the most recent price proposal is the one
  // who can now act — this is what lets a student counter, the tutor
  // counter back, and so on, on the very same offer record.
  const studentCanAct = viewerRole === "student" && isPending && !isRequest && lastBy === "tutor";
  const tutorCanRespondToRequest = viewerRole === "tutor" && isPending && isRequest;
  const tutorCanRespondToCounter = viewerRole === "tutor" && isPending && !isRequest && lastBy === "student";
  const canCounter = !isFree && standardTotal > 0;
  const negotiationHistory = offer.history && offer.history.length > 1 ? offer.history : undefined;

  const headerText = isRequest
    ? viewerRole === "tutor"
      ? `${offer.studentName.split(" ")[0]} wants to learn with you`
      : `Your request to ${offer.tutorName.split(" ")[0]}`
    : viewerRole === "student"
      ? isSpecialOffer
        ? `Special Offer from ${offer.tutorName.split(" ")[0]}`
        : `Pre-approval from ${offer.tutorName.split(" ")[0]}`
      : isSpecialOffer
        ? `Special Offer to ${offer.studentName.split(" ")[0]}`
        : `Pre-approval to ${offer.studentName.split(" ")[0]}`;

  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-ensena-primary/25 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ensena-primary">{headerText}</span>
        <OfferStatusPill status={isRequest && isPending ? "Sent" : status} label={isRequest && isPending ? "Awaiting Tutor" : undefined} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ensena-ink">
        <span className="font-medium">{offer.subject}</span>
        <span className="text-ensena-muted">·</span>
        <span>{offer.groupClassTitle ?? bookingKindLabel(offer.bookingKind)}</span>
        {offer.bookingKind !== "group-class" && (
          <>
            <span className="text-ensena-muted">·</span>
            <span>{offer.durationMins} minutes</span>
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-ensena-muted">
        {new Date(offer.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        {offer.bookingKind !== "group-class" && ` · ${formatOfferTime(offer.time)}`}
        {offer.frequency !== "one-time" && offer.bookingKind !== "group-class" && ` · ${offer.lessonsCount} lessons`}
        {offer.preferredDays && offer.preferredDays.length > 0 && ` · ${offer.preferredDays.join(", ")}`}
      </p>

      {offer.message && (
        <p className="mt-2 rounded-lg bg-white/70 p-2.5 text-xs text-ensena-ink">{offer.message}</p>
      )}

      {offer.discountRequestMessage && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          <p className="font-semibold">Student requested a special price</p>
          <p className="mt-0.5">{offer.discountRequestMessage}</p>
        </div>
      )}

      {!isRequest && (
        <div className="mt-3 rounded-xl bg-white p-3">
          {isFree ? (
            <p className="text-lg font-semibold text-ensena-success">Free</p>
          ) : isSpecialOffer ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-ensena-muted line-through">{formatNaira(standardTotal)}</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(finalTotal)}</span>
              </div>
              <p className="text-xs font-medium text-ensena-success">You save {formatNaira(savings)}</p>
            </>
          ) : (
            <p className="text-lg font-semibold text-ensena-ink">{offer.bookingKind === "discovery" ? "Free" : formatNaira(finalTotal)}</p>
          )}
        </div>
      )}

      {isPending && !isRequest && (
        <p className="mt-2 text-xs text-ensena-muted">Expires in {formatCountdown(offer.expiresAt, now)}</p>
      )}

      {negotiationHistory && (
        <details className="mt-2 rounded-lg bg-white/70 p-2.5 text-xs text-ensena-ink">
          <summary className="cursor-pointer font-medium text-ensena-muted">Negotiation history ({negotiationHistory.length})</summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {negotiationHistory.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-ensena-muted">{h.by === "tutor" ? offer.tutorName.split(" ")[0] : offer.studentName.split(" ")[0]} proposed</span>
                <span className="font-medium">{formatNaira(h.price)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {studentCanAct && (
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="h-9 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              Accept &amp; Book
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="h-9 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Decline
            </button>
          </div>
          {canCounter && (
            <button
              type="button"
              onClick={onCounter}
              className="h-9 w-full rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Counter-Offer
            </button>
          )}
        </div>
      )}

      {tutorCanRespondToCounter && (
        <div className="mt-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onAcceptCounter}
            className="h-9 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Accept Counter-Offer
          </button>
          <div className="flex gap-1.5">
            {canCounter && (
              <button
                type="button"
                onClick={onCounter}
                className="h-9 flex-1 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                Counter Back
              </button>
            )}
            <button
              type="button"
              onClick={onDecline}
              className="h-9 rounded-full border border-ensena-border px-4 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {tutorCanRespondToRequest && (
        <div className="mt-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onAcceptRequest}
            className="h-9 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Accept &amp; Send Pre-approval
          </button>
          <button
            type="button"
            onClick={onSendSpecialOfferForRequest}
            className="h-9 w-full rounded-full border border-ensena-primary text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
          >
            Send Special Offer
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onSuggestChanges}
              className="h-9 flex-1 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Suggest Changes
            </button>
            <button
              type="button"
              onClick={onDeclineRequest}
              className="h-9 rounded-full border border-ensena-border px-4 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {isRequest && viewerRole === "student" && isPending && (
        <button
          type="button"
          onClick={onWithdraw}
          className="mt-3 w-full rounded-full border border-ensena-border py-2 text-center text-xs font-medium text-ensena-muted hover:bg-ensena-bg-soft"
        >
          Withdraw Request
        </button>
      )}

      {status === "Expired" && viewerRole === "student" && !isRequest && (
        <button
          type="button"
          onClick={onRequestRenew}
          className="mt-3 w-full rounded-full border border-ensena-border py-2 text-center text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
        >
          Ask Tutor to Renew
        </button>
      )}

      {viewerRole === "tutor" && isPending && !isRequest && (
        <button
          type="button"
          onClick={onWithdraw}
          className="mt-3 w-full text-center text-xs font-medium text-ensena-muted hover:text-ensena-ink"
        >
          Withdraw offer
        </button>
      )}

      {viewerRole === "tutor" && (status === "Expired" || status === "Declined") && !isRequest && (
        <button
          type="button"
          onClick={onRenew}
          className="mt-3 w-full rounded-full border border-ensena-border py-2 text-center text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
        >
          Renew Offer
        </button>
      )}
    </div>
  );
}
