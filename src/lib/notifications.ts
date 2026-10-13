// Server-only notification sender: one place that delivers a notification
// to a user by EMAIL (Resend, from noreply@ensena.co) and/or PUSH (web push
// to every device they turned it on for), according to their
// notification_preferences. SMS isn't wired up yet.
//
// Only import from server actions / route handlers.
import webpush from "web-push";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isResendConfigured, sendEmail } from "@/lib/resend";

export type NotificationCategory = "booking" | "homework" | "reminder" | "test" | "security";

export interface UserNotification {
  category: NotificationCategory;
  /** Short title — push notification title and email subject. */
  title: string;
  /** One or two sentences — push body and email paragraph. */
  body: string;
  /** Path to open, e.g. "/student-dashboard/lessons". */
  url?: string;
  /** Optional extra email lines (each its own paragraph). */
  details?: string[];
  ctaLabel?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = { email: true, sms: false, push: false };

const NOTIFICATIONS_FROM = process.env.RESEND_NOTIFICATIONS_FROM || "Ensena <noreply@ensena.co>";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://ensena.co").replace(/\/$/, "");
}

let vapidReady: boolean | null = null;
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (vapidReady = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:noreply@ensena.co", pub, priv);
  return (vapidReady = true);
}

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data } = await getServiceRoleClient().from("notification_preferences").select("email_enabled, sms_enabled, push_enabled").eq("user_id", userId).maybeSingle();
    if (!data) return DEFAULT_PREFERENCES;
    return { email: data.email_enabled, sms: data.sms_enabled, push: data.push_enabled };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function notificationEmail(name: string, n: UserNotification) {
  const link = n.url ? `${siteUrl()}${n.url}` : siteUrl();
  const paragraphs = [n.body, ...(n.details ?? [])];
  const html = `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e7e8ec;border-radius:16px;padding:32px;">
<tr><td style="font-size:22px;font-weight:bold;color:#f80248;padding-bottom:24px;">ensena</td></tr>
<tr><td style="font-size:18px;font-weight:bold;padding-bottom:12px;">Hi ${escapeHtml(name.split(" ")[0] || "there")},</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:14px;">${escapeHtml(p)}</td></tr>`).join("")}
<tr><td align="center" style="padding:10px 0 24px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#f80248;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${escapeHtml(n.ctaLabel ?? "Open Ensena")}</a></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#8a8f9c;">${n.category === "security" ? "This is a security notice about your Ensena account. Ensena will never ask for your password by email." : "You're getting this because email notifications are on in your Ensena settings. You can turn them off anytime under Settings → Notifications."}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [`Hi ${name.split(" ")[0] || "there"},`, "", ...paragraphs, "", link, "", n.category === "security" ? "This is a security notice about your Ensena account." : "Turn these emails off under Settings → Notifications."].join("\n");
  return { subject: n.title, html, text };
}

async function sendPush(userId: string, n: UserNotification): Promise<number> {
  if (!ensureVapid()) return 0;
  const admin = getServiceRoleClient();
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let delivered = 0;
  const payload = JSON.stringify({ title: n.title, body: n.body, url: n.url ?? "/", tag: `${n.category}-${Date.now()}` });
  for (const s of (subs ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // Browser unsubscribed / expired — forget this device.
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return delivered;
}

export interface DeliveryResult {
  email: "sent" | "off" | "failed" | "unavailable";
  push: number | "off";
}

// Delivers `n` to `userId` on every channel they've turned on.
// `force` skips the preference check (used by "Send test").
// `security` always emails (security notices aren't optional) and pushes
// only if they have push on.
export async function notifyUser(userId: string, n: UserNotification, opts: { force?: "email" | "push"; security?: boolean } = {}): Promise<DeliveryResult> {
  const admin = getServiceRoleClient();
  const [prefs, { data: person }] = await Promise.all([getPreferences(userId), admin.from("profiles").select("full_name, email").eq("id", userId).maybeSingle()]);
  const result: DeliveryResult = { email: "off", push: "off" };

  const wantEmail = opts.force ? opts.force === "email" : opts.security || prefs.email;
  if (wantEmail && person?.email) {
    if (!isResendConfigured()) {
      result.email = "unavailable";
    } else {
      const sent = await sendEmail({ to: person.email, from: NOTIFICATIONS_FROM, ...notificationEmail(person.full_name ?? "", n) });
      result.email = sent.ok ? "sent" : "failed";
      if (!sent.ok) console.error("[notifyUser] email failed:", sent.error);
    }
  }

  const wantPush = opts.force ? opts.force === "push" : prefs.push;
  if (wantPush) result.push = await sendPush(userId, n);

  return result;
}

// For scheduled jobs: send once per (user, kind, ref). Returns false if it
// was already sent before.
export async function notifyOnce(userId: string, kind: string, refId: string, n: UserNotification): Promise<boolean> {
  const admin = getServiceRoleClient();
  const { error } = await admin.from("notification_log").insert({ user_id: userId, kind, ref_id: refId });
  if (error) return false; // unique violation = already sent (or table missing)
  await notifyUser(userId, n);
  return true;
}
