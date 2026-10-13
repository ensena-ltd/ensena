"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { setCurrentSession } from "@/lib/session-store";
import { recordSignup } from "@/lib/signup-events-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { degreeCourseNames, isDegreeLevel, OTHER_COURSE, subjectsForCourse, subjectsForLevel } from "@/lib/student-onboarding-subjects";
import { cn, safeRedirectPath } from "@/lib/utils";
import { useErrorToast } from "@/hooks/use-error-toast";
import { toast } from "sonner";

const supabaseConfigured = isSupabaseConfigured();

// Last step of every student sign-up — reached from the email confirmation
// link (via /auth/callback) or from /sign-up/student/details after Google.
// The subject list depends on the academic level picked at sign-up:
// Undergraduate/Masters/PhD first choose their degree course (or type one
// via "Other"), then the modules taught in it; every other level goes
// straight to its subject list. Saved onto the student_profiles row.

interface SignedInStudent {
  id: string;
  name: string;
  email: string;
  academicLevel: string | null;
  academicDetail: string | null;
}

type Step = "course" | "subjects" | "done";

export function StudentOnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  // Demo mode (no Supabase project): there's no real account to load.
  const [student, setStudent] = useState<SignedInStudent | null>(() =>
    supabaseConfigured ? null : { id: "", name: "New Student", email: "", academicLevel: null, academicDetail: null }
  );
  const [step, setStep] = useState<Step>("subjects");
  const [courseChoice, setCourseChoice] = useState("");
  const [otherCourse, setOtherCourse] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/sign-in");
        return;
      }
      const [{ data: profile }, { data: studentProfile }, { data: guardian }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", data.user.id).maybeSingle(),
        supabase.from("student_profiles").select("learning_for, academic_level, academic_detail, course, subjects, goal").eq("id", data.user.id).maybeSingle(),
        supabase.from("student_guardians").select("consent_requested_at").eq("student_id", data.user.id).maybeSingle(),
      ]);
      // Google sign-ups must finish DOB/phone/level first, and "My child"
      // sign-ups must have sent their parent/guardian consent request —
      // /sign-up/student/details picks up wherever they stopped.
      if (!studentProfile || (studentProfile.learning_for === "My child" && !guardian?.consent_requested_at)) {
        router.replace(`/sign-up/student/details${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`);
        return;
      }
      const degree = isDegreeLevel(studentProfile.academic_level);
      if (studentProfile.course) {
        if (degreeCourseNames.includes(studentProfile.course)) {
          setCourseChoice(studentProfile.course);
        } else {
          setCourseChoice(OTHER_COURSE);
          setOtherCourse(studentProfile.course);
        }
      }
      if (studentProfile.subjects?.length) setSubjects(studentProfile.subjects);
      if (studentProfile.goal) setGoal(studentProfile.goal);
      setStep(degree ? "course" : "subjects");
      setStudent({
        id: data.user.id,
        name: profile?.full_name ?? "",
        email: profile?.email ?? data.user.email ?? "",
        academicLevel: studentProfile.academic_level,
        academicDetail: studentProfile.academic_detail,
      });
    })();
  }, [router, redirectTo]);

  const degree = isDegreeLevel(student?.academicLevel);
  const course = courseChoice === OTHER_COURSE ? otherCourse.trim() : courseChoice;

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return q ? degreeCourseNames.filter((c) => c.toLowerCase().includes(q)) : degreeCourseNames;
  }, [courseSearch]);

  const catalogue = degree ? subjectsForCourse(course, student?.academicLevel) : subjectsForLevel(student?.academicLevel, student?.academicDetail);
  // Anything the student typed themselves stays visible as a chip.
  const subjectChips = [...catalogue, ...subjects.filter((s) => !catalogue.includes(s))];

  function toggleSubject(subject: string) {
    setSubjects((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  }

  function addCustomSubject() {
    const value = customSubject.trim();
    if (!value) return;
    if (!subjects.some((s) => s.toLowerCase() === value.toLowerCase())) setSubjects((prev) => [...prev, value]);
    setCustomSubject("");
  }

  function chooseCourse(name: string) {
    if (name !== courseChoice) setSubjects([]);
    setCourseChoice(name);
  }

  function handleCourseContinue() {
    if (!courseChoice) {
      setError("Please choose your course.");
      return;
    }
    if (courseChoice === OTHER_COURSE && !otherCourse.trim()) {
      setError("Please type the name of your course.");
      return;
    }
    setError(null);
    setStep("subjects");
  }

  async function handleSubjectsContinue() {
    if (subjects.length === 0) {
      setError("Please pick at least one subject.");
      return;
    }
    setError(null);
    if (supabaseConfigured && student) {
      setSaving(true);
      const { error: saveError } = await getSupabaseBrowserClient()
        .from("student_profiles")
        .update({ subjects, goal: goal.trim() || null, ...(degree ? { course } : {}) })
        .eq("id", student.id);
      setSaving(false);
      if (saveError) {
        setError("Something went wrong saving your subjects. Please try again.");
        return;
      }
    }
    setStep("done");
  }

  function finish() {
    if (student?.email) {
      // Keeps the client-side session (session-store.ts) that the booking
      // flows still gate on in step with the real Supabase account.
      setCurrentSession({ role: "Student", name: student.name || "New Student", email: student.email });
      recordSignup("Student");
    }
    toast.success("Welcome to Ensena!");
    // A guest sent here mid-booking (see require-auth.ts) returns to that
    // exact page instead of the default dashboard.
    router.push(redirectTo || "/student-dashboard");
    router.refresh();
  }

  if (!student) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  const chip = (selected: boolean) =>
    cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", selected ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft");

  return (
    <div className="min-h-screen bg-ensena-bg-soft">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/" aria-label="Ensena home" className="flex justify-center">
          <Logo size={48} />
        </Link>

        <div className="mt-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Welcome to Ensena</h1>
          <p className="mt-1 text-sm text-ensena-muted">Tell us a bit about what you&apos;re studying.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          {step === "course" && (
            <>
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">What course are you studying?</h2>
              <p className="mt-1 text-sm text-ensena-muted">Pick your course, or choose Other to type it in.</p>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} placeholder="Search courses" className="h-10 rounded-xl border-ensena-border pl-9" />
              </div>

              <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto">
                {filteredCourses.map((c) => (
                  <button key={c} type="button" onClick={() => chooseCourse(c)} className={chip(courseChoice === c)}>
                    {c}
                  </button>
                ))}
                <button type="button" onClick={() => chooseCourse(OTHER_COURSE)} className={chip(courseChoice === OTHER_COURSE)}>
                  Other
                </button>
              </div>

              {courseChoice === OTHER_COURSE && (
                <label className="mt-5 flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ensena-ink">Your course</span>
                  <Input value={otherCourse} onChange={(e) => setOtherCourse(e.target.value)} placeholder="e.g. Marine Biology" autoFocus className="h-11 rounded-xl border-ensena-border" />
                </label>
              )}
            </>
          )}

          {step === "subjects" && (
            <>
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">What do you want help with?</h2>
              <p className="mt-1 text-sm text-ensena-muted">
                {degree && course ? <>Select the {course} subjects you&apos;re interested in.</> : <>Select all the subjects you&apos;re interested in.</>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {subjectChips.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSubject(s)} className={chip(subjects.includes(s))}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSubject();
                    }
                  }}
                  placeholder="Can't find a subject? Type it here"
                  className="h-10 rounded-xl border-ensena-border"
                />
                <Button type="button" variant="outline" onClick={addCustomSubject} className="h-10 shrink-0 rounded-xl border-ensena-border px-3 text-sm">
                  <Plus className="size-4" /> Add
                </Button>
              </div>

              <label className="mt-6 flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ensena-ink">What would you like to achieve? <span className="font-normal text-ensena-muted">(optional)</span></span>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  placeholder={degree ? "e.g. I want to pass my final-year project defence." : "e.g. I want to prepare for WAEC Mathematics."}
                  className="rounded-xl border border-ensena-border p-3 text-sm"
                />
              </label>
            </>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success"><CheckCircle2 className="size-6" /></span>
              <h2 className="mt-3 font-heading text-lg font-semibold text-ensena-ink">You&apos;re all set</h2>
              <p className="mt-1 max-w-sm text-sm text-ensena-muted">
                We&apos;ll use this to recommend tutors{subjects.length > 0 ? ` in ${subjects.slice(0, 3).join(", ")}${subjects.length > 3 ? " and more" : ""}` : ""}.
              </p>
            </div>
          )}

          {error && step !== "done" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
            </div>
          )}

          <div className={cn("mt-8 flex items-center border-t border-ensena-border pt-6", step === "subjects" && degree ? "justify-between" : "justify-end")}>
            {step === "subjects" && degree && (
              <Button type="button" variant="outline" onClick={() => { setError(null); setStep("course"); }} disabled={saving} className="h-11 rounded-full border-ensena-border px-5 text-sm font-medium">
                Back
              </Button>
            )}
            {step === "course" && (
              <Button onClick={handleCourseContinue} className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Continue
              </Button>
            )}
            {step === "subjects" && (
              <Button onClick={handleSubjectsContinue} loading={saving} className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Continue
              </Button>
            )}
            {step === "done" && (
              <Button onClick={finish} className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Start Exploring Ensena
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
