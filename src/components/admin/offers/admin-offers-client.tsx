"use client";

import { useMemo, useState } from "react";

import { OfferStatusPill } from "@/components/shared/offers/offer-status-pill";
import { formatNaira } from "@/lib/format";
import {
  bookingKindLabel,
  commissionSplitForOffer,
  defaultOfferPolicySettings,
  discountPctFromFinal,
  effectiveStatus,
  offers as seedOffers,
  totalFinalPrice,
  totalStandardPrice,
  type OfferPolicySettings,
} from "@/lib/offers-data";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ensena-primary" : "bg-ensena-border")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

type Tab = "Offers" | "Settings";

export function AdminOffersClient() {
  const [tab, setTab] = useState<Tab>("Offers");
  const [settings, setSettings] = useState<OfferPolicySettings>(defaultOfferPolicySettings);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2200);
  }

  const rows = useMemo(
    () =>
      seedOffers.map((o) => ({
        offer: o,
        status: effectiveStatus(o),
        standardTotal: totalStandardPrice(o),
        finalTotal: totalFinalPrice(o),
        discountPct: o.kind === "special-offer" ? discountPctFromFinal(o.standardPricePerSession, o.finalPricePerSession) : 0,
        split: commissionSplitForOffer(o),
      })),
    []
  );

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Pre-approvals &amp; Special Offers</h1>
        <p className="mt-1 text-sm text-ensena-muted">
          Conversations that convert directly into bookings. Ensena&apos;s 15% commission is always calculated from
          the actual discounted amount a student pays, never the standard price.
        </p>
      </div>

      <div className="mt-5 flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {(["Offers", "Settings"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Offers" && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="px-4 py-3 font-medium">Tutor</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Standard</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Final Price</th>
                <th className="px-4 py-3 font-medium">Ensena Fee</th>
                <th className="px-4 py-3 font-medium">Tutor Earns</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ offer, status, standardTotal, finalTotal, discountPct, split }) => (
                <tr key={offer.id} className="border-b border-ensena-border last:border-0">
                  <td className="px-4 py-3 text-ensena-ink">{offer.tutorName}</td>
                  <td className="px-4 py-3 text-ensena-ink">{offer.studentName}</td>
                  <td className="px-4 py-3 text-ensena-muted">{offer.kind === "special-offer" ? "Special Offer" : offer.kind === "request" ? "Request" : "Pre-approval"} · {bookingKindLabel(offer.bookingKind)}</td>
                  <td className="px-4 py-3 text-ensena-muted">{offer.bookingKind === "discovery" ? "Free" : formatNaira(standardTotal)}</td>
                  <td className="px-4 py-3 text-ensena-muted">{discountPct > 0 ? `${discountPct}%` : "N/A"}</td>
                  <td className="px-4 py-3 font-medium text-ensena-ink">{offer.bookingKind === "discovery" ? "Free" : formatNaira(finalTotal)}</td>
                  <td className="px-4 py-3 text-ensena-muted">{offer.bookingKind === "discovery" ? "N/A" : formatNaira(split.commission)}</td>
                  <td className="px-4 py-3 text-ensena-muted">{offer.bookingKind === "discovery" ? "N/A" : formatNaira(split.net)}</td>
                  <td className="px-4 py-3 text-ensena-muted">{new Date(offer.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-4 py-3"><OfferStatusPill status={status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Settings" && (
        <div className="mt-5 max-w-lg rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between rounded-xl border border-ensena-border p-3.5">
            <div>
              <p className="text-sm font-medium text-ensena-ink">Enable Special Offers</p>
              <p className="text-xs text-ensena-muted">Let tutors send customized, discounted booking proposals.</p>
            </div>
            <Toggle checked={settings.specialOffersEnabled} onChange={(v) => setSettings((s) => ({ ...s, specialOffersEnabled: v }))} />
          </div>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Maximum tutor discount</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={90}
                value={settings.maxTutorDiscountPct}
                onChange={(e) => setSettings((s) => ({ ...s, maxTutorDiscountPct: Number(e.target.value) }))}
                className="h-10 w-28 rounded-lg border border-ensena-border px-3 text-sm"
              />
              <span className="text-sm text-ensena-muted">%</span>
            </div>
          </label>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Default expiration</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.defaultExpirationHours}
                onChange={(e) => setSettings((s) => ({ ...s, defaultExpirationHours: Number(e.target.value) }))}
                className="h-10 w-28 rounded-lg border border-ensena-border px-3 text-sm"
              />
              <span className="text-sm text-ensena-muted">hours</span>
            </div>
          </label>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-ensena-border p-3.5">
            <div>
              <p className="text-sm font-medium text-ensena-ink">Allow Discovery Session Pre-approvals</p>
              <p className="text-xs text-ensena-muted">
                Discovery Sessions are free for every student, so only scheduling can be pre-approved. There&apos;s
                no price to discount.
              </p>
            </div>
            <Toggle checked={settings.allowDiscoverySessionOffers} onChange={(v) => setSettings((s) => ({ ...s, allowDiscoverySessionOffers: v }))} />
          </div>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Minimum booking price (after discount)</span>
            <input
              type="number"
              min={0}
              value={settings.minBookingPrice}
              onChange={(e) => setSettings((s) => ({ ...s, minBookingPrice: Number(e.target.value) }))}
              className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => flash("Offer policy settings saved.")}
            className="mt-4 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Save Changes
          </button>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
