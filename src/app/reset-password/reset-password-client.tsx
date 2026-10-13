"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { finishPasswordReset } from "@/lib/actions/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useErrorToast } from "@/hooks/use-error-toast";

const supabaseConfigured = isSupabaseConfigured();

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Accounts with two-step verification must enter an authenticator code
  // before Supabase lets a recovery session change the password.
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");

  // This page is only ever reached with a live recovery session, put there
  // by /auth/callback exchanging the reset-link's code. Someone opening the
  // URL cold (no session) has an expired or already-used link.
  useEffect(() => {
    if (!supabaseConfigured || expired) return;
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) router.replace("/reset-password?expired=true");
      });
  }, [expired, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);

    if (supabaseConfigured) {
      setSubmitting(true);
      const supabase = getSupabaseBrowserClient();
      if (needsCode) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.[0];
        const verified = totp ? await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code.trim() }) : null;
        if (!verified || verified.error) {
          setSubmitting(false);
          setError("That code didn't work. Enter the current 6-digit code from your authenticator app.");
          return;
        }
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setSubmitting(false);
        if (updateError.code === "insufficient_aal" || /aal2/i.test(updateError.message)) {
          setNeedsCode(true);
          setError("Your account uses two-step verification. Enter the 6-digit code from your authenticator app to continue.");
        } else if (updateError.code === "same_password") {
          setError("Your new password must be different from your old one.");
        } else if (updateError.code === "weak_password") {
          setError(updateError.message || "That password is too weak. Try a longer one.");
        } else {
          setError("Something went wrong updating your password. Please try again.");
        }
        return;
      }
      // Security email + sign out everywhere, so the new password is needed to get back in.
      await finishPasswordReset();
      await supabase.auth.signOut({ scope: "local" });
      setSubmitting(false);
    }

    setDone(true);
    setTimeout(() => router.push("/sign-in?reset=1"), 1800);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <Link href="/" aria-label="Ensena home" className="mb-8">
        <Logo size={48} />
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-ensena-border bg-ensena-surface p-6 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-8">
        {expired ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="size-7" /></span>
            <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">This link has expired</h1>
            <p className="mt-2 text-sm text-ensena-muted">Password reset links expire after 1 hour for your security. Request a new one to continue.</p>
            <Button nativeButton={false} render={<Link href="/forgot-password" />} className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Request New Link
            </Button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success"><Check className="size-7" /></span>
            <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Password updated</h1>
            <p className="mt-2 text-sm text-ensena-muted">You&apos;ve been signed out everywhere. Redirecting you to log in with your new password…</p>
          </div>
        ) : (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Lock className="size-5" /></span>
            <h1 className="mt-3 font-heading text-xl font-semibold text-ensena-ink">Create a new password</h1>
            <p className="mt-1 text-sm text-ensena-muted">Make sure it&apos;s at least 6 characters.</p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ensena-ink">New password</span>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className="h-11 rounded-xl border-ensena-border" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ensena-ink">Confirm new password</span>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="h-11 rounded-xl border-ensena-border" />
              </label>
              {needsCode && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ensena-ink">Authenticator code</span>
                  <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className="h-11 rounded-xl border-ensena-border tracking-widest" />
                </label>
              )}
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button type="submit" loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Update Password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
