"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Clock, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isTutorVerified, useTutorIdentity, verificationChecklist } from "@/components/tutor-dashboard/tutor-identity";

// Pages an unverified tutor can always open (to finish verification, change
// settings or get help).
const ALWAYS_OPEN = ["/tutor-dashboard/verification", "/tutor-dashboard/settings", "/tutor-dashboard/help", "/tutor-dashboard/support", "/tutor-dashboard/application-status"];

// Unverified tutors must complete their Tutor Information and upload the
// required documents before using the rest of the dashboard. Once
// everything is submitted they get in, with an "under review" banner until
// an admin approves them.
export function TutorVerificationGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useTutorIdentity();

  if (!me.id || isTutorVerified(me) || ALWAYS_OPEN.some((p) => pathname.startsWith(p))) return <>{children}</>;

  const checklist = verificationChecklist(me);
  const rejected = me.applicationStatus === "rejected" || me.applicationStatus === "resubmission_required";

  if (checklist.complete && !rejected) {
    return (
      <>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Clock className="size-4 shrink-0 text-amber-600" />
          <span className="flex-1">Your application is under review. Your profile goes live to students once Ensena approves it.</span>
          <Link href="/tutor-dashboard/verification" className="font-semibold text-amber-900 underline">View details</Link>
        </div>
        {children}
      </>
    );
  }

  const missing = [...checklist.info, ...checklist.documents].filter((i) => !i.done);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-ensena-border bg-ensena-surface p-6 text-center shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">
        {me.applicationStatus === "resubmission_required" ? "Ensena needs a few changes" : rejected ? "Please update your application" : `Verify your account, ${me.firstName}`}
      </h1>
      <p className="mt-2 text-sm text-ensena-muted">
        {rejected
          ? me.rejectionReason || "Your application wasn't approved. Update your information or documents and we'll review it again."
          : "Before you can use your Tutor Dashboard, Ensena needs a few more details and your verification documents."}
      </p>
      {me.resubmissionFields.length > 0 && (
        <ul className="mx-auto mt-4 flex max-w-sm flex-col gap-1.5 text-left text-sm text-ensena-ink">
          {me.resubmissionFields.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-rose-500" /> {f}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <ul className="mx-auto mt-4 flex max-w-sm flex-col gap-1.5 text-left text-sm text-ensena-ink">
          {missing.map((m) => (
            <li key={m.label} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" /> {m.label}
            </li>
          ))}
        </ul>
      )}
      <Button nativeButton={false} render={<Link href="/tutor-dashboard/verification" />} className="mt-6 h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
        Complete verification <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
