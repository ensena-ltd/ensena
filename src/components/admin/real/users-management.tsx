"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download, MoreVertical, Search, ShieldAlert, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { formatDate, PersonAvatar } from "@/components/admin/real/admin-ui";
import { AccountStatusBadge, accountStatusLabels, ContactUserModal, downloadCsv, RestrictUserModal, RoleBadge, roleLabels, type RestrictionType } from "@/components/admin/real/people-ui";
import { liftRestriction } from "@/lib/actions/admin-people";
import type { AccountStatus, DirectoryRow } from "@/lib/admin-people-bookings";
import type { AccountRole } from "@/lib/admin-registrations";
import { cn } from "@/lib/utils";

const PER_PAGE = 15;
const DAY = 86_400_000;

// Admin → Users: every registered account with its live status, and the
// moderation actions (message, warn, restrict messaging, suspend, lift).
export function UsersManagement({ users, nowMs }: { users: DirectoryRow[]; nowMs: number }) {
  const [role, setRole] = useState<"all" | AccountRole>("all");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [contact, setContact] = useState<{ id: string; name: string } | null>(null);
  const [restrict, setRestrict] = useState<{ target: { id: string; name: string }; type: RestrictionType } | null>(null);
  const [pending, start] = useTransition();

  const roles = (["student", "tutor", "guardian", "counsellor", "admin"] as AccountRole[]).filter((r) => users.some((u) => u.role === r));
  const restrictedCount = users.filter((u) => u.status === "suspended" || u.status === "messaging_restricted").length;
  const newCount = users.filter((u) => nowMs - new Date(u.createdAt).getTime() < 30 * DAY).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) => (role === "all" || u.role === role) && (status === "all" || u.status === status) && (!q || [u.fullName, u.email, u.phone].some((v) => v.toLowerCase().includes(q)))
    );
  }, [users, role, status, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  function exportCsv() {
    downloadCsv(
      [
        ["Name", "Email", "Phone", "Role", "Status", "Signed up with", "Email confirmed", "Registered", "Last sign-in", "Bookings"],
        ...filtered.map((u) => [u.fullName, u.email, u.phone, roleLabels[u.role] ?? u.role, accountStatusLabels[u.status], u.signInMethods.join(" / "), u.emailConfirmed ? "Yes" : "No", u.createdAt.slice(0, 10), u.lastSignInAt?.slice(0, 10) ?? "", u.bookingCount]),
      ],
      "ensena-users.csv"
    );
  }

  function lift(u: DirectoryRow) {
    if (!u.currentRestriction) return;
    start(async () => {
      const res = await liftRestriction({ restrictionId: u.currentRestriction!.id, userId: u.id, reason: "Lifted from the Users list", notify: true });
      if (res.ok) toast.success(res.message ?? "Restriction lifted.");
      else toast.error(res.message ?? "Something went wrong.");
    });
  }

  const cards = [
    { label: "Total accounts", value: users.length, icon: Users, tint: "bg-ensena-primary/10 text-ensena-primary", onClick: () => { setRole("all"); setStatus("all"); } },
    { label: "Students", value: users.filter((u) => u.role === "student").length, icon: UserCheck, tint: "bg-blue-100 text-blue-600", onClick: () => { setRole("student"); setStatus("all"); } },
    { label: "Tutors", value: users.filter((u) => u.role === "tutor").length, icon: UserCheck, tint: "bg-violet-100 text-violet-600", onClick: () => { setRole("tutor"); setStatus("all"); } },
    { label: "Restricted / suspended", value: restrictedCount, icon: ShieldAlert, tint: "bg-rose-100 text-rose-600", onClick: () => { setRole("all"); setStatus("suspended"); } },
    { label: "New in last 30 days", value: newCount, icon: UserPlus, tint: "bg-emerald-100 text-emerald-600", onClick: () => { setRole("all"); setStatus("all"); } },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Users</h1>
          <p className="mt-1 text-sm text-ensena-muted">Every registered account, its status, and moderation actions.</p>
        </div>
        <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={() => { c.onClick(); setPage(1); }} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4 text-left hover:border-ensena-primary/40">
            <span className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}><c.icon className="size-4" /></span>
            <p className="mt-3 text-xl font-semibold text-ensena-ink">{c.value.toLocaleString()}</p>
            <p className="text-xs text-ensena-muted">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-ensena-border p-4">
          {(["all", ...roles] as const).map((r) => (
            <button key={r} type="button" onClick={() => { setRole(r); setPage(1); }} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", role === r ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}>
              {r === "all" ? "All" : roleLabels[r]} ({r === "all" ? users.length : users.filter((u) => u.role === r).length})
            </button>
          ))}
          <select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-xs">
            <option value="all">All statuses</option>
            {(Object.keys(accountStatusLabels) as AccountStatus[]).map((s) => <option key={s} value={s}>{accountStatusLabels[s]}</option>)}
          </select>
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, email or phone" className="h-9 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Signed up with</th>
                <th className="px-4 py-2.5 font-medium">Email confirmed</th>
                <th className="px-4 py-2.5 font-medium">Registered</th>
                <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id} className="border-b border-ensena-border last:border-b-0 hover:bg-ensena-bg-soft/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <PersonAvatar name={u.fullName} url={u.avatarUrl} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ensena-ink">{u.fullName}</span>
                        <span className="block truncate text-xs text-ensena-muted">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><AccountStatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-xs text-ensena-ink">{u.signInMethods.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs">{u.emailConfirmed ? <span className="text-ensena-success">Yes</span> : <span className="text-amber-600">Not yet</span>}</td>
                  <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(u.lastSignInAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/users/${u.id}`} className="flex h-8 items-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View</Link>
                      <div className="relative">
                        <button type="button" aria-label="More actions" onClick={() => setMenuId((cur) => (cur === u.id ? null : u.id))} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                          <MoreVertical className="size-4" />
                        </button>
                        {menuId === u.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                              {[
                                { label: "Send message", onClick: () => setContact({ id: u.id, name: u.fullName }) },
                                ...(u.role !== "admin"
                                  ? [
                                      { label: "Send warning", onClick: () => setRestrict({ target: { id: u.id, name: u.fullName }, type: "Warning" }) },
                                      { label: "Restrict messaging", onClick: () => setRestrict({ target: { id: u.id, name: u.fullName }, type: "MessagingRestriction" }), danger: true },
                                      { label: "Suspend account", onClick: () => setRestrict({ target: { id: u.id, name: u.fullName }, type: "Suspension" }), danger: true },
                                    ]
                                  : []),
                                ...(u.currentRestriction ? [{ label: "Lift restriction", onClick: () => lift(u), success: true }] : []),
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  disabled={pending}
                                  onClick={() => { item.onClick(); setMenuId(null); }}
                                  className={cn("block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-ensena-bg-soft", "danger" in item && item.danger ? "text-rose-600" : "success" in item && item.success ? "text-ensena-success" : "text-ensena-ink")}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ensena-muted">No accounts match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PER_PAGE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border p-4">
            <p className="text-xs text-ensena-muted">Showing {(current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-2">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="h-8 rounded-full border border-ensena-border px-3 text-xs disabled:opacity-40">Previous</button>
              <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)} className="h-8 rounded-full border border-ensena-border px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ContactUserModal target={contact} onClose={() => setContact(null)} />
      <RestrictUserModal target={restrict?.target ?? null} type={restrict?.type ?? "Warning"} onClose={() => setRestrict(null)} />
    </div>
  );
}
