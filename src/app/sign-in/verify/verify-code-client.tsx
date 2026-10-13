"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function VerifyCodeClient({ destination, email }: { destination: string; email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setVerifying(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      setVerifying(false);
      setError("We couldn't find your authenticator app. Please sign in again.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verifyError) {
      setVerifying(false);
      setCode("");
      setError("That code didn't work. Codes change every 30 seconds — try the newest one.");
      return;
    }
    // Full navigation so the server sees the upgraded session cookie.
    window.location.assign(destination);
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.assign("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ensena-border bg-ensena-surface p-6">
        <Logo />
        <span className="mt-6 flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="mt-3 font-heading text-xl font-semibold text-ensena-ink">Two-step verification</h1>
        <p className="mt-1 text-sm text-ensena-muted">
          Enter the 6-digit code from your authenticator app{email ? ` for ${email}` : ""}.
        </p>
        <form onSubmit={verify} className="mt-5 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            aria-label="Verification code"
            className="h-12 rounded-xl border border-ensena-border px-4 text-center font-mono text-lg tracking-[0.4em]"
          />
          {error && <p className="text-xs text-ensena-danger">{error}</p>}
          <Button type="submit" loading={verifying} className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white">
            Verify
          </Button>
        </form>
        <p className="mt-4 text-xs text-ensena-muted">
          Lost access to your authenticator app? Contact Ensena Support to recover your account.{" "}
          <button type="button" onClick={signOut} className="font-semibold text-ensena-primary hover:underline">
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
