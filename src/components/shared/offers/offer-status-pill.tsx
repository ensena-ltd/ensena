import type { OfferStatus } from "@/lib/offers-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<OfferStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-indigo-100 text-indigo-700",
  Accepted: "bg-amber-100 text-amber-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Declined: "bg-rose-100 text-rose-700",
  Expired: "bg-slate-100 text-slate-500",
  Withdrawn: "bg-slate-100 text-slate-500",
};

export function OfferStatusPill({ status, label, className }: { status: OfferStatus; label?: string; className?: string }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[status], className)}>
      {label ?? status}
    </span>
  );
}
