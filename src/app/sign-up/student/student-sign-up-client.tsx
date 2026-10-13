"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Compass, GraduationCap, ShieldCheck, Video, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { RequiredLabel } from "@/components/sign-up/required-label";
import { emptyLearningDetails, isLearningDetailsValid, LearningDetailsFields, type LearningDetails } from "@/components/sign-up/learning-details-fields";
import { GuardianConsentSteps } from "@/components/sign-up/guardian-consent-steps";
import { checkGuardianEmail, requestGuardianConsent, type GuardianDetails } from "@/lib/actions/auth";
import { setPendingVerificationEmail } from "@/lib/pending-verification";
import { buildContactSupportHref } from "@/lib/support-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeRedirectPath } from "@/lib/utils";
import { useErrorToast } from "@/hooks/use-error-toast";
import { toast } from "sonner";

const supabaseConfigured = isSupabaseConfigured();

const bullets: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Compass, title: "Find the right academic support", description: "Search verified tutors by subject, level and price." },
  { icon: Video, title: "Try before you commit", description: "Meet your tutor in a short Discovery Session first." },
  { icon: ShieldCheck, title: "Learn safely", description: "Your payments are protected until each lesson happens." },
];


export function StudentSignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [step, setStep] = useState(0);

  // Step 1: Basic Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Step 2: Learning Information
  const [learning, setLearning] = useState<LearningDetails>(emptyLearningDetails);
  const { learningFor, academicLevel, detailValue } = learning;

  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [submitting, setSubmitting] = useState(false);

  const step1Valid =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    dob.trim() !== "" &&
    email.trim() !== "" &&
    phone.trim() !== "" &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreed;

  const step2Valid = isLearningDetailsValid(learning);

  function handleContinue() {
    if (!step1Valid) {
      setError(
        password.length > 0 && password.length < 6
          ? "Your password must be at least 6 characters."
          : password !== confirmPassword
            ? "Passwords don't match."
            : !agreed
              ? "Please agree to the Terms of Service and Privacy Policy to continue."
              : "Please fill in all required fields."
      );
      return;
    }
    setError(null);
    setStep(1);
  }

  // No personal details in any URL — the onboarding page reads the name
  // from the session, and /verify-email reads the address from
  // sessionStorage (see pending-verification.ts).
  const onboardingNext = `/sign-up/student/onboarding${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  // Creates the student's own account; Supabase emails the confirmation
  // link to `email` straight away. The link lands on /auth/callback, which
  // forwards into onboarding (subjects -> "You're all set" -> dashboard).
  async function createStudentAccount(): Promise<{ error: string } | { userId: string; hasSession: boolean }> {
    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingNext)}`,
        data: {
          role: "student",
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          date_of_birth: dob,
          learning_for: learningFor,
          academic_level: academicLevel,
          academic_detail: detailValue,
        },
      },
    });

    if (signUpError) {
      return {
        error:
          signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already exists")
            ? "An account with that email already exists. Try logging in instead."
            : signUpError.message,
      };
    }
    // Supabase doesn't error for an email that already has a confirmed
    // account (so emails can't be probed) — it "succeeds" but sends nothing,
    // and the returned user has no identities.
    if (!data.user || (data.user.identities?.length ?? 0) === 0) {
      return { error: "An account with that email already exists. Try logging in instead." };
    }
    setPendingVerificationEmail(email.trim());
    return { userId: data.user.id, hasSession: !!data.session };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step2Valid) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);

    // "My child": the account is created once the parent/guardian's details
    // are in (step 2 — the GuardianConsentSteps screens), so both the
    // student's confirmation email and the guardian's consent email go out
    // together.
    if (learningFor === "My child") {
      setStep(2);
      return;
    }

    if (!supabaseConfigured) {
      setPendingVerificationEmail(email.trim());
      router.push(`/verify-email?next=${encodeURIComponent(onboardingNext)}`);
      return;
    }

    setSubmitting(true);
    const result = await createStudentAccount();
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    // A session means email confirmation is disabled on this project — skip
    // straight to onboarding. Otherwise Supabase requires the visitor to
    // click the confirmation link (which lands on /auth/callback) first.
    toast.success(result.hasSession ? "Account created." : "Account created. Check your email to confirm it.");
    router.push(result.hasSession ? onboardingNext : `/verify-email?next=${encodeURIComponent(onboardingNext)}`);
  }

  async function submitGuardian(guardian: GuardianDetails): Promise<string | null> {
    if (!supabaseConfigured) return null;
    // Check the guardian's email before creating anything, so a problem can
    // still be fixed on this form.
    const check = await checkGuardianEmail(guardian, email);
    if (check.status === "error") return check.message ?? "Please check the parent/guardian details.";

    const account = await createStudentAccount();
    if ("error" in account) return account.error;

    const consent = await requestGuardianConsent({ studentId: account.userId, guardian });
    if (consent.status === "error") return consent.message ?? "Something went wrong. Please try again.";
    return null;
  }

  async function handleGoogleSignUp() {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    // intent=student-signup tells /auth/callback to send a brand-new Google
    // account through /sign-up/student/details (DOB + phone, then the
    // "what you're learning" step) before onboarding.
    const params = new URLSearchParams({ intent: "student-signup" });
    if (redirectTo) params.set("redirectTo", redirectTo);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?${params}`, queryParams: { prompt: "select_account" } },
    });
  }

  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
        <Link href="/" aria-label="Ensena home" className="mb-8">
          <Logo size={48} />
        </Link>
        <GuardianConsentSteps
          studentFirstName={firstName}
          onSubmit={submitGuardian}
          sentNote={<>We&apos;ve also sent a confirmation link to <span className="font-medium text-ensena-ink">{email}</span>. Open it to confirm {firstName.trim()}&apos;s account and finish setting up.</>}
          sentAction={
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              <Check className="size-4" /> Back to Home
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      <AuthSidePanel
        title={<>Start learning with <span className="text-ensena-primary">the right academic support.</span></>}
        subtitle="Create your student account and get the academic support you need in minutes."
        bullets={bullets}
      />

      <div className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" aria-label="Ensena home" className="mb-8 flex justify-center lg:hidden">
            <Logo size={48} />
          </Link>

          <span className="flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><GraduationCap className="size-5" /></span>
          <h2 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">
            {step === 0 ? "Create your student account" : "Tell us what you're learning"}
          </h2>
          <p className="mt-1 text-sm text-ensena-muted">
            {step === 0 ? "It only takes a minute. Everything else can wait." : "This helps us show you the right tutors first."}
          </p>

          {step === 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <RequiredLabel>First name</RequiredLabel>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sarah" className="h-11 rounded-xl border-ensena-border" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <RequiredLabel>Last name</RequiredLabel>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Johnson" className="h-11 rounded-xl border-ensena-border" />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Date of birth</RequiredLabel>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Email</RequiredLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Phone number</RequiredLabel>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080 1234 5678" className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Password</RequiredLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Confirm password</RequiredLabel>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex items-start gap-2 text-xs text-ensena-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 rounded border-ensena-border accent-ensena-primary" />
                I agree to Ensena&apos;s <Link href="/terms" target="_blank" className="text-ensena-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-ensena-primary hover:underline">Privacy Policy</Link>.
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </div>
              )}

              <Button type="button" onClick={handleContinue} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Continue
              </Button>
            </div>
          ) : (
            <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
              <LearningDetailsFields value={learning} onChange={setLearning} />
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(0)} disabled={submitting} className="h-12 rounded-full border-ensena-border px-5 text-sm font-medium">
                  Back
                </Button>
                <Button type="submit" loading={submitting} className="h-12 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                  Create Account
                </Button>
              </div>
            </form>
          )}

          {step === 0 && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-ensena-border" />
                <span className="text-xs text-ensena-muted">or</span>
                <div className="h-px flex-1 bg-ensena-border" />
              </div>

              <Button type="button" variant="outline" onClick={handleGoogleSignUp} className="h-11 w-full rounded-xl border-ensena-border text-sm font-medium text-ensena-ink">
                Continue with Google
              </Button>
            </>
          )}

          <p className="mt-5 text-center text-sm text-ensena-muted">
            Already have an account? <Link href="/sign-in" className="font-semibold text-ensena-primary hover:underline">Log in</Link>
          </p>
          <p className="mt-2 text-center text-xs text-ensena-muted">
            Need help? <Link href={buildContactSupportHref({ role: "Guest", context: "public", category: "Creating an account" })} className="text-ensena-primary hover:underline">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
