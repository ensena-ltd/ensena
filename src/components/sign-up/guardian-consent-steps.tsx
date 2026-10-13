"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, HeartHandshake, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GuardianDetails } from "@/lib/actions/auth";
import { useErrorToast } from "@/hooks/use-error-toast";
import { toast } from "sonner";

// The "My child" part of student sign-up: "You're almost there" -> Parent /
// Guardian details -> "Consent request sent". Shared by the email sign-up
// (student-sign-up-client.tsx) and the Google sign-up details page; each
// supplies how to submit and what the final screen's button does.

const relationshipOptions = ["Parent", "Legal Guardian", "Other Family Member"];

export function GuardianConsentSteps({
  studentFirstName,
  onSubmit,
  sentNote,
  sentAction,
}: {
  studentFirstName: string;
  /** Returns an error message, or null once the request has been sent. */
  onSubmit: (guardian: GuardianDetails) => Promise<string | null>;
  sentNote: ReactNode;
  sentAction: ReactNode;
}) {
  const firstName = studentFirstName.trim() || "there";
  const [step, setStep] = useState<"intro" | "form" | "sent">("intro");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState(relationshipOptions[0]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!consent) {
      setError("The parent or guardian needs to confirm consent to continue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const message = await onSubmit({ fullName: fullName.trim(), relationship, email: email.trim(), phone: phone.trim() });
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    toast.success("Consent request sent.");
    setStep("sent");
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-ensena-border bg-ensena-surface p-6 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-8">
      {step === "intro" && (
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><HeartHandshake className="size-7" /></span>
          <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">You&apos;re almost there, {firstName}!</h1>
          <p className="mt-2 text-sm leading-relaxed text-ensena-muted">
            Because you&apos;re under 16, we&apos;ll need a parent or guardian to help set up your Ensena account. This helps us keep your learning experience safe.
          </p>
          <Button onClick={() => setStep("form")} className="mt-6 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Add Parent or Guardian <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {step === "form" && (
        <>
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">Parent / Guardian details</h1>
          <p className="mt-1 text-sm text-ensena-muted">We&apos;ll ask them to confirm consent before {firstName}&apos;s account is fully activated.</p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Guardian&apos;s full name</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Grace Ejie" className="h-11 rounded-xl border-ensena-border" />
            </label>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Relationship to {firstName}</span>
              <div className="flex flex-wrap gap-1.5">
                {relationshipOptions.map((r) => (
                  <button key={r} type="button" onClick={() => setRelationship(r)} className={relationship === r ? "rounded-full border border-ensena-primary bg-ensena-primary/10 px-3 py-1.5 text-xs font-medium text-ensena-primary" : "rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink"}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Guardian&apos;s email</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guardian@example.com" className="h-11 rounded-xl border-ensena-border" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Guardian&apos;s phone number</span>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0800 000 0000" className="h-11 rounded-xl border-ensena-border" />
            </label>

            <label className="flex items-start gap-2 text-xs text-ensena-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 rounded border-ensena-border accent-ensena-primary" />
              I confirm I am {firstName}&apos;s parent or legal guardian and consent to their use of Ensena, including tutor communication, bookings and payments on their behalf.
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Send Consent Request
            </Button>
          </form>
        </>
      )}

      {step === "sent" && (
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success"><Mail className="size-7" /></span>
          <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Consent request sent</h1>
          <p className="mt-2 text-sm leading-relaxed text-ensena-muted">
            We&apos;ve sent an email to <span className="font-medium text-ensena-ink">{email}</span> asking {relationship.toLowerCase()} {fullName} to confirm consent and set up their Guardian Dashboard.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-ensena-bg-soft p-3 text-left text-xs text-ensena-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ensena-success" />
            <span>{sentNote}</span>
          </div>
          {sentAction}
        </div>
      )}
    </div>
  );
}
