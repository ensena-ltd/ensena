"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Headset, Lightbulb, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ProgressRing } from "@/components/sign-up/progress-ring";
import { SignUpSidebar } from "@/components/sign-up/sign-up-sidebar";
import { SignUpSuccess } from "@/components/sign-up/sign-up-success";
import { StepPersonalInfo } from "@/components/sign-up/step-personal-info";
import { StepTeachingProfile } from "@/components/sign-up/step-teaching-profile";
import { StepQualification } from "@/components/sign-up/step-qualification";
import { StepTeachingSetup } from "@/components/sign-up/step-teaching-setup";
import { createTutorPhotoUpload, saveTutorPhoto } from "@/lib/actions/auth";
import { setPendingVerificationEmail } from "@/lib/pending-verification";
import { setCurrentSession } from "@/lib/session-store";
import { recordSignup } from "@/lib/signup-events-store";
import { buildContactSupportHref } from "@/lib/support-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/roles";
import { createDefaultTutorSignupForm, type TutorSignupForm } from "@/lib/tutor-signup-data";
import { isAtLeastAge, TUTOR_AGE_MESSAGE, TUTOR_MIN_AGE } from "@/lib/age";
import { useErrorToast } from "@/hooks/use-error-toast";
import { toast } from "sonner";

const supabaseConfigured = isSupabaseConfigured();

const TOTAL_STEPS = 4;

const asideContent: Record<number, { title: string; bullets: string[] }> = {
  1: {
    title: "Why join Ensena?",
    bullets: [
      "Reach students across Nigeria",
      "Set your own schedule and rates",
      "Get paid securely, on time",
    ],
  },
  2: {
    title: "Why complete your profile?",
    bullets: [
      "Stand out to students with a complete profile",
      "A photo builds instant trust",
      "Get discovered more often in search",
    ],
  },
  3: {
    title: "Why we ask",
    bullets: [
      "Ensena verifies tutor qualifications to build student trust",
      "Masters and PhD tutoring requires additional verification",
      "You can upload supporting documents later from your dashboard",
    ],
  },
  4: {
    title: "Almost done",
    bullets: [
      "You can add an intro video, materials and certifications later",
      "Tutors with a complete profile get more bookings",
      "You can update your rate and availability anytime",
    ],
  },
};

function hasAnyAvailability(availability: TutorSignupForm["availability"]): boolean {
  return Object.values(availability).some((day) => day.enabled);
}

// Every selected academic level needs its own real expertise entered — a
// tutor teaching Primary + Exams isn't done just because Primary has
// subjects; Exams also needs at least one supported exam AND one subject.
function hasExpertiseForEveryLevel(form: TutorSignupForm): boolean {
  if (form.levels.length === 0) return false;
  return form.levels.every((level) => {
    const entry = form.levelExpertise.find((e) => e.level === level);
    if (!entry) return false;
    if (level === "Exams") return (entry.exams?.length ?? 0) > 0 && entry.items.length > 0;
    return entry.items.length > 0;
  });
}

function stepCompletion(step: number, form: TutorSignupForm, googleMode: boolean): number {
  switch (step) {
    case 1: {
      const fields = [form.firstName, form.lastName, form.dob, form.email, form.phone, form.password];
      return (fields.filter(Boolean).length / fields.length) * 100;
    }
    case 2: {
      const fields = [
        form.profilePhotoName,
        form.headline,
        form.levels.length > 0,
        form.teachingFormats.length > 0,
        hasExpertiseForEveryLevel(form),
        ...(googleMode ? [form.firstName, form.lastName, form.dob, form.phone] : []),
      ];
      return (fields.filter(Boolean).length / fields.length) * 100;
    }
    case 3: {
      const fields = [form.highestQualification, form.gradInstitution, form.gradFieldOfStudy, form.academicStatus];
      return (fields.filter(Boolean).length / fields.length) * 100;
    }
    case 4: {
      const fields = [form.oneOnOnePrice, hasAnyAvailability(form.availability), form.bio];
      return (fields.filter(Boolean).length / fields.length) * 100;
    }
    default:
      return 100;
  }
}

