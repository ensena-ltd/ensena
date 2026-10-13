"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, HeartHandshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useErrorToast } from "@/hooks/use-error-toast";
import { toast } from "sonner";

interface InvitedGuardian {
  fullName: string;
  studentFirstName: string;
}

// Reached only via /auth/callback?next=/accept-guardian-invitation, right
// after the guardian clicks the real invite email — by then a live
// (passwordless) session already exists from requestGuardianConsent's
// auth.admin.inviteUserByEmail call. This screen's only job is to turn that
// into a real password so they can sign back in later.
export function AcceptGuardianInvitationClient() {
  const router = useRouter();
  const [invited, setInvited] = useState<InvitedGuardian | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        const meta = data.user?.user_metadata;
        if (!data.user || meta?.role !== "guardian") {
          setInvited(null);
          return;
        }
        setInvited({ fullName: (meta.full_name as string) ?? "", studentFirstName: (meta.student_first_name as string) ?? "your child" });
        setName((meta.full_name as string) ?? "");
      });
  }, []);

  if (invited === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  if (invited === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ensena-bg-soft px-6 text-center">
        <Logo size={48} />
        <AlertCircle className="size-10 text-rose-500" />
        <p className="max-w-sm text-sm text-ensena-muted">This invitation link isn&apos;t valid or has expired.</p>
        <Link href="/sign-in" className="text-sm font-semibold text-ensena-primary hover:underline">Back to Sign In</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please confirm your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (!consent) { setError("Please confirm consent to continue."); return; }

    setError(null);
    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { full_name: name } });
    if (updateError) {
      setSubmitting(false);
      setError("Something went wrong. Please try again.");
      return;
    }
    // Marks consent on the student's student_guardians row (matched on this
    // verified email), which the student sees on their dashboard.
    const { error: consentError } = await supabase.rpc("confirm_guardian_consent");
    setSubmitting(false);
    if (consentError) {
      setError("Your password was saved, but we couldn't record your consent. Please try again.");
      return;
    }
    toast.success("Consent confirmed. Welcome to your Guardian Dashboard.");
    router.push("/guardian-dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <div className="w-full max-w-md">
        <div className="flex justify-center"><Logo size={48} /></div>

        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><HeartHandshake className="size-4.5" /></span>
            <h1 className="font-heading text-lg font-semibold text-ensena-ink">Confirm consent for {invited.studentFirstName}</h1>
          </div>
          <p className="mt-2 text-sm text-ensena-muted">
            Set a password to activate your Guardian Dashboard and {invited.studentFirstName}&apos;s Ensena account.
          </p>

          <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Your full name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Create Password</span>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl border-ensena-border pr-9" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ensena-muted hover:text-ensena-ink">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Confirm Password</span>
              <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
            </label>

            <label className="flex items-start gap-2 text-xs text-ensena-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 rounded border-ensena-border accent-ensena-primary" />
              I confirm I am {invited.studentFirstName}&apos;s parent or legal guardian and consent to their use of Ensena, including tutor communication, bookings and payments on their behalf.
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              <CheckCircle2 className="size-4" /> Confirm &amp; Activate Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
