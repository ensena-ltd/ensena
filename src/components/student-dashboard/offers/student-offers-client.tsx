"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { CounterOfferModal } from "@/components/shared/offers/counter-offer-modal";
import { OfferMessageCard } from "@/components/shared/offers/offer-message-card";
import { useStudentMessages } from "@/hooks/use-messages";
import { respondToOffer } from "@/lib/messages-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { offers as seedOffers, type Offer } from "@/lib/offers-data";

// Real offers now live as `.offer` payloads on real messages
// (messages-store.ts) — accepting/declining/countering here writes through
// the same respondToOffer choke point Messages itself uses, so this page
// and the conversation it came from never disagree. The static seed
// offers array still backs the initial demo state; a live offer that
// happens to share a seed id (shouldn't in practice — ids are generated
// independently) wins, since it reflects what actually happened.
export function StudentOffersClient() {
  const router = useRouter();
  const messages = useStudentMessages();
  const [counterOfferFor, setCounterOfferFor] = useState<Offer | null>(null);

  const liveOffers = messages.filter((m) => m.offer && m.offer.studentName === dashboardStudent.name).map((m) => m.offer as Offer);
  const seedForStudent = seedOffers.filter((o) => o.studentName === dashboardStudent.name && !liveOffers.some((live) => live.id === o.id));
  const offers = [...liveOffers, ...seedForStudent].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function accept(offer: Offer) {
    const result = respondToOffer(offer.id, (o) => ({ ...o, status: "Accepted" }), "student");
    if (!result.ok) return;
    if (offer.bookingKind === "group-class" && offer.groupClassSlug) {
      router.push(`/group-classes/${offer.groupClassSlug}`);
      return;
    }
    const path = offer.bookingKind === "discovery" ? "discovery-session" : "book";
    router.push(`/find-teachers/${offer.tutorSlug}/${path}?offerId=${offer.id}`);
  }

  function decline(id: string) {
    respondToOffer(id, (o) => ({ ...o, status: "Declined" }), "student");
  }

  function withdraw(id: string) {
    respondToOffer(id, (o) => ({ ...o, status: "Withdrawn" }), "student");
  }

  function requestRenew(offer: Offer) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(offer.tutorName)}`);
  }

  function sendCounterOffer(updated: Offer) {
    respondToOffer(updated.id, () => updated, "student");
    setCounterOfferFor(null);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Requests &amp; Offers</h1>
        <p className="mt-1 text-sm text-ensena-muted">
          Requests you&apos;ve sent are awaiting a tutor&apos;s response. Pre-approvals confirm a tutor&apos;s
          normal rate; Special Offers are a customized, discounted price. You can also reply to these directly in{" "}
          <Link href="/student-dashboard/messages" className="text-ensena-primary hover:underline">Messages</Link>.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {offers.map((offer) => (
          <OfferMessageCard
            key={offer.id}
            offer={offer}
            viewerRole="student"
            onAccept={() => accept(offer)}
            onDecline={() => decline(offer.id)}
            onRequestRenew={() => requestRenew(offer)}
            onWithdraw={() => withdraw(offer.id)}
            onCounter={() => setCounterOfferFor(offer)}
          />
        ))}
        {offers.length === 0 && (
          <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">
            You don&apos;t have any requests or offers yet. When you request a Pre-approval, or a tutor sends you
            one, it&apos;ll show up here.
          </p>
        )}
      </div>

      <CounterOfferModal
        key={`counter-${counterOfferFor?.id ?? "none"}`}
        open={counterOfferFor !== null}
        offer={counterOfferFor}
        viewerRole="student"
        onClose={() => setCounterOfferFor(null)}
        onSend={sendCounterOffer}
      />
    </div>
  );
}
