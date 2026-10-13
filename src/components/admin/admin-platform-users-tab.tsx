"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Plus, RotateCcw, ShieldOff, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAdminPlatformUsers } from "@/hooks/use-admin-platform-users";
import { useAdminSession } from "@/hooks/use-admin-session";
import { currentActorLabel } from "@/lib/admin-session";
import { allSections, invitableRoles, sectionAccessByRole, type AdminRole } from "@/lib/admin-permissions-data";
import {
  effectiveInvitationStatus,
  resendInvitation,
  revokeInvitation,
  sendInvitation,
} from "@/lib/admin-platform-users-store";
import { inviteStaffMember, resendStaffInvitation, revokeStaffInvitation } from "@/lib/actions/staff";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const supabaseConfigured = isSupabaseConfigured();

const invitationStatusStyles: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Revoked: "bg-ensena-bg-soft text-ensena-muted",
  Expired: "bg-rose-100 text-rose-700",
};

export function AdminPlatformUsersTab() {
  const { users, invitations, refresh } = useAdminPlatformUsers();
  const session = useAdminSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("Customer Support");
  const [sections, setSections] = useState<Set<string>>(new Set(sectionAccessByRole["Customer Support"]));
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const activeCount = users.filter((u) => u.status === "Active").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;
  const pendingCount = invitations.filter((i) => effectiveInvitationStatus(i) === "Pending").length;

  function openInvite() {
    setName(""); setEmail("");
    setRole("Customer Support");
    setSections(new Set(sectionAccessByRole["Customer Support"]));
    setInviteOpen(true);
  }

  function changeRole(next: AdminRole) {
    setRole(next);
    setSections(new Set(next === "Custom" ? ["Dashboard"] : (sectionAccessByRole[next] ?? ["Dashboard"])));
  }

  function toggleSection(key: string) {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function submitInvite() {
    if (!name.trim() || !email.trim()) return;

    if (!supabaseConfigured) {
      sendInvitation({ name: name.trim(), email: email.trim(), role, customSections: Array.from(sections), invitedBy: currentActorLabel() });
      setInviteOpen(false);
      flash(`Invitation sent to ${email.trim()}.`);
      return;
    }

    setSending(true);
    const result = await inviteStaffMember({ origin: window.location.origin, name: name.trim(), email: email.trim(), role, customSections: Array.from(sections) });
    setSending(false);
    if (result.status === "error") {
      flash(result.message ?? "Something went wrong sending the invitation.");
      return;
    }
    setInviteOpen(false);
    refresh();
    flash(`Invitation sent to ${email.trim()}.`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ensena-muted">Manage the people who help operate Ensena and control what they can access.</p>
        {session.role === "Super Admin" && (
          <Button onClick={openInvite} className="h-9 shrink-0 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
            <UserPlus className="size-3.5" /> Invite Platform User
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-ensena-border p-3.5">
          <p className="text-xs text-ensena-muted">Active</p>
          <p className="text-xl font-semibold text-ensena-ink">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-ensena-border p-3.5">
          <p className="text-xs text-ensena-muted">Pending Invitations</p>
          <p className="text-xl font-semibold text-ensena-ink">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-ensena-border p-3.5">
          <p className="text-xs text-ensena-muted">Suspended</p>
          <p className="text-xl font-semibold text-ensena-ink">{suspendedCount}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Access</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Last Active</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={u.image} alt={u.name} fill sizes="28px" className="object-cover" /></span>
                    <span className="font-medium text-ensena-ink">{u.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-ensena-muted">{u.email}</td>
                <td className="py-2.5 pr-4 text-ensena-muted">{u.role}</td>
                <td className="py-2.5 pr-4 text-xs text-ensena-muted">{(u.customSections ?? sectionAccessByRole[u.role as Exclude<AdminRole, "Custom">] ?? []).filter((s) => s !== "Dashboard").map((s) => allSections.find((a) => a.key === s)?.label ?? s).join(", ") || "Dashboard only"}</td>
                <td className="py-2.5 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{u.status}</span></td>
                <td className="py-2.5 pr-4 text-ensena-muted">{u.lastActiveLabel}</td>
                <td className="py-2.5 pr-4 text-right">
                  <Link href={`/admin/settings/platform-users/${u.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invitations.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading text-sm font-semibold text-ensena-ink">Invitations</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const status = effectiveInvitationStatus(inv);
                  return (
                    <tr key={inv.id} className="border-b border-ensena-border text-sm last:border-0">
                      <td className="py-2.5 pr-4 text-ensena-ink">{inv.name}</td>
                      <td className="py-2.5 pr-4 text-ensena-muted">{inv.email}</td>
                      <td className="py-2.5 pr-4 text-ensena-muted">{inv.role}</td>
                      <td className="py-2.5 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", invitationStatusStyles[status])}>{status}</span></td>
                      <td className="py-2.5 pr-4 text-right">
                        {(status === "Pending" || status === "Expired") && session.role === "Super Admin" && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!supabaseConfigured) {
                                  resendInvitation(inv.id, currentActorLabel());
                                } else {
                                  await resendStaffInvitation(inv.id);
                                  refresh();
                                }
                                flash(`Invitation resent to ${inv.email}.`);
                              }}
                              className="inline-flex h-8 items-center gap-1 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                            >
                              <RotateCcw className="size-3.5" /> Resend
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!supabaseConfigured) {
                                  revokeInvitation(inv.id, currentActorLabel());
                                } else {
                                  await revokeStaffInvitation(inv.id);
                                  refresh();
                                }
                                flash(`Invitation to ${inv.email} revoked.`);
                              }}
                              className="inline-flex h-8 items-center gap-1 rounded-full border border-ensena-border px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
                            >
                              <ShieldOff className="size-3.5" /> Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Platform User" widthClassName="max-w-lg">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Full Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Email Address</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Role</span>
            <select value={role} onChange={(e) => changeRole(e.target.value as AdminRole)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {invitableRoles.map((r) => <option key={r} value={r}>{r === "Custom" ? "Custom Access" : r}</option>)}
            </select>
          </label>

          <div>
            <p className="text-xs font-medium text-ensena-muted">Access</p>
            <p className="text-[11px] text-ensena-muted">Pre-filled from the role. Adjust before sending if needed.</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {allSections.filter((s) => s.key !== "Dashboard").map((s) => (
                <label key={s.key} className="flex items-center gap-1.5 text-xs text-ensena-ink">
                  <input type="checkbox" checked={sections.has(s.key)} onChange={() => toggleSection(s.key)} /> {s.label}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={submitInvite} loading={sending} disabled={!name.trim() || !email.trim()} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="size-4" /> Send Invitation
          </Button>
          <p className="flex items-center gap-1 text-center text-[11px] text-ensena-muted"><Mail className="size-3" /> An invitation email will be sent with a secure link, valid for 7 days.</p>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
