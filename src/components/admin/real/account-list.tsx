"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { formatDate, PersonAvatar } from "@/components/admin/real/admin-ui";
import type { AccountRole, AdminAccountRow } from "@/lib/admin-registrations";
import { cn } from "@/lib/utils";

const roleLabels: Record<AccountRole, string> = { student: "Student", tutor: "Tutor", guardian: "Parent / Guardian", admin: "Admin", counsellor: "Counsellor" };
const roleStyles: Record<AccountRole, string> = {
  student: "bg-blue-100 text-blue-700",
  tutor: "bg-violet-100 text-violet-700",
  guardian: "bg-pink-100 text-pink-700",
  admin: "bg-ensena-ink text-white",
  counsellor: "bg-teal-100 text-teal-700",
};

function detailHref(a: AdminAccountRow) {
  if (a.role === "student") return `/admin/students/${a.id}`;
  if (a.role === "tutor") return `/admin/tutors/${a.id}`;
  return null;
}

// Every registered account (all roles) with its core sign-up details.
export function AccountList({ accounts }: { accounts: AdminAccountRow[] }) {
  const [role, setRole] = useState<"all" | AccountRole>("all");
  const [query, setQuery] = useState("");
  const roles = (["student", "tutor", "guardian", "admin", "counsellor"] as AccountRole[]).filter((r) => accounts.some((a) => a.role === r));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => (role === "all" || a.role === role) && (!q || [a.fullName, a.email, a.phone].some((v) => v.toLowerCase().includes(q))));
  }, [accounts, role, query]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Users</h1>
      <p className="mt-1 text-sm text-ensena-muted">{accounts.length} registered account{accounts.length === 1 ? "" : "s"} across every role.</p>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-ensena-border p-4">
          {(["all", ...roles] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", role === r ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}>
              {r === "all" ? "All" : roleLabels[r]} ({r === "all" ? accounts.length : accounts.filter((a) => a.role === r).length})
            </button>
          ))}
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or phone" className="h-9 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 font-medium">Signed up with</th>
                <th className="px-4 py-2.5 font-medium">Email confirmed</th>
                <th className="px-4 py-2.5 font-medium">Registered</th>
                <th className="px-4 py-2.5 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const href = detailHref(a);
                const name = (
                  <span className="flex items-center gap-3">
                    <PersonAvatar name={a.fullName} url={a.avatarUrl} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ensena-ink">{a.fullName}</span>
                      <span className="block truncate text-xs text-ensena-muted">{a.email}</span>
                    </span>
                  </span>
                );
                return (
                  <tr key={a.id} className="border-b border-ensena-border last:border-b-0 hover:bg-ensena-bg-soft/60">
                    <td className="px-4 py-3">{href ? <Link href={href}>{name}</Link> : name}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", roleStyles[a.role])}>{roleLabels[a.role] ?? a.role}</span></td>
                    <td className="px-4 py-3 text-xs text-ensena-ink">{a.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ensena-ink">{a.signInMethods.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-xs">{a.emailConfirmed ? <span className="text-ensena-success">Yes</span> : <span className="text-amber-600">Not yet</span>}</td>
                    <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(a.lastSignInAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
