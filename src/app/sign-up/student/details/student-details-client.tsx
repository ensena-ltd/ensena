"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Compass, GraduationCap, ShieldCheck, Video, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { RequiredLabel } from "@/components/sign-up/required-label";
import { emptyLearningDetails, isLearningDetailsValid, LearningDetailsFields, type LearningDetails } from "@/components/sign-up/learning-details-fields";
import { GuardianConsentSteps } from "@/components/sign-up/guardian-consent-steps";
import { requestGuardianConsent, type GuardianDetails } from "@/lib/actions/auth";
import { buildContactSupportHref } from "@/lib/support-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/utils";
import { useErrorToast } from "@/hooks/use-error-toast";

const bullets: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Compass, title: "Find the right academic support", description: "Search verified tutors by subject, level and price." },
  { icon: Video, title: "Try before you commit", description: "Meet your tutor in a short Discovery Session first." },
  { icon: ShieldCheck, title: "Learn safely", description: "Your payments are protected until each lesson happens." },
];

// Reached from /auth/callback after a Google sign-up. Google already gave us
// the name and email, so this only collects what it can't: date of birth and
// phone (step 1), then the same "what you're learning" step the email
// sign-up uses (step 2). Finishing step 2 creates the student_profiles row,
// which is what marks the account as fully signed up. "My child" then adds
// the parent/guardian screens (step 3) before onboarding.
export function StudentDetailsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const onboardingHref = `/sign-up/student/onboarding${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [step, setStep] = useState<0 | 1 | 3>(0);
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [learning, setLearning] = useState<LearningDetails>(emptyLearningDetails);
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/sign-in");
        return;
      }
      const [{ data: existing }, { data: profile }, { data: guardian }] = await Promise.all([
        supabase.from("student_profiles").select("learning_for").eq("id", data.user.id).maybeSingle(),
        supabase.from("profiles").select("full_name, phone, date_of_birth").eq("id", data.user.id).maybeSingle(),
        supabase.from("student_guardians").select("consent_requested_at").eq("student_id", data.user.id).maybeSingle(),
      ]);
      if (existing) {
        // "My child" sign-ups that stopped before sending the consent
        // request resume at the parent/guardian screens.
        if (existing.learning_for === "My child" && !guardian?.consent_requested_at) {
          setFirstName((profile?.full_name ?? "").split(" ")[0] ?? "");
          setStep(3);
          setUserId(data.user.id);
          return;
        }
        router.replace(onboardingHref);
        return;
      }
      // Resuming an unfinished sign-up — prefill whatever was already saved.
      setFirstName((profile?.full_name ?? "").split(" ")[0] ?? "");
      if (profile?.phone) setPhone(profile.phone);
      if (profile?.date_of_birth) setDob(profile.date_of_birth);
      setUserId(data.user.id);
    })();
  }, [router, onboardingHref]);

  async function handleContinue() {
    if (!dob || !phone.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (dob > new Date().toISOString().slice(0, 10)) {
      setError("Your date of birth can't be in the future.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: updateError } = await getSupabaseBrowserClient()
      .from("profiles")
      .update({ phone: phone.trim(), date_of_birth: dob })
      .eq("id", userId!);
    setSubmitting(false);
    if (updateError) {
      setError("Something went wrong saving your details. Please try again.");
      return;
    }
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLearningDetailsValid(learning)) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: insertError } = await getSupabaseBrowserClient().from("student_profiles").insert({
      id: userId!,
      date_of_birth: dob,
      phone: phone.trim(),
      learning_for: learning.learningFor,
      academic_level: learning.academicLevel,
      academic_detail: learning.detailValue || null,
    });
    // 23505 = the row already exists (e.g. a double submit) — that's fine.
    if (insertError && insertError.code !== "23505") {
      setSubmitting(false);
      setError("Something went wrong setting up your account. Please try again.");
      return;
    }
    if (learning.learningFor === "My child") {
      setSubmitting(false);
      setStep(3);
      return;
    }
    router.push(onboardingHref);
  }

  async function submitGuardian(guardian: GuardianDetails): Promise<string | null> {
    // The student is signed in (Google), so the server action identifies
    // them from the session.
    const result = await requestGuardianConsent({ guardian });
    return result.status === "error" ? (result.message ?? "Something went wrong. Please try again.") : null;
  }

  if (!userId) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
        <Link href="/" aria-label="Ensena home" className="mb-8">
          <Logo size={48} />
        </Link>
        <GuardianConsentSteps
          studentFirstName={firstName}
          onSubmit={submitGuardian}
          sentNote={<>{firstName || "Your"}&apos;s account will be fully activated once their guardian clicks the link in that email and sets a password. You can carry on setting up in the meantime.</>}
          sentAction={
            <Button onClick={() => router.push(onboardingHref)} className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Continue <ArrowRight className="size-4" />
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
            {step === 0 ? `Welcome${firstName ? `, ${firstName}` : ""}!` : "Tell us what you're learning"}
          </h2>
          <p className="mt-1 text-sm text-ensena-muted">
            {step === 0 ? "Just a couple of details to finish your account." : "This helps us show you the right tutors first."}
          </p>

          {step === 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Date of birth</RequiredLabel>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
              </label>

              <label className="flex flex-col gap-1.5">
                <RequiredLabel>Phone number</RequiredLabel>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080 1234 5678" className="h-11 rounded-xl border-ensena-border" />
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </div>
              )}

              <Button type="button" onClick={handleContinue} loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
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

          <p className="mt-5 text-center text-xs text-ensena-muted">
            Need help? <Link href={buildContactSupportHref({ role: "Guest", context: "public", category: "Creating an account" })} className="text-ensena-primary hover:underline">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
