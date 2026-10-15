// Server-only per-account settings: login alerts, theme and the private
// calendar-feed token (account_settings), plus new-device sign-in detection
// (known_devices). Only import from server actions / route handlers /
// server components.
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { notifyUser } from "@/lib/notifications";
import { isPublicOrigin } from "@/lib/site-url";
import { requestOrigin } from "@/lib/site-url-server";

import { THEME_COOKIE, type ThemePreference } from "@/lib/theme";

export { THEME_COOKIE, type ThemePreference };

export interface AccountSettings {
  loginAlerts: boolean;
  theme: ThemePreference;
  calendarToken: string | null;
  /** False when the user has no account_settings row yet (all defaults). */
  saved?: boolean;
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = { loginAlerts: true, theme: "light", calendarToken: null };

const DEVICE_COOKIE = "ensena-device";

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

export async function getAccountSettings(userId: string): Promise<AccountSettings> {
  try {
    const { data } = await getServiceRoleClient().from("account_settings").select("login_alerts, theme, calendar_token").eq("user_id", userId).maybeSingle();
    if (!data) return DEFAULT_ACCOUNT_SETTINGS;
    return { loginAlerts: data.login_alerts, theme: isThemePreference(data.theme) ? data.theme : "light", calendarToken: data.calendar_token, saved: true };
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS;
  }
}

export function newCalendarToken(): string {
  return randomBytes(24).toString("base64url");
}

// --- New-device sign-in alerts ---------------------------------------------

function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "a browser";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "an unknown device";
  return `${browser} on ${os}`;
}

// Call right after a successful sign-in (password or Google). Remembers this
// browser (long-lived cookie + known_devices row). If it's a browser the
// account hasn't used before — and it isn't their very first one — and
// Login Alerts is on, emails them (and pushes, if they have push on) after
// the response is sent so sign-in isn't slowed down. The email asks "was
// this you?" — see /security/device/[token]. Never throws.
export async function recordSignIn(userId: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const h = await headers();
    let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
    if (!deviceId || !/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) {
      deviceId = randomBytes(18).toString("base64url");
    }
    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });

    const ua = (h.get("user-agent") ?? "").slice(0, 300);
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const city = h.get("x-vercel-ip-city");
    const country = h.get("x-vercel-ip-country");
    const id = deviceId;
    const origin = await requestOrigin();
    const place = city ? `${decodeURIComponent(city)}${country ? `, ${country}` : ""}` : country || null;

    after(async () => {
      const admin = getServiceRoleClient();
      // Later emails (reminders etc.) link back to the site they last used.
      if (isPublicOrigin(origin)) await admin.from("profiles").update({ site_origin: origin }).eq("id", userId);
      const { data: known, error } = await admin.from("known_devices").select("id, status").eq("user_id", userId).eq("device_id", id).maybeSingle();
      if (error) return; // table missing (migration 0016 not run yet)
      const nowIso = new Date().toISOString();
      // A device the owner already confirmed (or hasn't answered about yet) just gets its last-seen time updated.
      if (known && known.status !== "denied") {
        await admin.from("known_devices").update({ last_seen_at: nowIso, user_agent: ua, ip: ip || null, location: place }).eq("id", known.id);
        return;
      }
      const { count } = await admin.from("known_devices").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "denied");
      const settings = await getAccountSettings(userId);
      // The first device on record (normally the one they signed up on) is trusted automatically.
      const alert = !!count && settings.loginAlerts;
      const reviewToken = alert ? randomBytes(24).toString("base64url") : null;
      const row = { user_agent: ua, ip: ip || null, location: place, last_seen_at: nowIso, status: alert ? "pending" : "trusted", review_token: reviewToken, reviewed_at: null };
      if (known) await admin.from("known_devices").update(row).eq("id", known.id);
      else await admin.from("known_devices").insert({ user_id: userId, device_id: id, ...row });
      if (!alert || !reviewToken) return;

      const when = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" });
      const reviewUrl = `${origin}/security/device/${reviewToken}`;
      await notifyUser(
        userId,
        {
          category: "security",
          title: "New sign-in to your Ensena account — was this you?",
          body: `Your Ensena account was just signed in to from a device we don't recognise: ${describeDevice(ua)}.`,
          details: [
            `When: ${when} (WAT)`,
            ...(place ? [`Approximate location: ${place}`] : []),
            ...(ip ? [`IP address: ${ip}`] : []),
            "Was this you? Let us know below. If it wasn't, we'll sign that device out straight away and help you reset your password.",
          ],
          url: `${reviewUrl}?answer=yes`,
          ctaLabel: "Yes, it was me",
          secondaryCta: { label: "No, secure my account", url: `${reviewUrl}?answer=no` },
        },
        { security: true }
      );
    });
  } catch (err) {
    console.error("[recordSignIn]", err);
  }
}

// Email sign-ups have no session until the email is verified, so the browser
// they registered on is remembered here instead: the first device on record
// is trusted and never triggers a "new sign-in" alert. Only for brand-new
// accounts (created in the last 30 minutes) with no device yet. Never throws.
export async function rememberSignupDevice(userId: string): Promise<void> {
  try {
    const admin = getServiceRoleClient();
    const { data: auth } = await admin.auth.admin.getUserById(userId);
    const createdMs = auth?.user?.created_at ? new Date(auth.user.created_at).getTime() : 0;
    if (!createdMs || Date.now() - createdMs > 30 * 60_000) return;
    const { count } = await admin.from("known_devices").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (count) return;

    const cookieStore = await cookies();
    const h = await headers();
    let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
    if (!deviceId || !/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) deviceId = randomBytes(18).toString("base64url");
    cookieStore.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
    const city = h.get("x-vercel-ip-city");
    const country = h.get("x-vercel-ip-country");
    await admin.from("known_devices").insert({
      user_id: userId,
      device_id: deviceId,
      user_agent: (h.get("user-agent") ?? "").slice(0, 300),
      ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
      location: city ? `${decodeURIComponent(city)}${country ? `, ${country}` : ""}` : country || null,
      status: "trusted",
    });
  } catch (err) {
    console.error("[rememberSignupDevice]", err);
  }
}
