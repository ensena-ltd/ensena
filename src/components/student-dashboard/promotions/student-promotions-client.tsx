"use client";

import Link from "next/link";
import { ChevronLeft, Copy, Tag } from "lucide-react";
import { toast } from "sonner";

import { formatNaira } from "@/lib/format";

export interface StudentPromotion {
  id: string;
  title: string;
  description: string;
  code: string | null;
  discountType: "percent" | "amount" | "none";
  discountValue: number;
  appliesTo: "all" | "private" | "group" | "counselling";
  endsAt: string | null;
}

const appliesLabel: Record<StudentPromotion["appliesTo"], string> = {
  all: "All classes",
  private: "Private lessons",
  group: "Group classes",
  counselling: "Counselling",
};

const appliesHref: Record<StudentPromotion["appliesTo"], string> = {
  all: "/student-dashboard/find-a-tutor",
  private: "/student-dashboard/find-a-tutor",
  group: "/student-dashboard/group-classes",
  counselling: "/student-dashboard/counselling",
};

function discountLabel(p: StudentPromotion): string | null {
  if (p.discountType === "percent" && p.discountValue > 0) return `${p.discountValue}% off`;
  if (p.discountType === "amount" && p.discountValue > 0) return `${formatNaira(p.discountValue)} off`;
  return null;
}

export function StudentPromotionsClient({ promotions }: { promotions: StudentPromotion[] }) {
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${code} copied.`);
    } catch {
      toast.error("Couldn't copy — select the code and copy it manually.");
    }
  }

  return (
    <div>
      <Link href="/student-dashboard" className="flex w-fit items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
        <ChevronLeft className="size-4" /> Back to Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-heading text-2xl font-semibold text-ensena-ink">
        <Tag className="size-6 text-ensena-primary" /> Promotions &amp; Offers
      </h1>
      <p className="mt-1 text-sm text-ensena-muted">Real, currently-active campaigns you can use on your classes.</p>

      {promotions.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-ensena-border px-6 py-12 text-center">
          <Tag className="size-6 text-ensena-muted" />
          <p className="mt-3 text-sm text-ensena-muted">No promotions are active right now — check back soon.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {promotions.map((p) => {
            const discount = discountLabel(p);
            return (
              <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-base font-semibold text-ensena-ink">{p.title}</h2>
                  {discount && <span className="shrink-0 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-semibold text-ensena-primary">{discount}</span>}
                </div>
                {p.description && <p className="text-sm text-ensena-muted">{p.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ensena-muted">
                  <span>Applies to: <span className="font-medium text-ensena-ink">{appliesLabel[p.appliesTo]}</span></span>
                  <span>
                    {p.endsAt ? (
                      <>Ends <span className="font-medium text-ensena-ink">{new Date(p.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" })}</span></>
                    ) : (
                      "No end date"
                    )}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-3">
                  {p.code ? (
                    <button type="button" onClick={() => copy(p.code!)} className="flex items-center gap-2 rounded-full border border-dashed border-ensena-primary/40 px-3 py-1.5 font-mono text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                      {p.code} <Copy className="size-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-ensena-muted">Applied automatically, no code needed</span>
                  )}
                  <Link href={appliesHref[p.appliesTo]} className="text-sm font-semibold text-ensena-primary hover:underline">
                    Use offer
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
