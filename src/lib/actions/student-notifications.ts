"use server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadStudentNotifications, type StudentNotificationRow } from "@/lib/student-notifications-server";

// The signed-in user's own notifications only — the session decides whose
// rows are read or updated, never an id passed from the browser.
async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function fetchMyNotifications(): Promise<StudentNotificationRow[]> {
  const id = await currentUserId();
  return id ? loadStudentNotifications(id) : [];
}

export async function markMyNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  const id = await currentUserId();
  if (!id) return { ok: false };
  const { error } = await getServiceRoleClient().from("notifications").update({ unread: false }).eq("id", notificationId).eq("user_id", id);
  return { ok: !error };
}

export async function markAllMyNotificationsRead(): Promise<{ ok: boolean }> {
  const id = await currentUserId();
  if (!id) return { ok: false };
  const { error } = await getServiceRoleClient().from("notifications").update({ unread: false }).eq("user_id", id).eq("unread", true);
  return { ok: !error };
}
