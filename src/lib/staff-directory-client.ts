// Real Platform Users / invitations, fetched from Supabase — the backend
// counterpart of admin-platform-users-store.ts's localStorage version, kept
// in the exact same PlatformUserAccount/PlatformInvitation shapes
// (admin-platform-users-data.ts) so admin-platform-users-tab.tsx and
// admin-platform-user-profile-client.tsx barely had to change. Several
// small queries rather than one PostgREST embed, merged here in JS — plain
// and easy to follow over relying on embed/alias syntax under RLS.
import type { AdminRole } from "@/lib/admin-permissions-data";
import type { InvitationStatus, PlatformInvitation, PlatformUserAccount } from "@/lib/admin-platform-users-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function fetchPlatformUsersAndInvitations(): Promise<{ users: PlatformUserAccount[]; invitations: PlatformInvitation[] }> {
  const supabase = getSupabaseBrowserClient();

  const [{ data: assignments }, { data: roles }, { data: invites }] = await Promise.all([
    supabase.from("user_staff_roles").select("user_id, role_id, custom_permissions, status, created_at, assigned_by"),
    supabase.from("staff_roles").select("id, name"),
    supabase.from("staff_invitations").select("id, name, email, role_id, custom_permissions, invited_by, invited_at, expires_at, status, user_id"),
  ]);

  const roleNameById = new Map((roles ?? []).map((r) => [r.id as string, r.name as AdminRole]));

  const userIds = Array.from(new Set([...(assignments ?? []).map((a) => a.user_id as string), ...(invites ?? []).map((i) => i.invited_by).filter(Boolean) as string[]]));
  const { data: profiles } = userIds.length > 0 ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds) : { data: [] as never[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  // An accepted invitation for a given user_id carries the invitedBy/invitedAt
  // this account doesn't otherwise store once merged into user_staff_roles.
  const acceptedInviteByUserId = new Map((invites ?? []).filter((i) => i.status === "accepted" && i.user_id).map((i) => [i.user_id as string, i]));

  const users: PlatformUserAccount[] = (assignments ?? []).map((a) => {
    const profile = profileById.get(a.user_id as string);
    const originInvite = acceptedInviteByUserId.get(a.user_id as string);
    const invitedByProfile = originInvite?.invited_by ? profileById.get(originInvite.invited_by as string) : undefined;
    return {
      id: a.user_id as string,
      name: profile?.full_name ?? "Unknown",
      email: profile?.email ?? "",
      password: "",
      image: profile?.avatar_url || "/teacher-2.jpg.png",
      role: roleNameById.get(a.role_id as string) ?? "Custom",
      customSections: Array.isArray(a.custom_permissions) && a.custom_permissions.length > 0 ? (a.custom_permissions as string[]) : undefined,
      status: a.status === "suspended" ? "Suspended" : "Active",
      invitedBy: invitedByProfile?.full_name ?? "—",
      invitedAtLabel: formatDate(originInvite?.invited_at as string | undefined),
      joinedAtLabel: formatDate(a.created_at as string),
      lastActiveLabel: "—",
    };
  });

  const invitations: PlatformInvitation[] = (invites ?? [])
    .filter((i) => i.status !== "accepted")
    .map((i) => {
      const invitedByProfile = i.invited_by ? profileById.get(i.invited_by as string) : undefined;
      return {
        id: i.id as string,
        token: i.id as string,
        name: (i.name as string) || i.email as string,
        email: i.email as string,
        role: roleNameById.get(i.role_id as string) ?? "Custom",
        customSections: Array.isArray(i.custom_permissions) && i.custom_permissions.length > 0 ? (i.custom_permissions as string[]) : undefined,
        invitedBy: invitedByProfile?.full_name ?? "—",
        invitedAtMs: i.invited_at ? new Date(i.invited_at as string).getTime() : Date.now(),
        expiresAtMs: i.expires_at ? new Date(i.expires_at as string).getTime() : Date.now(),
        status: (i.status === "revoked" ? "Revoked" : "Pending") as InvitationStatus,
      };
    });

  return { users, invitations };
}
