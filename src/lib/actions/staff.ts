"use server";

import { getSupabaseServerClient as getSupabaseServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin-permissions-data";

export interface StaffActionState {
  status: "idle" | "error";
  message?: string;
}

// Every mutation here is a Platform User / staff-invite operation, so every
// one starts the same way: confirm the caller is a real, signed-in admin
// via the request-scoped (RLS-respecting) client, before ever touching the
// service-role client. staff_invitations/user_staff_roles RLS also enforces
// is_admin() server-side, but auth.admin.* bypasses RLS entirely (it's the
// service role), so this app-level check is the only thing standing between
// an arbitrary signed-in user and inviteUserByEmail/deleteUser.
async function requireCallerIsAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const };
  return { ok: true as const, supabase, userId: user.id };
}

export interface InviteStaffMemberInput {
  origin: string;
  name: string;
  email: string;
  role: AdminRole;
  // The coarse, nav-level section overrides admin-platform-users-tab.tsx's
  // invite modal collects (see admin-session.ts's sectionsFor) — stored as
  // the raw string array in staff_invitations.custom_permissions (jsonb),
  // the one flexible column this table has for per-invite overrides.
  customSections?: string[];
}

export async function inviteStaffMember(input: InviteStaffMemberInput): Promise<StaffActionState> {
  const caller = await requireCallerIsAdmin();
  if (!caller.ok) return { status: "error", message: "Not authorized." };

  const email = input.email.trim();
  if (!email || !input.name.trim()) return { status: "error", message: "Please fill in all fields." };

  const { data: roleRow } = await caller.supabase.from("staff_roles").select("id").eq("name", input.role).single();
  if (!roleRow) return { status: "error", message: "Unknown role." };

  // profiles.role is the coarse gate requireRole() checks — "counsellor"
  // gets its own dashboard, every other Platform User role is "admin" with
  // the fine-grained restriction handled client-side (see admin-session.ts).
  const profileRole = input.role === "Counsellor" ? "counsellor" : "admin";

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: invited, error: inviteError } = await serviceRole.auth.admin.inviteUserByEmail(email, {
    data: { role: profileRole, full_name: input.name, staff_role_id: roleRow.id },
    redirectTo: `${input.origin}/auth/callback?next=${encodeURIComponent("/accept-invitation")}`,
  });

  if (inviteError || !invited.user) {
    const alreadyExists = inviteError?.message.toLowerCase().includes("already been registered") || inviteError?.message.toLowerCase().includes("already registered");
    return { status: "error", message: alreadyExists ? "This email is already registered on Ensena." : "Something went wrong sending the invitation. Please try again." };
  }

  const { error: insertError } = await caller.supabase.from("staff_invitations").insert({
    email,
    name: input.name.trim(),
    role_id: roleRow.id,
    custom_permissions: input.customSections ?? [],
    invited_by: caller.userId,
    user_id: invited.user.id,
    status: "pending",
  });

  if (insertError) {
    return { status: "error", message: "Invitation email was sent, but saving the invitation record failed. Please refresh." };
  }

  return { status: "idle" };
}

export async function resendStaffInvitation(invitationId: string): Promise<StaffActionState> {
  const caller = await requireCallerIsAdmin();
  if (!caller.ok) return { status: "error", message: "Not authorized." };

  const { data: invitation } = await caller.supabase.from("staff_invitations").select("email").eq("id", invitationId).single();
  if (!invitation) return { status: "error", message: "Invitation not found." };

  const serviceRole = getSupabaseServiceRoleClient();
  await serviceRole.auth.resend({ type: "signup", email: invitation.email });
  await caller.supabase.from("staff_invitations").update({ invited_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: "pending" }).eq("id", invitationId);

  return { status: "idle" };
}

export async function revokeStaffInvitation(invitationId: string): Promise<StaffActionState> {
  const caller = await requireCallerIsAdmin();
  if (!caller.ok) return { status: "error", message: "Not authorized." };

  const { data: invitation } = await caller.supabase.from("staff_invitations").select("user_id, status").eq("id", invitationId).single();
  if (!invitation) return { status: "error", message: "Invitation not found." };

  // Only ever delete the auth user if they never accepted — revoking an
  // already-accepted Platform User's access is a suspend, not a delete.
  if (invitation.status === "pending" && invitation.user_id) {
    await getSupabaseServiceRoleClient().auth.admin.deleteUser(invitation.user_id);
  }
  await caller.supabase.from("staff_invitations").update({ status: "revoked" }).eq("id", invitationId);

  return { status: "idle" };
}

export async function acceptStaffInvitation(name: string): Promise<StaffActionState> {
  // Identity comes from the request-scoped client (real cookie session, so
  // this can only ever be the person who clicked their own invite email).
  // Everything after that runs on the service-role client instead of RLS:
  // a "Counsellor" staff invite resolves to profiles.role = "counsellor"
  // (see inviteStaffMember), which is deliberately outside is_admin() —
  // exactly the account that needs to read/accept its own pending
  // staff_invitations row here, so RLS can't be the gate for this one step.
  const requestScoped = await getSupabaseServerClient();
  const {
    data: { user },
  } = await requestScoped.auth.getUser();
  if (!user?.email) return { status: "error", message: "This invitation link isn't valid." };

  const supabase = getSupabaseServiceRoleClient();
  const { data: invitation } = await supabase
    .from("staff_invitations")
    .select("id, role_id, custom_permissions, invited_by")
    .eq("email", user.email)
    .eq("status", "pending")
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return { status: "error", message: "This invitation has already been used or could not be found." };

  const { error: roleError } = await supabase.from("user_staff_roles").insert({
    user_id: user.id,
    role_id: invitation.role_id,
    custom_permissions: invitation.custom_permissions,
    assigned_by: invitation.invited_by,
  });
  if (roleError) return { status: "error", message: "Something went wrong activating your account. Please try again." };

  await supabase.from("staff_invitations").update({ status: "accepted" }).eq("id", invitation.id);
  if (name.trim()) {
    await requestScoped.auth.updateUser({ data: { full_name: name.trim() } });
    await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
  }

  return { status: "idle" };
}

export interface UpdateStaffAccessInput {
  userId: string;
  role: AdminRole;
  customSections?: string[];
}

export async function updateStaffAccess(input: UpdateStaffAccessInput): Promise<StaffActionState> {
  const caller = await requireCallerIsAdmin();
  if (!caller.ok) return { status: "error", message: "Not authorized." };

  const { data: roleRow } = await caller.supabase.from("staff_roles").select("id").eq("name", input.role).single();
  if (!roleRow) return { status: "error", message: "Unknown role." };

  const { error } = await caller.supabase
    .from("user_staff_roles")
    .update({ role_id: roleRow.id, custom_permissions: input.customSections ?? [] })
    .eq("user_id", input.userId);

  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  // Switching a staff role in or out of "Counsellor" changes which real
  // dashboard requireRole() sends this person to — keep profiles.role in
  // sync rather than leaving them on their old one.
  await caller.supabase.from("profiles").update({ role: input.role === "Counsellor" ? "counsellor" : "admin" }).eq("id", input.userId);

  return { status: "idle" };
}

export async function setStaffMemberStatus(userId: string, status: "active" | "suspended"): Promise<StaffActionState> {
  const caller = await requireCallerIsAdmin();
  if (!caller.ok) return { status: "error", message: "Not authorized." };

  const { error } = await caller.supabase.from("user_staff_roles").update({ status }).eq("user_id", userId);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };
  return { status: "idle" };
}
