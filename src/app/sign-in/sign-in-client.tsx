"use client";

import { useState, type SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { heroImage } from "@/lib/data";
import { setCurrentAdminSession } from "@/lib/admin-session";
import { attemptDemoSignIn } from "@/lib/demo-auth";
import { setCurrentSession } from "@/lib/session-store";
import { attemptPlatformUserSignIn } from "@/lib/admin-platform-users-store";
import { signInWithSupabase } from "@/lib/actions/auth";
import { buildContactSupportHref } from "@/lib/support-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeRedirectPath } from "@/lib/utils";
import { useErrorToast } from "@/hooks/use-error-toast";
import { SITE_URL } from "@/lib/site-url";

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

const errorMessages: Record<string, { message: string; action?: { label: string; href: string } }> = {
  "missing-fields": { message: "Please enter your email and password." },
  "account-not-found": { message: "We couldn't find an account with that email.", action: { label: "Create an account", href: "/sign-up" } },
  "incorrect-password": { message: "Incorrect password. Try again or reset your password.", action: { label: "Reset password", href: "/forgot-password" } },
  suspended: { message: "Your Platform User access has been suspended. Contact your Super Admin." },
};

const supabaseConfigured = isSupabaseConfigured();

export function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo")) ?? undefined;
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<keyof typeof errorMessages | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  useErrorToast(supabaseError);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const callbackErrorParam = searchParams.get("error");
  const authCallbackError = callbackErrorParam === "auth-failed" ? "That link didn't work or has expired. Please try again." : null;
  const noAccountError = callbackErrorParam === "no-account";
  const notice =
    searchParams.get("reason") === "idle"
      ? { icon: Clock, text: "You were logged out after 15 minutes of inactivity. Please log in again." }
      : searchParams.get("reset") === "1"
        ? { icon: CheckCircle2, text: "Your password was changed. Log in with your new password." }
        : null;
  useErrorToast(error ? errorMessages[error].message : authCallbackError ?? (noAccountError ? "There's no Ensena account for that Google email yet." : null));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Once a real Supabase project is configured, it's the only path — see
    // src/lib/supabase/env.ts. Until then, this falls through untouched to
    // the existing demo/platform-user check below.
    try {
      if (email.trim()) window.localStorage.setItem("ensena_last_email", email.trim());
    } catch {
      // Not remembered — fine.
    }

    if (supabaseConfigured) {
      setError(null);
      setSupabaseError(null);
      setSubmitting(true);
      const result = await signInWithSupabase(email, password, redirectTo);
      setSubmitting(false);
      // signInWithSupabase redirects itself on success (throwing Next's
      // internal redirect signal), so reaching here always means failure.
      if (result.status === "error") setSupabaseError(result.message ?? "Something went wrong. Please try again.");
      return;
    }

    const result = attemptDemoSignIn(email, password);
    if (result.ok) {
      setError(null);
      if (result.account.role === "Admin") {
        setCurrentAdminSession({ userId: "platform-super-admin", name: result.account.name, email: result.account.email, image: "/teacher-4.jpg.png", role: "Super Admin" });
      } else {
        setCurrentSession({ role: result.account.role, name: result.account.name, email: result.account.email });
      }
      // A guest redirected here mid-booking (see require-auth.ts) needs to
      // land back on that exact page, not their default dashboard — only
      // fall back to dashboardHref when there's nothing to return to.
      router.push(redirectTo || result.account.dashboardHref);
      return;
    }

    // Not one of the 3 fixed demo accounts — check real Platform User
    // accounts (invited staff) before falling back to the demo-auth error.
    if (result.reason === "account-not-found" && email.trim() && password) {
      const platformResult = attemptPlatformUserSignIn(email, password);
      if (platformResult.ok) {
        setError(null);
        const a = platformResult.account;
        setCurrentAdminSession({ userId: a.id, name: a.name, email: a.email, image: a.image, role: a.role, customSections: a.customSections, customPermissions: a.customPermissions });
        // Unlike the Super Admin demo account, a Platform User isn't
        // "running Ensena solo" — /admin's workspace picker is a dev
        // convenience for the owner persona and doesn't reflect this
        // person's actual (restricted) access, so send them straight to
        // their real, permission-filtered dashboard.
        router.push("/admin/dashboard");
        return;
      }
      if (platformResult.reason === "suspended") {
        setError("suspended");
        return;
      }
      if (platformResult.reason === "wrong-password") {
        setError("incorrect-password");
        return;
      }
    }

    setError(result.reason);
  }

  async function handleGoogleSignIn() {
    if (!supabaseConfigured) {
      setToast("Google sign-in isn't available in this demo.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    // intent=signin makes /auth/callback check this Google account actually
    // belongs to an Ensena user, then route by their role.
    const params = new URLSearchParams({ intent: "signin" });
    if (redirectTo) params.set("redirectTo", redirectTo);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/auth/callback?${params}`,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ensena-bg-soft px-12 py-14 lg:flex">
        <div>
          <Link href="/" aria-label="Ensena home">
            <Logo size={48} />
          </Link>

          <h1 className="mt-10 font-heading text-4xl font-semibold leading-tight text-ensena-ink">
            Welcome back<br />to <span className="text-ensena-primary">Ensena</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ensena-muted">
            Continue your learning journey, connect with students, and achieve more with Ensena.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><ShieldCheck className="size-4.5" /></span>
              <div><p className="text-sm font-semibold text-ensena-ink">Learn from verified tutors</p><p className="text-xs text-ensena-muted">Get the academic support you need to achieve your academic goals.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Video className="size-4.5" /></span>
              <div><p className="text-sm font-semibold text-ensena-ink">Live interactive classes</p><p className="text-xs text-ensena-muted">Engage in real-time with your tutor in our virtual classroom.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Lock className="size-4.5" /></span>
              <div><p className="text-sm font-semibold text-ensena-ink">Secure &amp; trusted platform</p><p className="text-xs text-ensena-muted">Your payments and data are always protected with Ensena.</p></div>
            </div>
          </div>
        </div>

        <div>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-sm">
            <span className="absolute -right-4 -top-4 z-10 flex items-center gap-2.5 rounded-2xl border border-ensena-border bg-ensena-surface px-3.5 py-2.5 shadow-lg">
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Star className="size-2.5 fill-amber-700" /> Top Rated Tutor
              </span>
            </span>
            <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white bg-ensena-bg-soft shadow-[0_20px_60px_-30px_rgba(17,24,39,0.35)]">
              <Image src={heroImage} alt="Student learning on Ensena" fill sizes="24rem" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-4 flex items-center gap-2 rounded-xl border border-ensena-border bg-ensena-surface p-2.5 shadow-lg">
              <span className="flex items-center gap-1 rounded-lg bg-ensena-bg-soft px-2 py-1 text-[11px] font-medium text-ensena-ink"><Calendar className="size-3" /> May 2025</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-ensena-ink">&ldquo;Ensena helped me find the right tutor and improved my grades significantly!&rdquo;</p>
            <p className="mt-2 text-xs font-semibold text-ensena-ink">Cynthia A. <span className="font-normal text-ensena-primary">Student</span></p>
          </div>
        </div>
      </div>

      {/* Right: login card */}
      <div className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" aria-label="Ensena home" className="mb-8 flex justify-center lg:hidden">
            <Logo size={48} />
          </Link>

          <h2 className="font-heading text-2xl font-semibold text-ensena-ink">Welcome back</h2>
          <p className="mt-1 text-sm text-ensena-muted">Log in to your Ensena account</p>
          {notice && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-ensena-border bg-ensena-bg-soft px-3.5 py-3 text-sm text-ensena-ink">
              <notice.icon className="mt-0.5 size-4 shrink-0 text-ensena-primary" /> {notice.text}
            </p>
          )}

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Email address</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className="h-11 rounded-xl border-ensena-border pl-9"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  aria-label="Password"
                  className="h-11 rounded-xl border-ensena-border px-9"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-ensena-muted hover:text-ensena-ink">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {authCallbackError && !supabaseError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{authCallbackError}</p>
              </div>
            )}

            {noAccountError && !supabaseError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>There&apos;s no Ensena account for that Google email yet.</p>
                  <Link href={redirectTo ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}` : "/sign-up"} className="font-semibold underline">Create an account</Link>
                </div>
              </div>
            )}

            {supabaseError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{supabaseError}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{errorMessages[error].message}</p>
                  {errorMessages[error].action && (
                    <Link href={errorMessages[error].action!.href} className="font-semibold underline">
                      {errorMessages[error].action!.label}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ensena-ink">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                Remember me
              </label>
              <Link href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"} className="text-sm font-medium text-ensena-primary hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" loading={submitting} className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-ensena-border" />
            <span className="text-xs text-ensena-muted">or</span>
            <div className="h-px flex-1 bg-ensena-border" />
          </div>

          <Button variant="outline" onClick={handleGoogleSignIn} className="h-11 w-full rounded-xl border-ensena-border text-sm font-medium text-ensena-ink">
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-ensena-muted">
            New to Ensena?{" "}
            <Link
              href={redirectTo ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}` : "/sign-up"}
              className="font-semibold text-ensena-primary hover:underline"
            >
              Sign up
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-ensena-muted">
            By continuing, you agree to Ensena&apos;s <Link href="/terms" target="_blank" className="text-ensena-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-ensena-primary hover:underline">Privacy Policy</Link>.
          </p>
          <p className="mt-2 text-center text-xs text-ensena-muted">
            Need help? <Link href={buildContactSupportHref({ role: "Guest", context: "account", category: "Login issues" })} className="text-ensena-primary hover:underline">Contact support</Link>
          </p>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
