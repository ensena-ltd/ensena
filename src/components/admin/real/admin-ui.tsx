import type { ReactNode } from "react";
import Image from "next/image";

import { tutorStatusLabels, type TutorApplicationStatus } from "@/lib/tutor-application";
import { cn } from "@/lib/utils";

// Small shared pieces for the admin pages that show real (Supabase)
// registration data.

export const tutorStatusStyles: Record<TutorApplicationStatus, { badge: string; dot: string }> = {
  pending: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  approved: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  resubmission_required: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
};

export function TutorStatusBadge({ status }: { status: TutorApplicationStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tutorStatusStyles[status].badge)}>
      <span className={cn("size-1.5 rounded-full", tutorStatusStyles[status].dot)} />
      {tutorStatusLabels[status]}
    </span>
  );
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

export function ageFrom(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age--;
  return age;
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function PersonAvatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary" style={{ width: size, height: size }}>
      {url ? <Image src={url} alt={name} fill sizes={`${size}px`} className="object-cover" /> : initials(name)}
    </span>
  );
}

export function SectionCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function DetailRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-ensena-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="shrink-0 text-ensena-muted">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words text-ensena-ink">{value === "" || value === null || value === undefined ? <span className="font-normal text-ensena-muted">—</span> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips({ items, empty = "—" }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <span className="font-normal text-ensena-muted">{empty}</span>;
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {items.map((i) => (
        <span key={i} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-xs font-medium text-ensena-ink">{i}</span>
      ))}
    </span>
  );
}

export const naira = (v: string) => (v ? `₦${Number(v).toLocaleString("en-NG")}` : "");
