"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, HeartHandshake, Mail, Phone } from "lucide-react";

import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { resendGuardianConsent } from "@/lib/actions/auth";
import { ageOn } from "@/lib/age";
import { guardianRequirement, guardianRequirementMessage } from "@/lib/guardian-requirement";
import { cn } from "@/lib/utils";

// Shown on the student dashboard for "My child" sign-ups — the parent or
// guardian saved at sign-up (student_guardians) and whether they've
// confirmed consent from their email yet.
export function GuardianDetailsCard({ className }: { className?: string }) {
  const me = useStudentIdentity();
  const { guardian } = me;
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  if (!guardian) {
    // No guardian yet: prompt when the age/level rules require or recommend one.
    const requirement = me.id ? guardianRequirement(me.dob, me.academicLevel) : "optional";
    if (requirement === "optional") return null;
    const required = requirement === "required";
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm", required ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900", className)}>
        {required ? <AlertTriangle className="size-5 shrink-0" /> : <HeartHandshake className="size-5 shrink-0" />}
        <span className="min-w-[200px] flex-1">
          <strong>{required ? "Add a parent or guardian" : "Consider adding a parent or guardian"}</strong>
          <span className="block">{guardianRequirementMessage(requirement, ageOn(me.dob))}</span>
        </span>
        <Link href="/student-dashboard/profile#guardian" className={cn("rounded-full px-4 py-2 text-xs font-semibold text-white", required ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600")}>
          {required ? "Add now" : "Add parent/guardian"}
        </Link>
      </div>
    );
  }

  async function resend() {
    setResending(true);
    setResendMessage(null);
    const result = await resendGuardianConsent();
    setResending(false);
    setResendMessage(result.status === "ok" ? "Consent email sent again." : (result.message ?? "Something went wrong."));
  }

  const confirmed = guardian.consentStatus === "confirmed";

  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><HeartHandshake className="size-4.5" /></span>
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Parent / Guardian Details</h2>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            confirmed ? "bg-ensena-success/10 text-ensena-success" : "bg-amber-100 text-amber-700"
          )}
        >
          {confirmed ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
          {confirmed ? "Consent confirmed" : "Awaiting consent"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-ensena-muted">{guardian.relationship}</p>
          <p className="font-medium text-ensena-ink">{guardian.fullName}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-ensena-muted" />
          <span className="break-all text-ensena-ink">{guardian.email}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <Phone className="mt-0.5 size-3.5 shrink-0 text-ensena-muted" />
          <span className="text-ensena-ink">{guardian.phone}</span>
        </div>
      </div>

      {!confirmed && (
        <p className="mt-3 text-xs text-ensena-muted">
          We&apos;ve emailed {guardian.fullName.split(" ")[0]} a consent request. Ask them to open it and confirm.{" "}
          <button type="button" onClick={resend} disabled={resending} className="font-semibold text-ensena-primary hover:underline disabled:opacity-60">
            {resending ? "Sending…" : "Resend consent email"}
          </button>
          {" · "}
          <Link href="/student-dashboard/profile" className="font-semibold text-ensena-primary hover:underline">Edit details</Link>
          {resendMessage && <span className="mt-1 block font-medium text-ensena-ink">{resendMessage}</span>}
        </p>
      )}
    </div>
  );
}
