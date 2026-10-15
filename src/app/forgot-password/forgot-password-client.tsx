"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, MailCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { demoAccounts } from "@/lib/demo-auth";
import { requestPasswordReset } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useErrorToast } from "@/hooks/use-error-toast";

const supabaseConfigured = isSupabaseConfigured();

const bullets = [
  { icon: ShieldCheck, title: "Your account stays secure", description: "Only you can reset your password using your verified email." },
  { icon: KeyRound, title: "Quick and simple", description: "We'll send you a link to create a new password." },
];

// Remembered from the sign-in form so the address is already filled in here.
const LAST_EMAIL_KEY = "ensena_last_email";
// Set by the sign-in form's "Forgot password?" link with whatever was typed.
const HANDOFF_EMAIL_KEY = "ensena_forgot_email";

const noopSubscribe = () => () => {};
function readPrefillEmail(): string {
  try {
    return window.sessionStorage.getItem(HANDOFF_EMAIL_KEY) || window.localStorage.getItem(LAST_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function ForgotPasswordClient() {
  // Pre-filled from what was typed on sign-in, else the last email used on
  // this device — never from the URL, so the address isn't exposed there.
  // Read through useSyncExternalStore so server and browser render the same first.
  const remembered = useSyncExternalStore(noopSubscribe, readPrefillEmail, () => "");
  const [typed, setEmail] = useState<string | null>(null);
  const email = typed ?? remembered;

  // Old links may still carry ?email= — drop it from the address bar.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.has("email")) window.history.replaceState(null, "", window.location.pathname);
  }, [searchParams]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);

    if (supabaseConfigured) {
      setSubmitting(true);
      // Our own reset email (Resend, noreply@ensena.co), not Supabase's
      // built-in one. The server answers at once and sends in the background.
      const result = await requestPasswordReset(email).catch(() => ({ status: "error" as const, message: "We couldn't reach Ensena. Check your connection and try again." }));
      setSubmitting(false);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong. Please try again.");
        return;
      }
    }
    try {
      window.localStorage.setItem(LAST_EMAIL_KEY, email.trim());
    } catch {
      // Not remembered — fine.
    }

    // Always show the same "check your email" state whether or not the
    // address has an account, so this screen never reveals who has one.
    setSent(true);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      <AuthSidePanel
        title={<>Forgot your <span className="text-ensena-primary">password?</span></>}
        subtitle="No worries, it happens to everyone. We'll help you get back into your account."
        bullets={bullets}
      />

      <div className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" aria-label="Ensena home" className="mb-8 flex justify-center lg:hidden">
            <Logo size={48} />
          </Link>

          {!sent ? (
            <>
              <Link href="/sign-in" className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
                <ArrowLeft className="size-4" /> Back to log in
              </Link>
              <h2 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">Forgot your password?</h2>
              <p className="mt-1 text-sm text-ensena-muted">Enter your email and we&apos;ll send you instructions to reset it.</p>

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ensena-ink">Email address</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                    <Input type="email" autoComplete="email" autoFocus={!email} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="h-11 rounded-xl border-ensena-border pl-9" />
                  </div>
                </label>

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <Button type="submit" loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                  Send Reset Link
                </Button>
              </form>

              {!supabaseConfigured && (
                <p className="mt-6 rounded-xl bg-ensena-bg-soft p-3 text-center text-[11px] text-ensena-muted">
                  Demo: try {demoAccounts[0].email} to see the confirmation screen.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success"><MailCheck className="size-7" /></span>
              <h2 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">Check your email</h2>
              <p className="mt-2 text-sm text-ensena-muted">
                If an Ensena account uses <span className="font-medium text-ensena-ink">{email}</span>, we&apos;ve sent it a link to reset your password. The link expires in 1 hour.
              </p>
              <p className="mt-2 text-xs text-ensena-muted">Can&apos;t find it? Check your spam or promotions folder for an email from noreply@ensena.co.</p>
              {!supabaseConfigured && (
                <Button
                  nativeButton={false}
                  render={<Link href="/reset-password" />}
                  className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
                >
                  Open Reset Link (Demo)
                </Button>
              )}
              <button type="button" onClick={() => setSent(false)} className="mt-4 text-sm font-medium text-ensena-primary hover:underline">
                Didn&apos;t get it? Resend email
              </button>
              <p className="mt-1 text-[11px] text-ensena-muted">You can request a new email once a minute.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
