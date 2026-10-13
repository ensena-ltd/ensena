"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, KeyRound, RotateCcw, ShieldOff, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAdminAuditLog } from "@/hooks/use-admin-audit-log";
import { useAdminPlatformUsers } from "@/hooks/use-admin-platform-users";
import { useAdminSession } from "@/hooks/use-admin-session";
import { currentActorLabel } from "@/lib/admin-session";
import { allSections, invitableRoles, roleDescriptions, sectionAccessByRole, type AdminRole } from "@/lib/admin-permissions-data";
import { reactivateUser, suspendUser, updateUserAccess } from "@/lib/admin-platform-users-store";
import { setStaffMemberStatus, updateStaffAccess } from "@/lib/actions/staff";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { relativeTimeFromNow } from "@/lib/escrow-release";
import { cn } from "@/lib/utils";

const supabaseConfigured = isSupabaseConfigured();

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof UserCog; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function AdminPlatformUserProfileClient({ userId }: { userId: string }) {
  const { users, refresh } = useAdminPlatformUsers();
  const auditLog = useAdminAuditLog();
  const session = useAdminSession();
  const user = users.find((u) => u.id === userId);

  const [editOpen, setEditOpen] = useState(false);
  const [role, setRole] = useState<AdminRole>("Customer Support");
  const [sections, setSections] = useState<Set<string>>(new Set());
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (session.role !== "Super Admin") {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">Only Super Admin can manage Platform Users.</p>
        <Link href="/admin/dashboard" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This Platform User could not be found.</p>
        <Link href="/admin/settings?tab=Platform Users" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Platform Users</Link>
      </div>
    );
  }

  const current = user;
  const isSelfSuperAdmin = session.userId === "platform-super-admin" && session.role === "Super Admin" && current.id === "platform-super-admin";
  const canManage = session.role === "Super Admin" && !isSelfSuperAdmin;
  const roleInfo = roleDescriptions[current.role];
  const grantedSections = (current.customSections ?? sectionAccessByRole[current.role as Exclude<AdminRole, "Custom">] ?? []).map((k) => allSections.find((s) => s.key === k)?.label ?? k);
  const myActivity = auditLog.filter((a) => a.actor === current.name || a.actor.startsWith(`${current.name} (`)).slice(0, 8);

  function openEdit() {
    setRole(current.role);
    setSections(new Set(current.customSections ?? sectionAccessByRole[current.role as Exclude<AdminRole, "Custom">] ?? []));
    setEditOpen(true);
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

  async function saveAccess() {
    if (!supabaseConfigured) {
      updateUserAccess(current.id, currentActorLabel(), { role, customSections: Array.from(sections) });
    } else {
      await updateStaffAccess({ userId: current.id, role, customSections: Array.from(sections) });
      refresh();
    }
    setEditOpen(false);
    flash("Access updated.");
  }

  async function confirmSuspend() {
    if (!supabaseConfigured) {
      suspendUser(current.id, currentActorLabel());
    } else {
      await setStaffMemberStatus(current.id, "suspended");
      refresh();
    }
    setSuspendOpen(false);
    flash(`${current.name}'s access has been suspended.`);
  }

  async function reactivate() {
    if (!supabaseConfigured) {
      reactivateUser(current.id, currentActorLabel());
    } else {
      await setStaffMemberStatus(current.id, "active");
      refresh();
    }
    flash(`${current.name}'s access has been reactivated.`);
  }

  return (
    <div>
      <Link href="/admin/settings?tab=Platform Users" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Platform Users
      </Link>

      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={current.image} alt={current.name} fill sizes="56px" className="object-cover" /></span>
            <div>
              <h1 className="font-heading text-xl font-semibold text-ensena-ink">{current.name}</h1>
              <p className="text-sm text-ensena-muted">{current.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full bg-ensena-primary/10 px-2.5 py-0.5 text-xs font-semibold text-ensena-primary">{current.role}</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", current.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{current.status}</span>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openEdit} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold"><UserCog className="size-3.5" /> Edit Access</Button>
              {current.status === "Active" ? (
                <Button variant="outline" onClick={() => setSuspendOpen(true)} className="h-9 rounded-full border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100"><ShieldOff className="size-3.5" /> Suspend Access</Button>
              ) : (
                <Button onClick={reactivate} className="h-9 rounded-full bg-ensena-success px-4 text-xs font-semibold text-white hover:bg-ensena-success/90"><RotateCcw className="size-3.5" /> Reactivate Access</Button>
              )}
            </div>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><dt className="text-[11px] text-ensena-muted">Invited by</dt><dd className="text-sm font-medium text-ensena-ink">{current.invitedBy}</dd></div>
          <div><dt className="text-[11px] text-ensena-muted">Date invited</dt><dd className="text-sm font-medium text-ensena-ink">{current.invitedAtLabel}</dd></div>
          <div><dt className="text-[11px] text-ensena-muted">Date joined</dt><dd className="text-sm font-medium text-ensena-ink">{current.joinedAtLabel}</dd></div>
          <div><dt className="text-[11px] text-ensena-muted">Last active</dt><dd className="text-sm font-medium text-ensena-ink">{current.lastActiveLabel}</dd></div>
        </dl>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Permissions" icon={KeyRound}>
          <p className="mt-2 text-xs text-ensena-muted">{roleInfo.summary}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Access granted</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {grantedSections.length > 0 ? grantedSections.map((s) => (
              <span key={s} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{s}</span>
            )) : <span className="text-xs text-ensena-muted">Dashboard only</span>}
          </div>
        </Card>

        <Card title="Recent Activity">
          <ul className="mt-2 flex flex-col divide-y divide-ensena-border">
            {myActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ensena-ink">{a.action}</p>
                  <p className="truncate text-xs text-ensena-muted">{a.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-ensena-muted">{relativeTimeFromNow(a.atMs)}</span>
              </li>
            ))}
            {myActivity.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No recorded activity yet.</p>}
          </ul>
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Access: ${current.name}`} widthClassName="max-w-lg">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Role</span>
            <select value={role} onChange={(e) => changeRole(e.target.value as AdminRole)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {invitableRoles.map((r) => <option key={r} value={r}>{r === "Custom" ? "Custom Access" : r}</option>)}
            </select>
          </label>
          <div>
            <p className="text-xs font-medium text-ensena-muted">Access</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {allSections.filter((s) => s.key !== "Dashboard").map((s) => (
                <label key={s.key} className="flex items-center gap-1.5 text-xs text-ensena-ink">
                  <input type="checkbox" checked={sections.has(s.key)} onChange={() => toggleSection(s.key)} /> {s.label}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={saveAccess} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Save Access</Button>
        </div>
      </Modal>

      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title="Suspend Access?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Are you sure you want to suspend this user&apos;s access? They will no longer be able to sign into the Admin Dashboard. Their historical actions remain in the audit log.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSuspendOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmSuspend} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Suspend Access</Button>
          </div>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
