"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notifyUser, type NotificationPreferences } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const MIGRATION_HINT = "The database needs updating first: run supabase/migrations/0015_notifications.sql in the Supabase SQL Editor.";

function isMissingTable(code?: string) {
  return code === "42P01" || code === "PGRST205" || code === "PGRST204";
}

// --- Account (name + phone) ------------------------------------------------

export async function updateMyAccount(input: { fullName: string; phone: string }): Promise<ActionResult> {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.trim();
  if (fullName.length < 2) return { ok: false, message: "Please enter your full name." };
  if (fullName.length > 100) return { ok: false, message: "That name is too long." };
  if (phone && !/^[+\d][\d\s()-]{6,20}$/.test(phone)) return { ok: false, message: "Please enter a valid phone number." };

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const { data: profile, error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", user.id).select("role").maybeSingle();
  if (error || !profile) return { ok: false, message: "We couldn't save your details. Please try again." };

  // Keep the role-specific copy of the phone number in step.
  if (profile.role === "student") await supabase.from("student_profiles").update({ phone: phone || null }).eq("id", user.id);
  if (profile.role === "tutor") await supabase.from("tutor_profiles").update({ phone: phone || null }).eq("id", user.id);
  // Keep auth metadata (shown in emails / Supabase dashboard) in sync too.
  await supabase.auth.updateUser({ data: { full_name: fullName, phone: phone || null } });

  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Preferences -----------------------------------------------------------

export async function updateMyNotificationPreferences(patch: Partial<NotificationPreferences>): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, message: "Please sign in again." };
  const supabase = await getSupabaseServerClient();
  const { data: existing, error: readError } = await supabase.from("notification_preferences").select("email_enabled, sms_enabled, push_enabled").eq("user_id", id).maybeSingle();
  if (readError && isMissingTable(readError.code)) return { ok: false, message: MIGRATION_HINT };
  const row = {
    user_id: id,
    email_enabled: patch.email ?? existing?.email_enabled ?? true,
    sms_enabled: patch.sms ?? existing?.sms_enabled ?? false,
    push_enabled: patch.push ?? existing?.push_enabled ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("notification_preferences").upsert(row, { onConflict: "user_id" });
  if (error) return { ok: false, message: isMissingTable(error.code) ? MIGRATION_HINT : "We couldn't save your notification settings." };
  return { ok: true };
}

// --- Push subscriptions ----------------------------------------------------

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, message: "Please sign in again." };
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, message: "That browser didn't return a valid push subscription." };
  const admin = getServiceRoleClient();
  // An endpoint belongs to one browser; if someone else used this browser
  // before, move it to the current user.
  await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await admin.from("push_subscriptions").insert({ user_id: id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 300) });
  if (error) return { ok: false, message: isMissingTable(error.code) ? MIGRATION_HINT : "We couldn't turn on push notifications." };
  return updateMyNotificationPreferences({ push: true });
}

export async function removePushSubscription(endpoint: string | null): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  if (endpoint) await admin.from("push_subscriptions").delete().eq("user_id", id).eq("endpoint", endpoint);
  // Push stays on only if another device of theirs still has it.
  const { count } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", id);
  return updateMyNotificationPreferences({ push: (count ?? 0) > 0 });
}

// --- Test + event notifications -------------------------------------------

export async function sendTestNotification(channel: "email" | "push"): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, message: "Please sign in again." };
  const result = await notifyUser(
    id,
    {
      category: "test",
      title: "Test notification from Ensena",
      body: "Notifications are working. This is how booking confirmations, homework and lesson reminders will reach you.",
      url: "/student-dashboard/settings?tab=Notifications",
      ctaLabel: "Open settings",
    },
    { force: channel }
  );
  if (channel === "email") {
    if (result.email === "sent") return { ok: true, message: "Test email sent — check your inbox." };
    return { ok: false, message: result.email === "unavailable" ? "Email isn't set up on the server (Resend)." : "The test email couldn't be sent." };
  }
  if (typeof result.push === "number" && result.push > 0) return { ok: true, message: "Test push sent." };
  return { ok: false, message: "No device is registered for push yet — turn Push Notifications on first." };
}

// Called right after the signed-in student books a lesson or group class.
// Always sends to the signed-in user (never an arbitrary address).
export async function notifyMyBookingConfirmed(input: { tutorName: string; subject: string; date: string; time: string; reference?: string; url?: string }): Promise<void> {
  const id = await currentUserId();
  if (!id) return;
  await notifyUser(id, {
    category: "booking",
    title: `Booking confirmed: ${input.subject} with ${input.tutorName}`,
    body: `Your ${input.subject} session with ${input.tutorName} is booked for ${input.date} at ${input.time}.`,
    details: input.reference ? [`Booking reference: ${input.reference}`] : [],
    url: input.url ?? "/student-dashboard/lessons",
    ctaLabel: "View my classes",
  });
}
