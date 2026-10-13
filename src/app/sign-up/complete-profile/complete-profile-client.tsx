"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, GraduationCap, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useErrorToast } from "@/hooks/use-error-toast";

// Reached only via /auth/callback, right after a brand-new Google sign-in
// that doesn't have a role yet (see the route's own comment). Google gives
// us a real account instantly — this is the one thing it can't tell us.
export function CompleteProfileClient() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [claiming, setClaiming] = useState<"student" | "tutor" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useErrorToast(error);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/sign-in");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function choose(role: "student" | "tutor") {
    setClaiming(role);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("claim_oauth_signup_role", { new_role: role });
    if (rpcError) {
      setClaiming(null);
      setError("Something went wrong setting up your account. Please try again.");
      return;
    }
    router.push(role === "student" ? "/sign-up/student/details" : "/sign-up/tutor?google=1");
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <Link href="/" aria-label="Ensena home" className="mb-8">
        <Logo size={48} />
      </Link>

      <div className="w-full max-w-lg text-center">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">You&apos;re almost in</h1>
        <p className="mt-1 text-sm text-ensena-muted">One last thing — what brings you to Ensena?</p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-left text-sm text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={claiming !== null}
            onClick={() => choose("student")}
            className="flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-6 text-center transition-colors hover:border-ensena-primary disabled:opacity-60"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><GraduationCap className="size-5" /></span>
            <span className="font-heading text-lg font-semibold text-ensena-ink">I want to learn</span>
            <span className="text-xs text-ensena-muted">Find tutors, book sessions, join group classes.</span>
            <Button loading={claiming === "student"} className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Continue as Student <ArrowRight className="size-4" />
            </Button>
          </button>

          <button
            type="button"
            disabled={claiming !== null}
            onClick={() => choose("tutor")}
            className="flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-6 text-center transition-colors hover:border-violet-500 disabled:opacity-60"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Users className="size-5" /></span>
            <span className="font-heading text-lg font-semibold text-ensena-ink">I want to teach</span>
            <span className="text-xs text-ensena-muted">Create a tutor profile and reach students.</span>
            <Button loading={claiming === "tutor"} className="mt-1 h-10 w-full rounded-full bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">
              Continue as Tutor <ArrowRight className="size-4" />
            </Button>
          </button>
        </div>
      </div>
    </div>
  );
}
