"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Writes behind the live tutor dashboard home page. Each one re-checks the
// signed-in user is a tutor and only ever touches that tutor's own rows.

export interface TutorDashboardActionResult {
  ok: boolean;
  message?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

async function currentTutorId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "tutor" ? user.id : null;
}

export async function markTutorNotificationsRead(): Promise<TutorDashboardActionResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return { ok: false, message: "Please sign in again." };
  const { error } = await getServiceRoleClient().from("notifications").update({ unread: false }).eq("user_id", tutorId).eq("unread", true);
  if (error) return { ok: false, message: "Couldn't update your notifications." };
  revalidatePath("/tutor-dashboard");
  return { ok: true };
}

export async function dismissTutorNotification(id: string): Promise<TutorDashboardActionResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return { ok: false, message: "Please sign in again." };
  if (!UUID.test(id)) return { ok: false, message: "That notification no longer exists." };
  const { error } = await getServiceRoleClient().from("notifications").update({ dismissed: true, unread: false }).eq("id", id).eq("user_id", tutorId);
  if (error) return { ok: false, message: "Couldn't dismiss that notification." };
  revalidatePath("/tutor-dashboard");
  return { ok: true };
}
