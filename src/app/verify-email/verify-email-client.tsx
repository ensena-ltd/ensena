"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPendingVerificationEmail } from "@/lib/pending-verification";
import { safeRedirectPath } from "@/lib/utils";

const supabaseConfigured = isSupabaseConfigured();

const noopSubscribe = () => () => {};

export function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The address comes from sessionStorage (set by the sign-up form), never
  // the URL — see pending-verification.ts.
  const email = useSyncExternalStore(noopSubscribe, () => getPendingVerificationEmail(), () => null) || "your inbox";
  const next = safeRedirectPath(searchParams.get("next")) || "/sign-in";
  const expired = searchParams.get("expired") === "true";

  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function flash() {
    if (supabaseConfigured && email !== "your inbox") {
      setResending(true);
      await getSupabaseBrowserClient().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setResending(false);
    }
    setResent(true);
    setTimeout(() => setResent(false), 2400);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <Link href="/" aria-label="Ensena home" className="mb-8">
        <Logo size={48} />
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-ensena-border bg-ensena-surface p-6 text-center shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-8">
        {expired ? (
          <>
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="size-7" /></span>
            <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">This link has expired</h1>
            <p className="mt-2 text-sm text-ensena-muted">Verification links expire after 24 hours. We can send you a new one.</p>
            <Button onClick={flash} loading={resending} className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Resend Email
            </Button>
          </>
        ) : (
          <>
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Mail className="size-7" /></span>
            <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Check your inbox 📩</h1>
            <p className="mt-2 text-sm text-ensena-muted">
              We&apos;ve sent a verification link to <span className="font-medium text-ensena-ink">{email}</span>. Click it to activate your account.
            </p>

            {!supabaseConfigured && (
              <Button
                nativeButton={false}
                render={<Link href={next} />}
                className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Open Email (Demo: Continue)
              </Button>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <button type="button" onClick={flash} disabled={resending} className="font-medium text-ensena-primary hover:underline disabled:opacity-60">
                {resending ? "Sending…" : "Resend Email"}
              </button>
              <span className="text-ensena-border">|</span>
              <button type="button" onClick={() => router.back()} className="font-medium text-ensena-primary hover:underline">Change Email</button>
            </div>
          </>
        )}

        {resent && <p className="mt-4 text-xs font-medium text-ensena-success">Verification email resent!</p>}
      </div>
    </div>
  );
}
