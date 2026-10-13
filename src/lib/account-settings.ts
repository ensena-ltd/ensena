// Server-only per-account settings: login alerts, theme and the private
// calendar-feed token (account_settings), plus new-device sign-in detection
// (known_devices). Only import from server actions / route handlers /
// server components.
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { notifyUser } from "@/lib/notifications";

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
// the response is sent so sign-in isn't slowed down. Never throws.
export async function recordSignIn(userId: string, role?: string | null): Promise<void> {
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

    after(async () => {
      const admin = getServiceRoleClient();
      const { data: known, error } = await admin.from("known_devices").select("id").eq("user_id", userId).eq("device_id", id).maybeSingle();
      if (error) return; // table missing (migration 0016 not run yet)
      if (known) {
        await admin.from("known_devices").update({ last_seen_at: new Date().toISOString(), user_agent: ua }).eq("id", known.id);
        return;
      }
      const { count } = await admin.from("known_devices").select("id", { count: "exact", head: true }).eq("user_id", userId);
      await admin.from("known_devices").insert({ user_id: userId, device_id: id, user_agent: ua });
      if (!count) return; // first device on record — nothing to compare against

      const settings = await getAccountSettings(userId);
      if (!settings.loginAlerts) return;

      const when = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" });
      const place = city ? `${decodeURIComponent(city)}${country ? `, ${country}` : ""}` : country || null;
      await notifyUser(
        userId,
        {
          category: "security",
          title: "New sign-in to your Ensena account",
          body: `Your Ensena account was just signed in to from a new device: ${describeDevice(ua)}.`,
          details: [
            `When: ${when} (WAT)`,
            ...(place ? [`Approximate location: ${place}`] : []),
            ...(ip ? [`IP address: ${ip}`] : []),
            "If this was you, you can ignore this email. If it wasn't, change your password right away under Settings → Security.",
          ],
          url: role === "student" ? "/student-dashboard/settings?tab=Security" : role === "tutor" ? "/tutor-dashboard/settings" : "/",
          ctaLabel: "Review security settings",
        },
        { security: true }
      );
    });
  } catch (err) {
    console.error("[recordSignIn]", err);
  }
}
