"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Star, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { useFeaturedGroupClasses, useFeaturedTutors } from "@/hooks/use-featured-placements";
import { formatNaira } from "@/lib/format";
import {
  discountCodes as initialDiscountCodes,
  freeTrialCampaigns as initialFreeTrialCampaigns,
  referralProgram,
  type DiscountCode,
  type DiscountCodeStatus,
  type FreeTrialCampaign,
} from "@/lib/admin-promotions-data";
import { unfeatureGroupClass, unfeatureTutor } from "@/lib/admin-promotions-store";
import { cn } from "@/lib/utils";

const tabs = ["Discount Codes", "Referral Rewards", "Free Trial Campaigns", "Featured Tutors", "Featured Group Classes"] as const;
type Tab = (typeof tabs)[number];

const discountStatusStyles: Record<DiscountCodeStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Scheduled: "bg-amber-100 text-amber-700",
  Expired: "bg-slate-100 text-slate-600",
  Disabled: "bg-rose-100 text-rose-700",
};

export function AdminPromotionsClient() {
  const [tab, setTab] = useState<Tab>("Discount Codes");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(initialDiscountCodes);
  const featuredTutorSlots = useFeaturedTutors();
  const featuredGroupClassSlots = useFeaturedGroupClasses();
  const [freeTrialCampaigns, setFreeTrialCampaigns] = useState<FreeTrialCampaign[]>(initialFreeTrialCampaigns);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2200);
  }

  function disableCode(id: string) {
    setDiscountCodes((prev) => prev.map((d) => (d.id === id ? { ...d, status: "Disabled" as const } : d)));
    flash("Code disabled.");
  }
  function removeFeaturedTutor(id: string) {
    unfeatureTutor(id);
    flash("Tutor removed from featured placements.");
  }
  function removeFeaturedGroupClass(id: string) {
    unfeatureGroupClass(id);
    flash("Class removed from featured placements.");
  }
  function createItem() {
    const name = createName.trim();
    if (!name) return;
    if (tab === "Discount Codes") {
      setDiscountCodes((prev) => [
        { id: `promo-${Date.now()}`, code: name.toUpperCase(), type: "Percentage", value: 10, usageCount: 0, usageLimit: 500, expiresAt: "—", status: "Active" },
        ...prev,
      ]);
    } else {
      setFreeTrialCampaigns((prev) => [
        { id: `trial-${Date.now()}`, name, audience: "New Students", durationDays: 7, signups: 0, conversionPct: 0, status: "Active" },
        ...prev,
      ]);
    }
    flash("Created successfully.");
    setCreateName("");
    setCreateOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Promotions</h1>
          <p className="mt-1 text-sm text-ensena-muted">Discount codes, referral rewards, free trials and featured placements.</p>
        </div>
        {(tab === "Discount Codes" || tab === "Free Trial Campaigns") && (
          <Button onClick={() => setCreateOpen(true)} className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            <Plus className="size-4" /> {tab === "Discount Codes" ? "Create Coupon" : "Create Campaign"}
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("shrink-0 rounded-full px-4 py-2 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Discount Codes" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Discount</th>
                  <th className="py-2 pr-4 font-medium">Usage</th>
                  <th className="py-2 pr-4 font-medium">Expires</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discountCodes.map((d) => (
                  <tr key={d.id} className="border-b border-ensena-border last:border-0">
                    <td className="py-3 pr-4 font-mono font-medium text-ensena-ink">{d.code}</td>
                    <td className="py-3 pr-4 text-ensena-ink">{d.type === "Percentage" ? `${d.value}%` : formatNaira(d.value)}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{d.usageCount.toLocaleString()} / {d.usageLimit.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{d.expiresAt}</td>
                    <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discountStatusStyles[d.status])}>{d.status}</span></td>
                    <td className="py-3 pr-4">
                      {d.status === "Disabled" ? (
                        <span className="text-xs text-ensena-muted">Disabled</span>
                      ) : (
                        <button type="button" onClick={() => disableCode(d.id)} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Disable</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Referral Rewards" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Referrer Reward</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{formatNaira(referralProgram.referrerReward)}</p></div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Referee Reward</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{formatNaira(referralProgram.refereeReward)}</p></div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Total Referrals</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{referralProgram.totalReferrals.toLocaleString()}</p></div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Successful Referrals</p><p className="mt-1 text-xl font-semibold text-ensena-success">{referralProgram.successfulReferrals.toLocaleString()}</p></div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Total Payout</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{formatNaira(referralProgram.totalPayout)}</p></div>
        </div>
      )}

      {tab === "Free Trial Campaigns" && (
        <div className="mt-5 flex flex-col gap-3">
          {freeTrialCampaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{c.name}</p>
                <p className="text-xs text-ensena-muted">{c.audience} · {c.durationDays} days</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-ensena-muted">
                <span>{c.signups.toLocaleString()} signups</span>
                <span>{c.conversionPct}% conversion</span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Featured Tutors" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featuredTutorSlots.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="48px" className="object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{t.name}</p>
                <p className="truncate text-xs text-ensena-muted">{t.subject}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <LiveTutorRating name={t.name} rating={t.rating} reviews={0}>{(live) => live.rating}</LiveTutorRating>
                  · Featured until {t.featuredUntil}
                </p>
              </div>
              <button type="button" onClick={() => removeFeaturedTutor(t.id)} className="shrink-0 rounded-full border border-ensena-border px-2.5 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Remove</button>
            </div>
          ))}
          {featuredTutorSlots.length === 0 && <p className="text-sm text-ensena-muted">No tutors currently featured.</p>}
        </div>
      )}

      {tab === "Featured Group Classes" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featuredGroupClassSlots.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Users2 className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                <p className="truncate text-xs text-ensena-muted">{c.tutor} · {c.seatsFilled}/{c.seatsTotal} students</p>
                <p className="text-xs text-ensena-muted">Featured until {c.featuredUntil}</p>
              </div>
              <button type="button" onClick={() => removeFeaturedGroupClass(c.id)} className="shrink-0 rounded-full border border-ensena-border px-2.5 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Remove</button>
            </div>
          ))}
          {featuredGroupClassSlots.length === 0 && <p className="text-sm text-ensena-muted">No classes currently featured.</p>}
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setCreateName(""); }} title={tab === "Discount Codes" ? "Create Coupon" : "Create Campaign"}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Name</span>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={tab === "Discount Codes" ? "e.g. SUMMER15" : "e.g. New Year Free Trial"}
              className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
            />
          </label>
          <Button onClick={createItem} disabled={!createName.trim()} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
            Create
          </Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
