"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageSquare, RefreshCcw, XCircle } from "lucide-react";

import { CounterOfferModal } from "@/components/shared/offers/counter-offer-modal";
import { OfferStatusPill } from "@/components/shared/offers/offer-status-pill";
import { useTutorMessages } from "@/hooks/use-messages";
import { formatNaira } from "@/lib/format";
import { respondToOffer } from "@/lib/messages-store";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import {
  bookingKindLabel,
  commissionSplitForOffer,
  defaultOfferPolicySettings,
  discountPctFromFinal,
  effectiveStatus,
  lastProposalBy,
  offers as seedOffers,
  totalFinalPrice,
  totalStandardPrice,
  type Offer,
  type OfferStatus,
} from "@/lib/offers-data";
import { cn } from "@/lib/utils";

type Tab = "All" | "New Requests" | "Awaiting Student" | "Special Offers" | "Booked" | "Declined" | "Expired";
const tabs: Tab[] = ["All", "New Requests", "Awaiting Student", "Special Offers", "Booked", "Declined", "Expired"];

export function TutorOffersClient() {
  const router = useRouter();
  const messages = useTutorMessages();
  const [draftOffers, setDraftOffers] = useState<Offer[]>([]);
  const [tab, setTab] = useState<Tab>("All");
  const [toast, setToast] = useState<string | null>(null);
  const [counterOfferFor, setCounterOfferFor] = useState<Offer | null>(null);

  const offers = useMemo(() => {
    const liveOffers = messages.filter((m) => m.offer && m.offer.tutorName === dashboardTutor.name).map((m) => m.offer as Offer);
    const seedForTutor = seedOffers.filter((o) => o.tutorName === dashboardTutor.name && !liveOffers.some((live) => live.id === o.id));
    return [...draftOffers, ...liveOffers, ...seedForTutor];
  }, [messages, draftOffers]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      const status = effectiveStatus(o);
      const isPending = status === "Sent" || status === "Viewed";
      if (tab === "New Requests") return o.kind === "request" && isPending;
      if (tab === "Awaiting Student") return o.kind !== "request" && isPending;
      if (tab === "Special Offers") return o.kind === "special-offer";
      if (tab === "Booked") return status === "Accepted" || status === "Paid";
      if (tab === "Expired") return status === "Expired";
      if (tab === "Declined") return status === "Declined" || status === "Withdrawn";
      return true;
    });
  }, [offers, tab]);

  function messageStudent(studentName: string) {
    router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(studentName)}`);
  }

  function withdraw(id: string) {
    const result = respondToOffer(id, (o) => ({ ...o, status: "Withdrawn" }));
    flash(result.ok ? "Offer withdrawn." : "This offer could not be found.");
  }

  // A fresh, real 24-hour expiration — never a resurrection of the old one.
  function renew(id: string) {
    const result = respondToOffer(id, (o) => ({
      ...o,
      status: "Sent",
      expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
    }));
    flash(result.ok ? "Offer renewed and sent again." : "This offer could not be found.");
  }

  function acceptCounterOffer(id: string) {
    const result = respondToOffer(id, (o) => {
      const nowIso = new Date().toISOString();
      return {
        ...o,
        history: [...(o.history ?? []), { price: totalFinalPrice(o), discountPct: o.discountPct, by: "tutor" as const, at: nowIso, note: "Accepted the counter-offer" }],
        status: "Sent",
        expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
      };
    });
    flash(result.ok ? "Counter-offer accepted. Awaiting the student to book." : "This offer could not be found.");
  }

  function sendCounterOffer(updated: Offer) {
    const result = respondToOffer(updated.id, () => updated);
    flash(result.ok ? "Counter-offer sent." : "This offer has expired and can no longer be countered.");
    setCounterOfferFor(null);
  }

  // A draft prefill only — not a real, persisted offer until it's actually
  // sent from Messages (which is what creates the real record).
  function duplicate(offer: Offer) {
    const copy: Offer = { ...offer, id: `off-${Date.now()}`, status: "Draft", createdAt: new Date().toISOString() };
    setDraftOffers((prev) => [copy, ...prev]);
    flash("Offer duplicated as a new draft. Open Messages to send it.");
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Requests &amp; Pre-approvals</h1>
        <p className="mt-1 text-sm text-ensena-muted">
          Students can request a schedule before booking. Respond by accepting at your normal rate, sending a
          Special Offer, suggesting a different time, or declining.
        </p>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors",
              tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {filtered.map((offer) => {
          const status: OfferStatus = effectiveStatus(offer);
          const standardTotal = totalStandardPrice(offer);
          const finalTotal = totalFinalPrice(offer);
          const discountPct = offer.kind === "special-offer" ? discountPctFromFinal(offer.standardPricePerSession, offer.finalPricePerSession) : 0;
          const split = commissionSplitForOffer(offer);
          const isPending = status === "Sent" || status === "Viewed";
          const canRenew = status === "Expired" || status === "Declined";
          const isTutorTurn = isPending && offer.kind !== "request" && lastProposalBy(offer) === "student";

          return (
            <div key={offer.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-semibold text-ensena-ink">{offer.studentName}</p>
                  <p className="text-xs text-ensena-muted">
                    {offer.subject} · {bookingKindLabel(offer.bookingKind)} ·{" "}
                    {offer.kind === "special-offer" ? "Special Offer" : offer.kind === "request" ? "Request" : "Pre-approval"}
                  </p>
                </div>

                <div className="text-right">
                  {offer.kind === "request" ? (
                    <p className="text-sm font-medium text-ensena-muted">Not yet priced</p>
                  ) : offer.kind === "special-offer" ? (
                    <>
                      <p className="text-sm text-ensena-muted line-through">{formatNaira(standardTotal)}</p>
                      <p className="text-sm font-semibold text-ensena-primary">{formatNaira(finalTotal)} <span className="text-xs font-normal text-ensena-muted">(−{discountPct}%)</span></p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-ensena-ink">{offer.bookingKind === "discovery" ? "Free" : formatNaira(finalTotal)}</p>
                  )}
                  {offer.kind !== "request" && <p className="text-[11px] text-ensena-muted">You earn {formatNaira(split.net)}</p>}
                </div>

                <OfferStatusPill status={status} />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-ensena-border pt-2.5 text-xs text-ensena-muted">
                <span>
                  Created {new Date(offer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {isPending && ` · Expires ${new Date(offer.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => messageStudent(offer.studentName)}
                    className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    <MessageSquare className="size-3" /> Message
                  </button>
                  {isTutorTurn && (
                    <>
                      <button
                        type="button"
                        onClick={() => acceptCounterOffer(offer.id)}
                        className="flex items-center gap-1 rounded-full bg-ensena-primary px-2.5 py-1 font-medium text-white hover:bg-[var(--ensena-primary-hover)]"
                      >
                        <Check className="size-3" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterOfferFor(offer)}
                        className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                      >
                        <RefreshCcw className="size-3" /> Counter
                      </button>
                    </>
                  )}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => withdraw(offer.id)}
                      className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      <XCircle className="size-3" /> Withdraw
                    </button>
                  )}
                  {canRenew && (
                    <button
                      type="button"
                      onClick={() => renew(offer.id)}
                      className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      <RefreshCcw className="size-3" /> Renew
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicate(offer)}
                    className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    <Copy className="size-3" /> Duplicate
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">
            No offers in this category.
          </p>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <CounterOfferModal
        key={`counter-${counterOfferFor?.id ?? "none"}`}
        open={counterOfferFor !== null}
        offer={counterOfferFor}
        viewerRole="tutor"
        onClose={() => setCounterOfferFor(null)}
        onSend={sendCounterOffer}
      />
    </div>
  );
}
