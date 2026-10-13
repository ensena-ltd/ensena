"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { recordSignIn } from "@/lib/account-settings";
import { getSupabaseServerClient as getSupabaseServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/require-role";
import { guardianConsentEmail, isResendConfigured, passwordResetEmail, sendEmail } from "@/lib/resend";
import { notifyUser } from "@/lib/notifications";
import { safeRedirectPath } from "@/lib/utils";

export interface SignInState {
  status: "idle" | "error";
  message?: string;
}

// Real Supabase sign-in — only ever called when NEXT_PUBLIC_SUPABASE_URL/
// ANON_KEY are configured (see sign-in-client.tsx, which falls back to the
// existing demo/platform-user check otherwise). Redirects itself on
// success, matching the Next.js Server Action auth pattern, so the caller
// only needs to handle the error case.
export async function signInWithSupabase(email: string, password: string, redirectTo?: string): Promise<SignInState> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { status: "error", message: "Please enter your email and password." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

  if (error?.code === "email_not_confirmed") {
    return { status: "error", message: "Please confirm your email first — check your inbox for the link we sent when you signed up." };
  }
  if (error || !data.user) {
    return { status: "error", message: "Incorrect email or password." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const role = (profile?.role as AppRole) ?? "student";

  // A Platform User (fine-grained staff role, tracked in user_staff_roles —
  // see require-role.ts's own doc comment on the coarse/fine split) can be
  // suspended by a Super Admin without touching their profiles.role or
  // deleting their account. Reject the sign-in itself, same "suspended"
  // error key the sign-in form already renders for the old demo check.
  if (role === "admin") {
    const { data: staffRole } = await supabase.from("user_staff_roles").select("status").eq("user_id", data.user.id).maybeSingle();
    if (staffRole?.status === "suspended") {
      await supabase.auth.signOut();
      return { status: "error", message: "Your Platform User access has been suspended. Contact your Super Admin." };
    }
  }

  // Remembers this browser and sends a Login Alert if it's a new device.
  await recordSignIn(data.user.id, role);

  redirect(safeRedirectPath(redirectTo) || dashboardHrefByRole[role] || "/");
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

// Used by the /logout page: clears the server-side session cookies without
// redirecting, so the page can finish its own clean-up and show a toast.
export async function endSupabaseSession(): Promise<{ ok: boolean }> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return { ok: !error };
}

export interface GuardianDetails {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
}

export interface GuardianConsentState {
  status: "ok" | "error";
  message?: string;
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function emailHasAccount(email: string): Promise<boolean> {
  const { data } = await getSupabaseServiceRoleClient().from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
  return !!data;
}

function validateGuardian(guardian: GuardianDetails, studentEmail: string): string | null {
  if (!guardian.fullName.trim() || !guardian.email.trim() || !guardian.phone.trim()) return "Please fill in all fields.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email.trim())) return "Please enter a valid email for the parent or guardian.";
  if (guardian.email.trim().toLowerCase() === studentEmail.trim().toLowerCase()) return "The parent or guardian needs their own email address, different from the student's.";
  return null;
}

// Run BEFORE the email/password sign-up creates the student's account, so a
// guardian email we can't invite (already on Ensena) is caught while the
// student can still change it.
export async function checkGuardianEmail(guardian: GuardianDetails, studentEmail: string): Promise<GuardianConsentState> {
  const invalid = validateGuardian(guardian, studentEmail);
  if (invalid) return { status: "error", message: invalid };
  if (await emailHasAccount(guardian.email)) {
    return { status: "error", message: "That parent/guardian email already has an Ensena account. Please use a different email." };
  }
  return { status: "ok" };
}

// Saves the student's parent/guardian (student_guardians) and emails the
// guardian a consent request (via Resend) with a one-time Supabase invite
// link that lets them confirm consent and set up a Guardian Dashboard
// (/accept-guardian-invitation).
//
// Two callers:
//  - Google sign-up: the student is signed in, so the session identifies them.
//  - Email sign-up: the account was created seconds ago and isn't confirmed
//    yet (no session), so the client passes the new user id. That's only
//    accepted for an unconfirmed account under an hour old, and details can't
//    be overwritten once the request has been sent.
// Uses the service-role client because inviting another person by email
// needs auth.admin — never import getSupabaseServiceRoleClient client-side.
export async function requestGuardianConsent(input: { studentId?: string; guardian: GuardianDetails }): Promise<GuardianConsentState> {
  const admin = getSupabaseServiceRoleClient();
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  let studentId: string;
  if (user) {
    studentId = user.id;
  } else {
    if (!input.studentId) return { status: "error", message: "Your sign-up session has expired. Please start again." };
    const { data } = await admin.auth.admin.getUserById(input.studentId);
    const pending = data.user && !data.user.email_confirmed_at && Date.now() - new Date(data.user.created_at).getTime() < 60 * 60 * 1000;
    if (!pending) return { status: "error", message: "Your sign-up session has expired. Please start again." };
    studentId = input.studentId;
  }

  const { data: student } = await admin.from("profiles").select("role, full_name, email").eq("id", studentId).maybeSingle();
  if (!student || student.role !== "student") return { status: "error", message: "Only student accounts can add a parent or guardian." };

  const invalid = validateGuardian(input.guardian, student.email);
  if (invalid) return { status: "error", message: invalid };

  const { data: existing } = await admin.from("student_guardians").select("consent_requested_at").eq("student_id", studentId).maybeSingle();
  if (existing?.consent_requested_at) return { status: "ok" };

  const guardianEmail = input.guardian.email.trim().toLowerCase();
  if (await emailHasAccount(guardianEmail)) {
    return { status: "error", message: "That parent/guardian email already has an Ensena account. Please use a different email." };
  }

  const { error: saveError } = await admin.from("student_guardians").upsert({
    student_id: studentId,
    full_name: input.guardian.fullName.trim(),
    relationship: input.guardian.relationship,
    email: guardianEmail,
    phone: input.guardian.phone.trim(),
  });
  if (saveError) return { status: "error", message: "Something went wrong saving your parent/guardian. Please try again." };

  if (!isResendConfigured()) {
    return { status: "error", message: "Emails aren't set up yet (RESEND_API_KEY / RESEND_FROM_EMAIL missing). Please contact Ensena Support." };
  }

  // Supabase creates the guardian's account and a one-time invite token but
  // sends nothing; the email itself goes out through Resend. The link points
  // at our own /auth/callback, which verifies the token (verifyOtp) and
  // forwards to /accept-guardian-invitation to set a password + consent.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: guardianEmail,
    options: {
      data: {
        role: "guardian",
        full_name: input.guardian.fullName.trim(),
        phone: input.guardian.phone.trim(),
        relationship: input.guardian.relationship,
        student_first_name: (student.full_name ?? "").split(" ")[0],
        guardian_for_student_id: studentId,
      },
    },
  });
  if (linkError || !link.properties?.hashed_token || !link.user) {
    return { status: "error", message: "We couldn't create the consent request. Please try again." };
  }

  const acceptUrl = `${await requestOrigin()}/auth/callback?${new URLSearchParams({
    token_hash: link.properties.hashed_token,
    type: "invite",
    next: "/accept-guardian-invitation",
  })}`;

  const sent = await sendEmail({
    to: guardianEmail,
    ...guardianConsentEmail({
      guardianName: input.guardian.fullName.trim(),
      studentName: student.full_name ?? "",
      relationship: input.guardian.relationship,
      link: acceptUrl,
    }),
  });
  if (!sent.ok) {
    // Undo the guardian account so the student can simply try again.
    console.error("[requestGuardianConsent] Resend failed:", sent.error);
    await admin.auth.admin.deleteUser(link.user.id);
    return { status: "error", message: "We couldn't send the consent email. Please check the address and try again." };
  }

  await admin.from("student_guardians").update({ consent_requested_at: new Date().toISOString() }).eq("student_id", studentId);
  return { status: "ok" };
}

// "Resend consent email" on the student dashboard's Parent / Guardian card.
// The guardian's account already exists (created by the first request), so
// this uses a one-time magic-link token instead of a fresh invite. Limited
// to once every 2 minutes per student.
export async function resendGuardianConsent(): Promise<GuardianConsentState> {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const admin = getSupabaseServiceRoleClient();
  const { data: row } = await admin
    .from("student_guardians")
    .select("full_name, relationship, email, consent_status, consent_requested_at")
    .eq("student_id", user.id)
    .maybeSingle();
  if (!row) return { status: "error", message: "No parent or guardian is linked to this account." };
  if (row.consent_status === "confirmed") return { status: "ok" };
  if (row.consent_requested_at && Date.now() - new Date(row.consent_requested_at).getTime() < 2 * 60 * 1000) {
    return { status: "error", message: "We just sent one — please wait a couple of minutes before resending." };
  }
  if (!isResendConfigured()) {
    return { status: "error", message: "Emails aren't set up yet (RESEND_API_KEY / RESEND_FROM_EMAIL missing)." };
  }

  const { data: student } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: row.email });
  if (linkError || !link.properties?.hashed_token) {
    return { status: "error", message: "We couldn't create a new consent link. Please try again." };
  }

  const acceptUrl = `${await requestOrigin()}/auth/callback?${new URLSearchParams({
    token_hash: link.properties.hashed_token,
    type: "email",
    next: "/accept-guardian-invitation",
  })}`;
  const sent = await sendEmail({
    to: row.email,
    ...guardianConsentEmail({ guardianName: row.full_name, studentName: student?.full_name ?? "", relationship: row.relationship, link: acceptUrl }),
  });
  if (!sent.ok) {
    console.error("[resendGuardianConsent] Resend failed:", sent.error);
    return { status: "error", message: "We couldn't send the consent email. Please try again." };
  }

  await admin.from("student_guardians").update({ consent_requested_at: new Date().toISOString() }).eq("student_id", user.id);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Tutor sign-up profile photo (avatars bucket, 5MB max, JPG/PNG/WEBP).
// The browser uploads straight to Storage with a one-time signed URL, so the
// file never goes through a server action (1MB body limit). Works for:
//  - email sign-ups: the account was created seconds ago and isn't
//    confirmed yet (no session), so the client passes the new user id —
//    only accepted for an unconfirmed account under an hour old;
//  - Google sign-ups: the signed-in session identifies the tutor.
// ---------------------------------------------------------------------------

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function resolveNewTutorId(userId?: string): Promise<string | null> {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  const admin = getSupabaseServiceRoleClient();
  let id: string | null = user?.id ?? null;
  if (!id && userId) {
    const { data } = await admin.auth.admin.getUserById(userId);
    const pending = data.user && !data.user.email_confirmed_at && Date.now() - new Date(data.user.created_at).getTime() < 60 * 60 * 1000;
    id = pending ? userId : null;
  }
  if (!id) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  return profile?.role === "tutor" ? id : null;
}

export async function createTutorPhotoUpload(input: { userId?: string; contentType: string; size: number }): Promise<
  { status: "ok"; path: string; token: string } | { status: "error"; message: string }
> {
  const ext = PHOTO_TYPES[input.contentType];
  if (!ext) return { status: "error", message: "Please use a JPG, PNG or WEBP photo." };
  if (input.size > MAX_PHOTO_BYTES) return { status: "error", message: "Your photo must be 5MB or smaller." };

  const id = await resolveNewTutorId(input.userId);
  if (!id) return { status: "error", message: "Your sign-up session has expired. Please sign in and add your photo from your dashboard." };

  const path = `${id}/avatar-${Date.now()}.${ext}`;
  const { data, error } = await getSupabaseServiceRoleClient().storage.from("avatars").createSignedUploadUrl(path);
  if (error || !data) return { status: "error", message: "We couldn't prepare your photo upload. Please try again." };
  return { status: "ok", path: data.path, token: data.token };
}

export async function saveTutorPhoto(input: { userId?: string; path: string }): Promise<GuardianConsentState> {
  const id = await resolveNewTutorId(input.userId);
  if (!id || !input.path.startsWith(`${id}/`)) return { status: "error", message: "We couldn't save your photo." };
  const admin = getSupabaseServiceRoleClient();
  const { data } = admin.storage.from("avatars").getPublicUrl(input.path);
  const { error } = await admin.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", id);
  return error ? { status: "error", message: "We couldn't save your photo." } : { status: "ok" };
}

// ── Forgot password ────────────────────────────────────────────────────

const RESET_FROM = process.env.RESEND_PASSWORD_RESET_FROM || "Ensena <noreply@ensena.co>";
const RESET_COOLDOWN_MS = 60_000;

export interface PasswordResetState {
  status: "ok" | "error";
  message?: string;
}

// Looks the email up in our own profiles table and, when it belongs to an
// account, has Supabase create a one-time recovery token (generateLink
// sends nothing itself), then emails the link through Resend from
// noreply@ensena.co. The link goes to /auth/callback, which verifies the
// token and signs the person into a recovery session on /reset-password.
// Answers straight away and does the lookup + email after the response
// (next/server's after()), so the "Check your email" screen appears
// instantly, and the response is the same whether or not the email has an
// account, so this can't be used to find out who's registered. Every
// outcome is logged as [password-reset] in the server log.
export async function requestPasswordReset(rawEmail: string): Promise<PasswordResetState> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (!isResendConfigured()) return { status: "error", message: "Password reset emails aren't available right now. Please contact support@ensena.co." };

  const origin = await requestOrigin();
  after(async () => {
    try {
      const outcome = await sendPasswordResetEmail(email, origin);
      console.info(`[password-reset] ${maskEmail(email)}: ${outcome}`);
    } catch (err) {
      console.error(`[password-reset] ${maskEmail(email)}: failed`, err);
    }
  });
  return { status: "ok" };
}

