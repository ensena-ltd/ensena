import { redirect } from "next/navigation";

import { getSupabaseServerClient as getSupabaseServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { allSections, type AdminRole } from "@/lib/admin-permissions-data";

import { AcceptStaffInvitationClient } from "./accept-staff-invitation-client";

// Reached via /auth/callback?next=/accept-invitation, right after a real
// Platform User invite email is clicked (see inviteStaffMember) — by then a
// live (passwordless) session already exists. Server Component so the
// invitation's details (role, granted sections, who invited them) can be
// looked up with the service-role client, sidestepping the RLS asymmetry
// between "admin" and "counsellor" staff invites (see acceptStaffInvitation's
// own comment) — this page only ever reads, never mutates.
export default async function AcceptInvitationPage() {
  const requestScoped = await getSupabaseServerClient();
  const {
    data: { user },
  } = await requestScoped.auth.getUser();

  if (!user?.email) redirect("/sign-in");

  const supabase = getSupabaseServiceRoleClient();
  const { data: invitation } = await supabase
    .from("staff_invitations")
    .select("id, invited_by, custom_permissions, status, staff_roles(name)")
    .eq("email", user.email)
    .eq("status", "pending")
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) {
    return <AcceptStaffInvitationClient invitation={null} />;
  }

  let invitedByName = "the Ensena team";
  if (invitation.invited_by) {
    const { data: inviter } = await supabase.from("profiles").select("full_name").eq("id", invitation.invited_by).maybeSingle();
    if (inviter?.full_name) invitedByName = inviter.full_name;
  }

  const role = ((invitation.staff_roles as unknown as { name: string } | null)?.name as AdminRole | undefined) ?? "Custom";
  const grantedSections = Array.isArray(invitation.custom_permissions)
    ? (invitation.custom_permissions as string[]).filter((s) => s !== "Dashboard").map((k) => allSections.find((s) => s.key === k)?.label ?? k)
    : [];

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <AcceptStaffInvitationClient
      invitation={{ invitedByName, role, grantedSections, email: user.email, name: profile?.full_name ?? "" }}
    />
  );
}
