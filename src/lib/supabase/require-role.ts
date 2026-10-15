import { redirect } from "next/navigation";
import { after } from "next/server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AdminRole } from "@/lib/admin-permissions-data";

import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/roles";

export { dashboardHrefByRole, type AppRole };

export interface AuthedProfile {
  id: string;
  role: AppRole;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

// Call at the top of each dashboard's (dashboard)/layout.tsx (which must
// become an async Server Component to do so). Returns null ONLY when
// Supabase isn't configured yet — callers should skip the check entirely in
// that case so the existing client-side demo/platform-user sign-in keeps
// the app usable during the migration (see src/lib/demo-auth.ts,
// src/lib/admin-platform-users-store.ts). Once configured, this is a REAL
// server-side check, done close to the page it protects rather than only in
// proxy.ts: no session -> sign-in; wrong role -> their own real dashboard,
// never a silently-rendered page meant for someone else.
// The signed-in user's own suspension currently in force, if any (RLS lets
// people read their own restrictions).
export async function activeSuspension(userId: string): Promise<{ reason: string; endAt: string | null } | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("account_restrictions")
    .select("reason, end_at")
    .eq("actor_id", userId)
    .eq("type", "Suspension")
    .in("status", ["active", "under_review"])
    .lte("start_at", new Date().toISOString())
    .or(`end_at.is.null,end_at.gt.${new Date().toISOString()}`)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { reason: data.reason, endAt: data.end_at } : null;
}

export async function requireRole(role: AppRole): Promise<AuthedProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(dashboardHrefByRole[role])}`);
  }

  // Two-factor: an account with a verified authenticator app must finish
  // the code step before any dashboard renders — this covers password and
  // Google sign-in alike, since both land on a dashboard next.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/sign-in/verify?redirectTo=${encodeURIComponent(dashboardHrefByRole[role])}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, avatar_url, last_seen_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/sign-in");
  }

  const profileRole = profile.role as AppRole;
  if (profileRole !== role) {
    redirect(dashboardHrefByRole[profileRole] ?? "/sign-in");
  }

  // An account suspended from Admin → Users can't use any dashboard until
  // the suspension ends or is lifted (warnings and messaging restrictions
  // are enforced where they apply, e.g. sending messages).
  if (profileRole !== "admin" && (await activeSuspension(profile.id))) {
    redirect("/account-suspended");
  }

  // "Last active" (shown on a tutor's public profile when they allow it),
  // refreshed at most every 5 minutes, after the response is sent.
  const lastSeenMs = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  if (Date.now() - lastSeenMs > 5 * 60_000) {
    after(async () => {
      await getServiceRoleClient().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
    });
  }

  return { id: profile.id, role: profileRole, fullName: profile.full_name, email: profile.email, avatarUrl: profile.avatar_url };
}

export interface ResolvedAdminSession {
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: AdminRole;
  customSections?: string[];
}

// The real-backend counterpart of admin-session.ts's client-side
// AdminSession — called once from the admin layout (after requireRole
// confirms "admin") to find out WHICH Platform User this actually is: no
// user_staff_roles row at all means the original owner-level account (Super
// Admin, matching the demo's defaultSuperAdminSession); a row means a real
// invited staff member with whatever role/section overrides were granted at
// invite time (see inviteStaffMember). Fed into <AdminSessionSync> to
// hydrate the existing client-side permission system with real data.
export async function resolveAdminSession(profile: AuthedProfile): Promise<ResolvedAdminSession> {
  const supabase = await getSupabaseServerClient();
  const { data: assignment } = await supabase
    .from("user_staff_roles")
    .select("role_id, custom_permissions")
    .eq("user_id", profile.id)
    .maybeSingle();

  const base = { userId: profile.id, name: profile.fullName, email: profile.email, image: profile.avatarUrl ?? undefined };

  if (!assignment) {
    return { ...base, role: "Super Admin" };
  }

  const { data: roleRow } = await supabase.from("staff_roles").select("name").eq("id", assignment.role_id).single();
  const role = (roleRow?.name as AdminRole) ?? "Custom";
  const customSections = Array.isArray(assignment.custom_permissions) && assignment.custom_permissions.length > 0 ? (assignment.custom_permissions as string[]) : undefined;

  return { ...base, role, customSections };
}