function maskEmail(email: string): string {
  return email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
}

async function sendPasswordResetEmail(email: string, origin: string): Promise<string> {
  const admin = getSupabaseServiceRoleClient();
  // Case-insensitive match (ilike with wildcards escaped), in case an
  // address was stored with capitals.
  const pattern = email.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data: matches } = await admin.from("profiles").select("id, full_name, email").ilike("email", pattern).limit(2);
  const profile = (matches ?? []).find((p) => (p.email ?? "").toLowerCase() === email);
  if (!profile) return "no account with this email, nothing sent";

  // One email a minute per account, so the button can't be used to flood an inbox.
  const { data: existing } = await admin.auth.admin.getUserById(profile.id);
  if (!existing?.user) return "no sign-in for this profile, nothing sent";
  const lastSent = Number(existing.user.app_metadata?.password_reset_sent_at ?? 0);
  if (Date.now() - lastSent < RESET_COOLDOWN_MS) return "already sent in the last minute, skipped";

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (linkError || !link.properties?.hashed_token) return `Supabase couldn't create the link: ${linkError?.message ?? "no token"}`;

  const resetUrl = `${origin}/auth/callback?${new URLSearchParams({
    token_hash: link.properties.hashed_token,
    type: "recovery",
    next: "/reset-password",
  })}`;

  const sent = await sendEmail({ to: email, from: RESET_FROM, ...passwordResetEmail({ name: profile.full_name ?? "", link: resetUrl }) });
  if (!sent.ok) return `Resend rejected the email: ${sent.error}`;

  await admin.auth.admin.updateUserById(profile.id, { app_metadata: { ...existing.user.app_metadata, password_reset_sent_at: Date.now() } });
  return `sent (Resend id ${sent.id})`;
}

// Called by /reset-password right after the new password is saved (while
// the recovery session is still valid): sends a security notice, then ends
// every session, including this one, so they sign in fresh everywhere.
export async function finishPasswordReset(): Promise<{ ok: boolean }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  try {
    await notifyUser(
      user.id,
      {
        category: "security",
        title: "Your Ensena password was changed",
        body: "The password for your Ensena account was just changed. If this was you, there's nothing else to do.",
        details: ["If you didn't change it, reset your password again straight away and contact support@ensena.co."],
        url: "/forgot-password",
        ctaLabel: "Reset password",
      },
      { security: true }
    );
  } catch (err) {
    console.error("[finishPasswordReset] notice failed:", err);
  }
  await supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}
