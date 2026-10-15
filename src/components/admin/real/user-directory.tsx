"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Mail, Search } from "lucide-react";

import { formatDate, PersonAvatar } from "@/components/admin/real/admin-ui";
import { AccountStatusBadge, accountStatusLabels, ContactUserModal, downloadCsv, RoleBadge, roleLabels } from "@/components/admin/real/people-ui";
import type { AccountStatus, DirectoryRow } from "@/lib/admin-people-bookings";
import { tutorStatusLabels } from "@/lib/tutor-application";
import { cn } from "@/lib/utils";

type Tab = "all" | "student" | "tutor" | "guardian";
const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All users" },
  { key: "student", label: "Students" },
  { key: "tutor", label: "Tutors" },
  { key: "guardian", label: "Parents" },
];
const DAY = 86_400_000;
const joinedFilters = {
  any: { label: "Any time", days: Infinity },
  "7": { label: "Last 7 days", days: 7 },
  "30": { label: "Last 30 days", days: 30 },
  "365": { label: "Last 12 months", days: 365 },
} as const;

// Admin → User Directory: find and contact students, tutors and parents.
export function UserDirectory({ users, nowMs }: { users: DirectoryRow[]; nowMs: number }) {
  const people = useMemo(() => users.filter((u) => u.role === "student" || u.role === "tutor" || u.role === "guardian"), [users]);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [joined, setJoined] = useState<keyof typeof joinedFilters>("any");
  const [contact, setContact] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const maxAge = joinedFilters[joined].days * DAY;
    return people.filter(
      (u) =>
        (tab === "all" || u.role === tab) &&
        (status === "all" || u.status === status) &&
        nowMs - new Date(u.createdAt).getTime() <= maxAge &&
        (!q || [u.fullName, u.email, u.phone].some((v) => v.toLowerCase().includes(q)))
    );
  }, [people, tab, status, joined, query, nowMs]);

  function exportCsv() {
    downloadCsv(
      [["Name", "Type", "Email", "Phone", "Status", "Joined"], ...filtered.map((u) => [u.fullName, roleLabels[u.role], u.email, u.phone, accountStatusLabels[u.status], u.createdAt.slice(0, 10)])],
      "ensena-user-directory.csv"
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">User Directory</h1>
          <p className="mt-1 text-sm text-ensena-muted">Find and contact students, tutors and parents.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone…" className="h-10 w-full rounded-full border border-ensena-border bg-ensena-surface pl-9 pr-4 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
          <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Download className="size-4" /> Export
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium", tab === t.key ? "bg-ensena-surface text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
                {t.label} ({t.key === "all" ? people.length : people.filter((u) => u.role === t.key).length})
              </button>
            ))}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm">
            <option value="all">All statuses</option>
            {(Object.keys(accountStatusLabels) as AccountStatus[]).map((s) => <option key={s} value={s}>{accountStatusLabels[s]}</option>)}
          </select>
          <select value={joined} onChange={(e) => setJoined(e.target.value as keyof typeof joinedFilters)} className="h-10 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm">
            {Object.entries(joinedFilters).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <PersonAvatar name={u.fullName} url={u.avatarUrl} size={28} />
                      <span className="font-medium text-ensena-ink">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col items-start gap-1">
                      <RoleBadge role={u.role} />
                      {u.tutorStatus && u.tutorStatus !== "approved" && <span className="text-[11px] text-ensena-muted">{tutorStatusLabels[u.tutorStatus]}</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">
                    <a href={`mailto:${u.email}`} className="hover:text-ensena-primary">{u.email}</a>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">{u.phone ? <a href={`tel:${u.phone}`} className="hover:text-ensena-primary">{u.phone}</a> : "—"}</td>
                  <td className="py-3 pr-4"><AccountStatusBadge status={u.status} /></td>
                  <td className="py-3 pr-4 text-ensena-muted">{formatDate(u.createdAt)}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={() => setContact({ id: u.id, name: u.fullName })} className="inline-flex h-8 items-center gap-1 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        <Mail className="size-3.5" /> Contact
                      </button>
                      <Link href={`/admin/users/${u.id}`} className="inline-flex h-8 items-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-ensena-muted">No users match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ensena-muted">Showing {filtered.length} of {people.length} users</p>
      </div>

      <ContactUserModal target={contact} onClose={() => setContact(null)} />
    </div>
  );
}
