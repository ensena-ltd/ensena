import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";

import { recordSignIn } from "@/lib/account-settings";
import { getSupabaseServerClient as getSupabaseServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/require-role";
import { safeRedirectPath } from "@/lib/utils";

// Google's OAuth round-trip creates an auth.users row for ANY Google account
// it sees, whether or not that person ever signed up for Ensena. A "sign-in"
// that produced an account seconds ago therefore means "not in our database"
// — created_at and last_sign_in_at are only this close together on the very
// first sign-in.
function isBrandNewAccount(user: User) {
  if (!user.last_sign_in_at) return true;
  return Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) < 30_000;
}

// Every real auth flow that involves an emailed/redirected link — Google
// OAuth, email confirmation, password reset, guardian/staff invites — comes
// back through here so the PKCE `code` (or an email `token_hash`) can be
// exchanged for a real session cookie (getSupabaseServerClient writes it via
// next/headers) before the visitor lands anywhere else.
//
// Google flows carry an `intent`:
//   - "signin"          (sign-in page) — must already have an Ensena account
//   - "student-signup"  (student sign-up page) — new accounts go on to
//                       /sign-up/student/details
//   - "tutor-signup"    (tutor sign-up page) — new accounts go on to the
//                       tutor wizard's Steps 2-4 (/sign-up/tutor?google=1)
//   - none              (older links) — role chooser
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));
  const intent = searchParams.get("intent");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  const supabase = await getSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
  } else if (tokenHash && otpType) {
    // Works even when the confirmation email is opened on a different
    // device/browser than the one that signed up (no PKCE verifier needed)
    // — used when the Supabase email template links here with token_hash.
    const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    // An old or already-used password reset link gets its own "request a new link" screen.
    if (error && otpType === "recovery") return NextResponse.redirect(`${origin}/reset-password?expired=true`);
    if (error) return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
  } else {
    return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
  }

  // Email confirmation, password reset, and the guardian/staff "finish
  // setting up your account" pages know exactly where they want to send the
  // now-authenticated visitor next — skip the role-based redirect for those.
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role as AppRole | undefined) ?? "student";

  // Students and tutors aren't done signing up until their sub-profile row
  // exists. Email/password sign-ups get it from the handle_new_user trigger;
  // Google sign-ups only get it once they finish /sign-up/student/details
  // or the tutor wizard (/sign-up/tutor?google=1).
  let hasSubProfile = true;
  if (role === "student" || role === "tutor") {
    const table = role === "student" ? "student_profiles" : "tutor_profiles";
    const { data: subProfile } = await supabase.from(table).select("id").eq("id", user.id).maybeSingle();
    hasSubProfile = !!subProfile;
  }

  if (!hasSubProfile) {
    if (intent === "signin" && isBrandNewAccount(user)) {
      // Not an Ensena user — undo the account Google just created so they
      // can sign up properly (and aren't left half-registered). profiles is
      // ON DELETE CASCADE from auth.users.
      await supabase.auth.signOut();
      try {
        await getSupabaseServiceRoleClient().auth.admin.deleteUser(user.id);
      } catch {
        // Service-role key missing — the orphan is harmless: signing up
        // with Google later resumes it at /sign-up/student/details.
      }
      return NextResponse.redirect(`${origin}/sign-in?error=no-account`);
    }

    const redirectParam = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
    // Tutor sign-ups (new, or resuming an unfinished one) finish in the
    // tutor wizard, which makes the account a tutor if it isn't yet.
    if ((intent === "tutor-signup" && role === "student") || role === "tutor") {
      return NextResponse.redirect(`${origin}/sign-up/tutor?google=1`);
    }
    if (role === "student" && (intent === "student-signup" || intent === "signin")) {
      return NextResponse.redirect(`${origin}/sign-up/student/details${redirectParam}`);
    }
    return NextResponse.redirect(`${origin}/sign-up/complete-profile`);
  }

  // Fully registered Google sign-in: remember this browser and send a Login
  // Alert if it's a new device.
  await recordSignIn(user.id, role);

  return NextResponse.redirect(`${origin}${redirectTo || dashboardHrefByRole[role] || "/"}`);
}
