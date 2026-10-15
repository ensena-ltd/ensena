"use server";

import { rememberSignupDevice } from "@/lib/account-settings";
import { requestPasswordReset } from "@/lib/actions/auth";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

export interface DeviceReviewResult {
  ok: boolean;
  message: string;
}

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/** Called by the sign-up pages right after an account is created. */
export async function rememberThisSignupDevice(userId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return;
  await rememberSignupDevice(userId);
}

async function pendingDevice(token: string) {
  if (!TOKEN.test(token)) return null;
  const { data } = await getServiceRoleClient().from("known_devices").select("id, user_id, status").eq("review_token", token).maybeSingle();
  return data && data.status === "pending" ? data : null;
}

// "Yes, it was me" from the login-alert email: the device becomes trusted.
export async function confirmSignInDevice(token: string): Promise<DeviceReviewResult> {
  const device = await pendingDevice(token);
  if (!device) return { ok: false, message: "This link has already been used or has expired." };
  const { error } = await getServiceRoleClient()
    .from("known_devices")
    .update({ status: "trusted", review_token: null, reviewed_at: new Date().toISOString() })
    .eq("id", device.id)
    .eq("status", "pending");
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };
  return { ok: true, message: "Thanks for confirming. We'll remember this device." };
}

// "No, secure my account": signs the account out on every device and emails a
// password reset link. The device stays flagged, so signing in from it again
// sends a new alert.
export async function denySignInDevice(token: string): Promise<DeviceReviewResult> {
  const device = await pendingDevice(token);
  if (!device) return { ok: false, message: "This link has already been used or has expired." };
  const admin = getServiceRoleClient();
  const { error } = await admin
    .from("known_devices")
    .update({ status: "denied", review_token: null, reviewed_at: new Date().toISOString() })
    .eq("id", device.id)
    .eq("status", "pending");
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };

  const [{ error: revokeError }, { data: person }] = await Promise.all([
    admin.rpc("revoke_all_sessions", { p_user_id: device.user_id }),
    admin.from("profiles").select("email").eq("id", device.user_id).maybeSingle(),
  ]);
  if (revokeError) console.error("[denySignInDevice] revoke failed", revokeError);
  const reset = person?.email ? await requestPasswordReset(person.email as string) : { status: "error" as const };
  return {
    ok: true,
    message:
      reset.status === "ok"
        ? "We've signed your account out on every device and emailed you a link to set a new password. Please do it now."
        : "We've signed your account out on every device. Please reset your password from the sign-in page straight away.",
  };
}
