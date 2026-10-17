"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface WaitlistActionResult {
  ok: boolean;
  message?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLES = { student: "student_waitlist_signups", tutor: "tutor_circle_signups" } as const;

// The caller must be a signed-in admin whose Platform User access isn't
// suspended — checked here because the delete itself uses the service role.
async function currentAdmin(): Promise<{ id: string } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return null;
  const { data: staff } = await supabase.from("user_staff_roles").select("status").eq("user_id", user.id).maybeSingle();
  if (staff?.status === "suspended") return null;
  return { id: user.id };
}

export async function deleteWaitlistSignup(input: { source: keyof typeof TABLES; id: string }): Promise<WaitlistActionResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can delete waitlist sign-ups." };
  const table = TABLES[input.source];
  if (!table || !UUID.test(input.id)) return { ok: false, message: "That sign-up couldn't be found." };

  const db = getServiceRoleClient();
  const { data: deleted, error } = await db.from(table).delete().eq("id", input.id).select("email").maybeSingle();
  if (error) return { ok: false, message: "Couldn't delete this sign-up. Please try again." };
  if (!deleted) return { ok: false, message: "This sign-up was already deleted." };

  await db.from("audit_logs").insert({
    actor_id: admin.id,
    action: "waitlist_signup.deleted",
    entity_type: table,
    entity_id: input.id,
    metadata: { email: deleted.email },
  });
  revalidatePath("/admin/waitlist");
  return { ok: true };
}

// Deletes several sign-ups at once (the Waitlist page's "Delete selected").
// Returns how many rows were actually removed.
export async function deleteWaitlistSignups(items: { source: keyof typeof TABLES; id: string }[]): Promise<WaitlistActionResult & { deleted?: number }> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can delete waitlist sign-ups." };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, message: "Select at least one sign-up." };
  if (items.length > 1000) return { ok: false, message: "Delete at most 1,000 sign-ups at a time." };
  if (items.some((i) => !TABLES[i.source] || !UUID.test(i.id))) return { ok: false, message: "Some of those sign-ups couldn't be found." };

  const db = getServiceRoleClient();
  let deleted = 0;
  for (const source of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    const ids = items.filter((i) => i.source === source).map((i) => i.id);
    if (ids.length === 0) continue;
    const table = TABLES[source];
    const { data, error } = await db.from(table).delete().in("id", ids).select("id, email");
    if (error) return { ok: false, message: "Couldn't delete those sign-ups. Please try again.", deleted };
    const rows = (data ?? []) as { id: string; email: string }[];
    deleted += rows.length;
    if (rows.length > 0) {
      await db.from("audit_logs").insert({
        actor_id: admin.id,
        action: "waitlist_signup.bulk_deleted",
        entity_type: table,
        entity_id: rows.length === 1 ? rows[0].id : null,
        metadata: { count: rows.length, ids: rows.map((r) => r.id), emails: rows.map((r) => r.email) },
      });
    }
  }
  revalidatePath("/admin/waitlist");
  return { ok: true, deleted };
}
