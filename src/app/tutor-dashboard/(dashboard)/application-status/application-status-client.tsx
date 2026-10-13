"use client";

import Link from "next/link";
import { Check, Clock, FileText, Percent, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { profileCompletionPct } from "@/lib/tutor-dashboard-data";

const checklist = [
  { label: "Account created", done: true },
  { label: "Email verified", done: true },
  { label: "Profile completed", done: profileCompletionPct >= 90 },
  { label: "Documents submitted", done: true },
  { label: "Ensena review", done: false },
  { label: "Approved", done: false },
];

const quickLinks = [
  { label: "Preview Profile", href: "/tutor-dashboard/profile" },
  { label: "Edit Profile", href: "/tutor-dashboard/profile/edit" },
  { label: "Availability", href: "/tutor-dashboard/calendar" },
  { label: "Pricing", href: "/tutor-dashboard/earnings" },
  { label: "Verification", href: "/tutor-dashboard/verification" },
  { label: "Help", href: "/tutor-dashboard/help" },
];

export function ApplicationStatusClient() {
  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Application Status</h1>
        <p className="mt-1 text-sm text-ensena-muted">Your profile will become visible to students after approval.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Percent className="size-4.5" /></span>
          <p className="mt-3 text-2xl font-semibold text-ensena-ink">{profileCompletionPct}%</p>
          <p className="text-sm text-ensena-muted">Profile completeness</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Clock className="size-4.5" /></span>
          <p className="mt-3 text-lg font-semibold text-amber-800">🟡 Under Review</p>
          <p className="text-sm text-amber-700">Average review time: 24 – 48 hours</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><FileText className="size-4 text-ensena-primary" /> Checklist</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2.5 text-sm">
              <span className={`flex size-5 items-center justify-center rounded-full ${item.done ? "bg-ensena-success text-white" : "bg-ensena-bg-soft text-ensena-muted"}`}>
                {item.done ? <Check className="size-3" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className={item.done ? "text-ensena-ink" : "text-ensena-muted"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <p className="text-sm font-semibold text-ensena-ink">While you wait</p>
        <p className="mt-1 text-xs text-ensena-muted">You can still explore and prepare your profile. Booking will unlock once you&apos;re approved.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {quickLinks.map((l) => (
            <Button key={l.label} variant="outline" nativeButton={false} render={<Link href={l.href} />} className="h-10 rounded-full border-ensena-border text-xs font-medium">
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-ensena-success/10 p-4 text-sm text-ensena-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-success" />
        We&apos;ll email you as soon as your profile is approved. No need to keep checking back.
      </div>
    </div>
  );
}
