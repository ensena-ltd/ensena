import Link from "next/link";
import { CheckCircle2, Clock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatHappensNext } from "@/lib/tutor-signup-data";

// pendingEmail: an email sign-up that still has to confirm its address —
// the confirmation link (not this screen) opens the Tutor Dashboard.
export function SignUpSuccess({ firstName, pendingEmail = null }: { firstName: string; pendingEmail?: string | null }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
        <CheckCircle2 className="size-10" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-semibold text-ensena-ink">
        Application submitted{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="mt-2 text-ensena-muted">
        Thanks for applying to become a tutor on Ensena. Our team is reviewing your
        profile now.
      </p>

      <div className="mt-8 w-full rounded-2xl border border-ensena-border p-5 text-left">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-600">
          <Clock className="size-4" /> Pending Verification
        </p>
        <p className="mt-1 text-xs text-ensena-muted">Average review time: 24 – 48 hours</p>
        <ol className="mt-4 flex flex-col gap-2.5">
          {whatHappensNext.map((step, i) => (
            <li key={step} className="flex items-start gap-2 text-sm text-ensena-muted">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {pendingEmail ? (
        <div className="mt-6 flex w-full items-start gap-2 rounded-2xl bg-ensena-primary/5 p-4 text-left text-sm text-ensena-ink">
          <Mail className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
          <span>
            We&apos;ve sent a confirmation link to <span className="font-semibold">{pendingEmail}</span>. Confirm your email to open your Tutor Dashboard.
          </span>
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-1.5 text-sm text-ensena-muted">
          <Mail className="size-4" /> We&apos;ll email you as soon as your profile is approved.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {!pendingEmail && (
          <Button
            nativeButton={false}
            className="h-11 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white"
            render={<Link href="/tutor-dashboard" />}
          >
            Go to Tutor Dashboard
          </Button>
        )}
        <Button
          variant="outline"
          nativeButton={false}
          className="h-11 rounded-full border-ensena-border px-8 text-sm font-medium"
          render={<Link href="/" />}
        >
          Back to Ensena
        </Button>
      </div>
    </div>
  );
}
