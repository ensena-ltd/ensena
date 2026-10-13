"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountSettings, isThemePreference, newCalendarToken, THEME_COOKIE, type ThemePreference } from "@/lib/account-settings";
import { notifyUser } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const MIGRATION_HINT = "The database needs updating first: run supabase/migrations/0016_account_settings.sql in the Supabase SQL Editor.";

function isMissingSchema(code?: string) {
  return code === "42P01" || code === "42703" || code === "PGRST205" || code === "PGRST204";
}

async function currentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Upserts the signed-in user's account_settings row (service role, always
// scoped to the session user's id).
async function saveAccountSettings(userId: string, patch: { login_alerts?: boolean; theme?: ThemePreference; calendar_token?: string }) {
  const admin = getServiceRoleClient();
  const current = await getAccountSettings(userId);
  return admin.from("account_settings").upsert(
    {
      user_id: userId,
      login_alerts: patch.login_alerts ?? current.loginAlerts,
      theme: patch.theme ?? current.theme,
      calendar_token: patch.calendar_token ?? current.calendarToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// --- Privacy ---------------------------------------------------------------

export async function updateMyPrivacy(patch: { profilePublic?: boolean; shareProgressWithGuardian?: boolean }): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const row: Record<string, boolean> = {};
  if (typeof patch.profilePublic === "boolean") row.profile_public = patch.profilePublic;
  if (typeof patch.shareProgressWithGuardian === "boolean") row.share_progress_with_guardian = patch.shareProgressWithGuardian;
  if (!Object.keys(row).length) return { ok: true };

  const { data, error } = await supabase.from("student_profiles").update(row).eq("id", user.id).select("id").maybeSingle();
  if (error) return { ok: false, message: isMissingSchema(error.code) ? MIGRATION_HINT : "We couldn't save your privacy settings." };
  if (!data) return { ok: false, message: "We couldn't find your student profile." };
  revalidatePath("/guardian-dashboard", "layout");
  return { ok: true };
}

// --- Security --------------------------------------------------------------

export async function updateMyLoginAlerts(on: boolean): Promise<ActionResult> {
  const { user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await saveAccountSettings(user.id, { login_alerts: on });
  if (error) return { ok: false, message: isMissingSchema(error.code) ? MIGRATION_HINT : "We couldn't save your login alert setting." };
  return { ok: true };
}

// Whether the account already has a password (email sign-up) or only signs
// in with Google — Google-only accounts can set a first password without
// entering a current one.
export async function myPasswordStatus(): Promise<{ hasPassword: boolean }> {
  const { user } = await currentUser();
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [user?.app_metadata?.provider as string];
  return { hasPassword: providers.includes("email") || !!user?.identities?.some((i) => i.provider === "email") };
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user?.email) return { ok: false, message: "Please sign in again." };

  const next = input.newPassword;
  if (next.length < 8) return { ok: false, message: "Your new password must be at least 8 characters." };
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { ok: false, message: "Use at least one letter and one number in your new password." };
  if (next.length > 72) return { ok: false, message: "That password is too long (72 characters max)." };

  const { hasPassword } = await myPasswordStatus();
  if (hasPassword) {
    if (!input.currentPassword) return { ok: false, message: "Please enter your current password." };
    if (input.currentPassword === next) return { ok: false, message: "Your new password must be different from your current one." };
    // Check the current password on a throwaway client so the visitor's
    // own session cookies aren't touched.
    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: wrong } = await verifier.auth.signInWithPassword({ email: user.email, password: input.currentPassword });
    if (wrong) return { ok: false, message: "Your current password is incorrect." };
    await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.code === "same_password") return { ok: false, message: "Your new password must be different from your current one." };
    if (error.code === "weak_password") return { ok: false, message: "That password is too weak — try a longer one with letters, numbers and symbols." };
    if (error.code === "reauthentication_needed") return { ok: false, message: "For security, please sign out and sign back in, then change your password." };
    return { ok: false, message: error.message || "We couldn't change your password." };
  }

  // Security notice — always emailed.
  await notifyUser(
    user.id,
    {
      category: "security",
      title: hasPassword ? "Your Ensena password was changed" : "A password was added to your Ensena account",
      body: hasPassword
        ? "The password for your Ensena account was just changed."
        : "A password was just added to your Ensena account. You can now sign in with your email and password as well as with Google.",
      details: [
        `When: ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" })} (WAT)`,
        "If this wasn't you, reset your password from the sign-in page straight away and contact Ensena Support.",
      ],
      url: "/sign-in",
      ctaLabel: "Go to Ensena",
    },
    { security: true }
  ).catch(() => undefined);

  return { ok: true, message: hasPassword ? "Password updated." : "Password added — you can now also sign in with email and password." };
}

// --- Theme -----------------------------------------------------------------

export async function updateMyTheme(theme: ThemePreference): Promise<ActionResult> {
  if (!isThemePreference(theme)) return { ok: false, message: "Unknown theme." };
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 400 });
  const { user } = await currentUser();
  if (!user) return { ok: true };
  const { error } = await saveAccountSettings(user.id, { theme });
  // The theme still applies on this browser even if the table is missing.
  if (error) return { ok: true, message: isMissingSchema(error.code) ? MIGRATION_HINT : undefined };
  return { ok: true };
}

// --- Calendar feed ---------------------------------------------------------

export async function getMyCalendarFeed(opts: { regenerate?: boolean } = {}): Promise<ActionResult & { token?: string }> {
  const { user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const current = await getAccountSettings(user.id);
  if (current.calendarToken && !opts.regenerate) return { ok: true, token: current.calendarToken };
  const token = newCalendarToken();
  const { error } = await saveAccountSettings(user.id, { calendar_token: token });
  if (error) return { ok: false, message: isMissingSchema(error.code) ? MIGRATION_HINT : "We couldn't create your calendar link." };
  return { ok: true, token };
}

export async function disableMyCalendarFeed(): Promise<ActionResult> {
  const { user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await getServiceRoleClient().from("account_settings").update({ calendar_token: null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) return { ok: false, message: isMissingSchema(error.code) ? MIGRATION_HINT : "We couldn't turn off calendar sync." };
  return { ok: true };
}