// Everything the wizard collected beyond the account's own fields — stored
// as tutor_profiles.application_data.
function applicationDataOf(form: TutorSignupForm) {
  const { confirmPassword, profilePhotoName, firstName, lastName, dob, email, phone, password, ...applicationData } = form;
  void confirmPassword;
  void profilePhotoName;
  void firstName;
  void lastName;
  void dob;
  void email;
  void phone;
  void password;
  return applicationData;
}

// Two ways in:
//  - Email: Steps 1-4. "Create Tutor Profile" creates the account (Supabase
//    emails a confirmation link), uploads the photo, and shows the
//    "Application submitted" screen. The confirmation link opens the Tutor
//    Dashboard.
//  - Google (/sign-up/tutor?google=1, sent here by /auth/callback): the
//    Google account already exists, so Step 1 is skipped — name, date of
//    birth and phone are asked on Step 2 — and submitting creates the tutor
//    profile directly.
export function SignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsGoogle = searchParams.get("google") === "1";
  const [googleUserId, setGoogleUserId] = useState<string | null>(null);
  const [checkingGoogle, setCheckingGoogle] = useState(wantsGoogle && supabaseConfigured);
  const googleMode = !!googleUserId;
  const firstStep = googleMode ? 2 : 1;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TutorSignupForm>(() => createDefaultTutorSignupForm());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useErrorToast(submitError);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const update = (patch: Partial<TutorSignupForm>) => setForm((prev) => ({ ...prev, ...patch }));

  // Google arrivals: make sure this Google account becomes a tutor (or send
  // an already-finished account to its own dashboard), then start at Step 2
  // with the name/email Google gave us.
  useEffect(() => {
    if (!wantsGoogle || !supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setCheckingGoogle(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role, full_name, phone, date_of_birth").eq("id", user.id).maybeSingle();
      const role = (profile?.role as AppRole | undefined) ?? "student";

      if (role === "tutor") {
        const { data: existing } = await supabase.from("tutor_profiles").select("id").eq("id", user.id).maybeSingle();
        if (existing) {
          router.replace("/tutor-dashboard");
          return;
        }
      } else if (role === "student") {
        const { data: studentProfile } = await supabase.from("student_profiles").select("id").eq("id", user.id).maybeSingle();
        if (studentProfile) {
          router.replace(dashboardHrefByRole.student);
          return;
        }
        const { error: claimError } = await supabase.rpc("claim_oauth_signup_role", { new_role: "tutor" });
        if (claimError) {
          setSubmitError("We couldn't set up your tutor account. Please sign in again and retry.");
          setCheckingGoogle(false);
          return;
        }
      } else {
        router.replace(dashboardHrefByRole[role] ?? "/");
        return;
      }

      const [first, ...rest] = (profile?.full_name ?? "").trim().split(" ");
      setForm((prev) => ({
        ...prev,
        firstName: first ?? "",
        lastName: rest.join(" "),
        email: user.email ?? "",
        phone: profile?.phone ?? "",
        dob: profile?.date_of_birth ?? "",
      }));
      setGoogleUserId(user.id);
      setStep(2);
      setCheckingGoogle(false);
    })();
  }, [wantsGoogle, router]);

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  const step1Valid =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    isAtLeastAge(form.dob, TUTOR_MIN_AGE) &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.password.length >= 6 &&
    form.password === form.confirmPassword;

  const step2Valid =
    !!form.profilePhotoName &&
    !!photoFile &&
    form.headline.trim() !== "" &&
    form.levels.length > 0 &&
    form.teachingFormats.length > 0 &&
    hasExpertiseForEveryLevel(form) &&
    (!googleMode || (form.firstName.trim() !== "" && form.lastName.trim() !== "" && isAtLeastAge(form.dob, TUTOR_MIN_AGE) && form.phone.trim() !== ""));

  const step3Valid =
    form.highestQualification.trim() !== "" &&
    form.gradInstitution.trim() !== "" &&
    form.gradFieldOfStudy.trim() !== "" &&
    form.academicStatus.trim() !== "";

  const step4Valid =
    form.oneOnOnePrice.trim() !== "" &&
    hasAnyAvailability(form.availability) &&
    form.bio.trim() !== "";

  const stepValid: Record<number, boolean> = { 1: step1Valid, 2: step2Valid, 3: step3Valid, 4: step4Valid };
  const canContinue = stepValid[step] ?? true;

  const handleBack = () => {
    setAttemptedNext(false);
    setStep((s) => Math.max(firstStep, s - 1));
  };

  const underAge = form.dob !== "" && !isAtLeastAge(form.dob, TUTOR_MIN_AGE) && (step === 1 || (step === 2 && googleMode));

  const handleContinue = () => {
    if (underAge) {
      toast.error(TUTOR_AGE_MESSAGE);
      setAttemptedNext(true);
      return;
    }
    if (!canContinue) {
      setAttemptedNext(true);
      return;
    }
    setAttemptedNext(false);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Uploads the profile photo to the avatars bucket via a one-time signed
  // URL, then saves it as the account's avatar_url.
  async function uploadPhoto(userId: string): Promise<string | null> {
    if (!photoFile) return "Please add a profile photo.";
    const upload = await createTutorPhotoUpload({ userId, contentType: photoFile.type, size: photoFile.size });
    if (upload.status === "error") return upload.message;
    const { error } = await getSupabaseBrowserClient().storage.from("avatars").uploadToSignedUrl(upload.path, upload.token, photoFile, { contentType: photoFile.type });
    if (error) return "We couldn't upload your photo. Please try again.";
    const saved = await saveTutorPhoto({ userId, path: upload.path });
    return saved.status === "error" ? (saved.message ?? "We couldn't save your photo.") : null;
  }

  function finish(email: string | null) {
    setCurrentSession({ role: "Tutor", name: [form.firstName, form.lastName].filter(Boolean).join(" ") || "New Tutor", email: form.email });
    recordSignup("Tutor");
    setPendingEmail(email);
    toast.success(email ? "Application submitted. Check your email to confirm your account." : "Application submitted.");
    setStep(TOTAL_STEPS + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleSubmit = async () => {
    if (!canContinue) {
      setAttemptedNext(true);
      return;
    }

    if (!supabaseConfigured) {
      finish(null);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const applicationData = applicationDataOf(form);
    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || "New Tutor";

    if (googleMode && googleUserId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone: form.phone.trim(), date_of_birth: form.dob })
        .eq("id", googleUserId);
      const { error: tutorError } = await supabase.from("tutor_profiles").insert({
        id: googleUserId,
        date_of_birth: form.dob,
        phone: form.phone.trim(),
        application_data: applicationData,
      });
      // 23505 = already created (e.g. a double submit) — that's fine.
      if (profileError || (tutorError && tutorError.code !== "23505")) {
        setSubmitting(false);
        setSubmitError("Something went wrong saving your tutor profile. Please try again.");
        return;
      }
      const photoError = await uploadPhoto(googleUserId);
      setSubmitting(false);
      if (photoError) {
        setSubmitError(photoError);
        return;
      }
      finish(null);
      return;
    }

    // Email sign-up. The handle_new_user trigger stores application_data on
    // tutor_profiles straight away; the confirmation link lands on the
    // Tutor Dashboard.
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/tutor-dashboard")}`,
        data: {
          role: "tutor",
          full_name: fullName,
          phone: form.phone.trim(),
          date_of_birth: form.dob,
          application_data: applicationData,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setSubmitError(
        error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")
          ? "An account with that email already exists. Try logging in instead."
          : error.message
      );
      return;
    }
    // Supabase doesn't error for an email that already has a confirmed
    // account — it "succeeds" with no identities and sends nothing.
    if (!data.user || (data.user.identities?.length ?? 0) === 0) {
      setSubmitting(false);
      setSubmitError("An account with that email already exists. Try logging in instead.");
      return;
    }

    const photoError = await uploadPhoto(data.user.id);
    setSubmitting(false);
    if (photoError) {
      // The account exists and the confirmation email is on its way — the
      // photo can be added later from the dashboard, so don't block here.
      console.error("[tutor sign-up] photo upload failed:", photoError);
    }

    if (data.session) {
      router.push("/tutor-dashboard");
      return;
    }
    setPendingVerificationEmail(form.email.trim());
    finish(form.email.trim());
  };

  async function handleGoogleSignUp() {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    // intent=tutor-signup: /auth/callback sends a new Google account back
    // here (?google=1) to finish Steps 2-4.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?intent=tutor-signup`, queryParams: { prompt: "select_account" } },
    });
  }

  const aside = asideContent[step];
  const completion = useMemo(() => stepCompletion(step, form, googleMode), [step, form, googleMode]);
  const stepLabel = (n: number) => (googleMode ? `Step ${n - 1} of 3` : `Step ${n} of 4`);

  if (checkingGoogle) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  if (step > TOTAL_STEPS) {
    return (
      <div className="min-h-screen bg-ensena-bg-soft">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" aria-label="Ensena home">
            <Logo size={48} />
          </Link>
        </div>
        <SignUpSuccess firstName={form.firstName} pendingEmail={pendingEmail} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ensena-bg-soft">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/" aria-label="Ensena home">
          <Logo size={48} />
        </Link>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <SignUpSidebar currentStep={step} />

          <div className="flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
            {step === 1 && <StepPersonalInfo form={form} update={update} />}
            {step === 2 && (
              <StepTeachingProfile form={form} update={update} googleMode={googleMode} photoPreview={photoPreview} onPhotoChange={handlePhotoChange} />
            )}
            {step === 3 && <StepQualification form={form} update={update} stepLabel={stepLabel(3)} />}
            {step === 4 && <StepTeachingSetup form={form} update={update} stepLabel={stepLabel(4)} />}

            {step === 1 && (
              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-ensena-border" />
                <span className="text-xs text-ensena-muted">or</span>
                <div className="h-px flex-1 bg-ensena-border" />
              </div>
            )}
            {step === 1 && (
              <Button type="button" variant="outline" onClick={handleGoogleSignUp} className="mt-4 h-11 w-full rounded-xl border-ensena-border text-sm font-medium text-ensena-ink">
                Continue with Google
              </Button>
            )}

            {attemptedNext && !canContinue && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {underAge ? TUTOR_AGE_MESSAGE : "Please fill in all required fields before continuing."}
              </p>
            )}

            {submitError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {submitError}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-ensena-border pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={step === firstStep || submitting}
                onClick={handleBack}
                className="h-11 rounded-full border-ensena-border px-6 text-sm font-medium disabled:opacity-40"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleContinue}
                  className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  Save &amp; Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  loading={submitting}
                  onClick={handleSubmit}
                  className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  Create Tutor Profile <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 lg:w-72">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-ensena-border p-5 text-center">
              <ProgressRing percent={completion} size={88} />
              <p className="text-sm font-semibold text-ensena-ink">Step Progress</p>
              <p className="text-xs text-ensena-muted">
                Complete this step to continue building your profile.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                <Lightbulb className="size-4 text-amber-500" /> {aside.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {aside.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-xs text-ensena-muted">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-ensena-border p-5 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                <Headset className="size-5" />
              </span>
              <p className="text-sm font-semibold text-ensena-ink">Need help?</p>
              <p className="text-xs text-ensena-muted">Our support team is here for you.</p>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={buildContactSupportHref({ role: "Guest", context: "tutor-signup" })} />}
                className="mt-1 h-9 w-full rounded-full border-ensena-border text-xs font-medium"
              >
                Contact Support
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
