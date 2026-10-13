"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Lock,
  MoreVertical,
  Plus,
  Search,
  UserCog,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/lib/toast-store";
import { banReasons, platformStats } from "@/lib/admin-data";
import { formatPlatformUserId, formatTutorId } from "@/lib/admin-user-profile-data";
import {
  platformUserStatusDot as statusDot,
  platformUserStatusLabel as statusLabel,
  platformUsers,
  type PlatformUser,
  type PlatformUserRole,
  type PlatformUserStatus,
} from "@/lib/admin-users-data";
import { teacherPhotos } from "@/lib/data";
import { cn } from "@/lib/utils";

type MainTab = "All Users" | "Students" | "Tutors" | "Restricted" | "Banned";

const mainTabs: MainTab[] = ["All Users", "Students", "Tutors", "Restricted", "Banned"];
const roleFilters: (PlatformUserRole | "All Types")[] = ["All Types", "Student", "Tutor", "Counsellor", "Admin"];
const statusFilters: (PlatformUserStatus | "All Statuses")[] = ["All Statuses", "Active", "Suspended", "Banned", "Pending Verification", "Deleted"];
const dateJoinedFilters = ["Any Time", "This Month", "This Year"] as const;

function matchesMainTab(u: PlatformUser, tab: MainTab): boolean {
  if (tab === "All Users") return true;
  if (tab === "Students") return u.role === "Student";
  if (tab === "Tutors") return u.role === "Tutor";
  if (tab === "Restricted") return u.status === "Suspended";
  if (tab === "Banned") return u.status === "Banned";
  return true;
}

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseJoined(joined: string): Date | null {
  const d = new Date(joined);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function AdminUsersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (mainTabs as string[]).includes(tabParam ?? "") ? (tabParam as MainTab) : "All Users";
  const roleParam = searchParams.get("role");
  const initialRole = (roleFilters as string[]).includes(roleParam ?? "") ? (roleParam as (typeof roleFilters)[number]) : "All Types";

  const [users, setUsers] = useState<PlatformUser[]>(platformUsers);
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>(initialRole);
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("All Statuses");
  const [stateFilter, setStateFilter] = useState("All States");
  const [dateJoinedFilter, setDateJoinedFilter] = useState<(typeof dateJoinedFilters)[number]>("Any Time");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [academicLevelFilter, setAcademicLevelFilter] = useState("All Levels");

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReasonDraft, setBanReasonDraft] = useState(banReasons[0]);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Student" as PlatformUserRole });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const states = ["All States", ...Array.from(new Set(users.map((u) => u.state)))];
  const academicLevels = ["All Levels", ...Array.from(new Set(users.map((u) => u.academicLevel).filter(Boolean)))] as string[];

  const filtered = users.filter((u) => {
    const matchesTabFilter = matchesMainTab(u, mainTab);
    const matchesRole = roleFilter === "All Types" || u.role === roleFilter;
    const matchesStatus = statusFilter === "All Statuses" || u.status === statusFilter;
    const matchesState = stateFilter === "All States" || u.state === stateFilter;
    const matchesLevel = academicLevelFilter === "All Levels" || u.academicLevel === academicLevelFilter;
    const joinedDate = parseJoined(u.joined);
    const now = new Date();
    const matchesDate =
      dateJoinedFilter === "Any Time" ||
      !joinedDate ||
      (dateJoinedFilter === "This Month" && joinedDate.getFullYear() === now.getFullYear() && joinedDate.getMonth() === now.getMonth()) ||
      (dateJoinedFilter === "This Year" && joinedDate.getFullYear() === now.getFullYear());
    const q = query.trim().toLowerCase();
    const displayId = u.role === "Tutor" ? formatTutorId(u.id.replace(/^usr-/, "")) : formatPlatformUserId(u);
    const matchesQuery =
      q === "" ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      displayId.toLowerCase().includes(q);
    return matchesTabFilter && matchesRole && matchesStatus && matchesState && matchesLevel && matchesDate && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  function changeMainTab(tab: MainTab) {
    setMainTab(tab);
    setPage(1);
  }

  const counts = {
    "All Users": users.length,
    Students: users.filter((u) => u.role === "Student").length,
    Tutors: users.filter((u) => u.role === "Tutor").length,
    Restricted: users.filter((u) => u.status === "Suspended").length,
    Banned: users.filter((u) => u.status === "Banned").length,
  };

  const summaryCards = [
    { key: "All Users" as MainTab, label: "Total Users", value: counts["All Users"], delta: `↑ ${platformStats.totalUsersDelta}% vs last month`, icon: Users2, tint: "bg-ensena-primary/10 text-ensena-primary", deltaTone: "text-emerald-600" },
    { key: "Students" as MainTab, label: "Students", value: counts.Students, delta: `↑ ${platformStats.totalStudentsDelta}% vs last month`, icon: GraduationCap, tint: "bg-purple-100 text-purple-600", deltaTone: "text-emerald-600" },
    { key: "Tutors" as MainTab, label: "Tutors", value: counts.Tutors, delta: `↑ ${platformStats.totalTutorsDelta}% vs last month`, icon: UserCog, tint: "bg-blue-100 text-blue-600", deltaTone: "text-emerald-600" },
    { key: "Restricted" as MainTab, label: "Restricted", value: counts.Restricted, delta: "↑ 5 vs last month", icon: Lock, tint: "bg-orange-100 text-orange-600", deltaTone: "text-orange-600" },
    { key: "Banned" as MainTab, label: "Banned", value: counts.Banned, delta: "↑ 2 vs last month", icon: Ban, tint: "bg-rose-100 text-rose-600", deltaTone: "text-rose-600" },
  ];

  const banTarget = users.find((u) => u.id === banTargetId) ?? null;

  function setStatus(id: string, status: PlatformUserStatus, reason?: Partial<Pick<PlatformUser, "restrictReason" | "banReason">>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status, ...reason } : u)));
  }

  // Real toast delivery now lives in the one shared Toaster mounted at the
  // root layout (see toast-store.ts) — kept as a local `flash` alias so
  // every existing call site in this file stays unchanged.
  const flash = showToast;

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    setChecked((prev) => (prev.size === pageItems.length ? new Set() : new Set(pageItems.map((u) => u.id))));
  }

  function bulkStatus(status: PlatformUserStatus, label: string) {
    setUsers((prev) => prev.map((u) => (checked.has(u.id) ? { ...u, status } : u)));
    flash(`${checked.size} user${checked.size === 1 ? "" : "s"} ${label}.`);
    setChecked(new Set());
  }

  function exportUsers(list: PlatformUser[], filename: string) {
    downloadCsv(
      [
        ["ID", "Name", "Email", "Phone", "Role", "Status", "Verified", "State", "Joined", "Last Active"],
        ...list.map((u) => [u.id, u.name, u.email, u.phone, u.role, statusLabel[u.status], u.verified ? "Yes" : "No", u.state, u.joined, u.lastLogin]),
      ],
      filename
    );
  }

  function deleteAccount() {
    if (!deletingId) return;
    setUsers((prev) => prev.map((u) => (u.id === deletingId ? { ...u, status: "Deleted" } : u)));
    setDeletingId(null);
    flash("Account deleted.");
  }

  function restrictUser(id: string) {
    setStatus(id, "Suspended", { restrictReason: "Policy violation" });
    flash("Account restricted.");
    setRowMenuId(null);
  }

  function removeRestriction(id: string) {
    setStatus(id, "Active", { restrictReason: undefined });
    flash("Restriction removed.");
    setRowMenuId(null);
  }

  function reactivate(id: string) {
    setStatus(id, "Active", { banReason: undefined });
    flash("Account reactivated.");
    setRowMenuId(null);
  }

  function openBanModal(id: string) {
    setBanTargetId(id);
    setBanReasonDraft(banReasons[0]);
    setRowMenuId(null);
  }

  function confirmBan() {
    if (!banTargetId) return;
    setStatus(banTargetId, "Banned", { banReason: banReasonDraft });
    flash("Account banned.");
    setBanTargetId(null);
  }

  function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    const id = `usr-new-${Date.now()}`;
    const record: PlatformUser = {
      id,
      username: newUser.email.split("@")[0],
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      phone: "+234 800 000 0000",
      image: teacherPhotos[users.length % teacherPhotos.length],
      role: newUser.role,
      status: "Active",
      verified: false,
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      dob: "—",
      country: "Nigeria",
      state: "Lagos",
      joined: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      lastLogin: "Never",
      lastDevice: "—",
      lastIp: "—",
      isOnline: false,
      totalBookings: 0,
      totalLessons: 0,
      totalPayments: 0,
      totalRefunds: 0,
      walletBalance: 0,
      escrowBalance: 0,
      pendingWithdrawal: 0,
      pendingPayments: 0,
      reviewsCount: 0,
      avgRating: 0,
      filesUploaded: 0,
      activity: [],
      loginHistory: [],
      adminNotes: [],
      aiSummary: "New account. No activity yet.",
    };
    setUsers((prev) => [record, ...prev]);
    flash(`${record.name} added.`);
    setAddUserOpen(false);
    setNewUser({ name: "", email: "", role: "Student" });
  }

  function rowAction(u: PlatformUser): { label: string; href: string } {
    if (u.status === "Pending Verification" && u.role === "Tutor") return { label: "Review", href: `/admin/verification/${u.id.replace(/^usr-/, "")}` };
    return { label: "View", href: `/admin/users/${u.id}` };
  }

  function rowMenuItems(u: PlatformUser): { label: string; onClick: () => void; tone?: "danger" | "success" }[] {
    const items: { label: string; onClick: () => void; tone?: "danger" | "success" }[] = [
      { label: "View Profile", onClick: () => router.push(`/admin/users/${u.id}`) },
    ];
    if (u.status === "Banned") {
      items.push({ label: "Unban / Reactivate", onClick: () => reactivate(u.id), tone: "success" });
    } else if (u.status === "Suspended") {
      items.push({ label: "Remove Restriction", onClick: () => removeRestriction(u.id), tone: "success" });
      items.push({ label: "Ban Account", onClick: () => openBanModal(u.id), tone: "danger" });
    } else {
      items.push({ label: "Restrict Account", onClick: () => restrictUser(u.id) });
      items.push({ label: "Ban Account", onClick: () => openBanModal(u.id), tone: "danger" });
    }
    return items;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Users</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage students, tutors and account access on Enseña.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => exportUsers(filtered, "ensena-users.csv")}
            className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Download className="size-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => setAddUserOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            <Plus className="size-4" /> Add User
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => changeMainTab(card.key)}
            className={cn(
              "rounded-2xl border bg-white p-4 text-left transition-colors hover:border-ensena-primary/40",
              mainTab === card.key ? "border-ensena-primary" : "border-ensena-border"
            )}
          >
            <div className={cn("flex size-10 items-center justify-center rounded-full", card.tint)}>
              <card.icon className="size-4.5" />
            </div>
            <p className="mt-3 text-xl font-semibold text-ensena-ink">{card.value.toLocaleString()}</p>
            <p className="text-xs text-ensena-muted">{card.label}</p>
            <p className={cn("mt-1 text-xs font-medium", card.deltaTone)}>{card.delta}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        {/* Main tabs */}
        <div className="flex flex-wrap gap-6 border-b border-ensena-border text-sm font-medium">
          {mainTabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeMainTab(t)}
              className={cn(
                "border-b-2 pb-2.5 pt-1 transition-colors",
                mainTab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by name, email or user ID…"
            className="h-11 w-full rounded-xl border border-ensena-border pl-11 pr-4 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as (typeof roleFilters)[number]); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {roleFilters.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select disabled className="h-9 rounded-full border border-ensena-border px-3 text-xs text-ensena-muted">
            <option>Nigeria</option>
          </select>
          <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as (typeof statusFilters)[number]); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {statusFilters.map((s) => <option key={s}>{s === "Suspended" ? "Restricted" : s}</option>)}
          </select>
          <select value={dateJoinedFilter} onChange={(e) => { setDateJoinedFilter(e.target.value as (typeof dateJoinedFilters)[number]); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {dateJoinedFilters.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button type="button" onClick={() => setShowMoreFilters((v) => !v)} className="h-9 rounded-full border border-dashed border-ensena-primary px-3 text-xs font-medium text-ensena-primary">
            {showMoreFilters ? "Fewer Filters" : "Filters"}
          </button>
        </div>

        {showMoreFilters && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={academicLevelFilter} onChange={(e) => setAcademicLevelFilter(e.target.value)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
              {academicLevels.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}

        {checked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-ensena-ink">{checked.size} selected</span>
            <button type="button" onClick={() => bulkStatus("Active", "verified/reinstated")} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-success hover:bg-ensena-success/10">Reinstate</button>
            <button type="button" onClick={() => bulkStatus("Suspended", "restricted")} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-orange-600 hover:bg-orange-50">Restrict</button>
            <button type="button" onClick={() => exportUsers(users.filter((u) => checked.has(u.id)), "ensena-users-selected.csv")} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Export Selected</button>
          </div>
        )}

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="w-8 py-2 pr-2">
                  <input type="checkbox" checked={checked.size === pageItems.length && pageItems.length > 0} onChange={toggleCheckAll} className="size-3.5 rounded border-ensena-border" />
                </th>
                <th className="py-2 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                {(mainTab === "Restricted" || mainTab === "Banned") ? (
                  <>
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium">{mainTab === "Restricted" ? "Restricted On" : "Banned On"}</th>
                  </>
                ) : (
                  <th className="py-2 pr-4 font-medium">Location</th>
                )}
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 pr-4 font-medium">Last Active</th>
                <th className="py-2 pr-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => {
                const action = rowAction(u);
                return (
                  <tr key={u.id} className="border-b border-ensena-border last:border-0">
                    <td className="py-3 pr-2">
                      <input type="checkbox" checked={checked.has(u.id)} onChange={() => toggleCheck(u.id)} className="size-3.5 rounded border-ensena-border" />
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                        <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
                          <Image src={u.image} alt={u.name} fill sizes="36px" className="object-cover" />
                          {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-ensena-success" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ensena-ink">{u.name}</p>
                          <p className="truncate text-xs text-ensena-muted">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ensena-muted">{u.role}</td>
                    {(mainTab === "Restricted" || mainTab === "Banned") ? (
                      <>
                        <td className="py-3 pr-4 text-ensena-muted">{(mainTab === "Restricted" ? u.restrictReason : u.banReason) ?? "Not specified"}</td>
                        <td className="py-3 pr-4 text-ensena-muted">{u.joined}</td>
                      </>
                    ) : (
                      <td className="py-3 pr-4 text-ensena-muted">🇳🇬 {u.state}, {u.country}</td>
                    )}
                    <td className="py-3 pr-4">
                      <span className="flex w-fit items-center gap-1.5 text-xs font-semibold text-ensena-ink">
                        <span className={cn("size-2 rounded-full", statusDot[u.status])} /> {statusLabel[u.status]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ensena-muted">{u.joined}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{u.lastLogin}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        {u.status === "Suspended" && mainTab === "Restricted" ? (
                          <button type="button" onClick={() => removeRestriction(u.id)} className="h-8 shrink-0 rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                            Restore Access
                          </button>
                        ) : u.status === "Banned" && mainTab === "Banned" ? (
                          <button type="button" onClick={() => reactivate(u.id)} className="h-8 shrink-0 rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                            Reactivate
                          </button>
                        ) : (
                          <Link
                            href={action.href}
                            className={cn(
                              "flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold",
                              action.label === "Review" ? "bg-ensena-primary text-white hover:bg-ensena-primary-hover" : "border border-ensena-primary text-ensena-primary hover:bg-ensena-primary/5"
                            )}
                          >
                            {action.label}
                          </Link>
                        )}
                        <div className="relative">
                          <button
                            type="button"
                            aria-label="More options"
                            onClick={() => setRowMenuId((cur) => (cur === u.id ? null : u.id))}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                          {rowMenuId === u.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setRowMenuId(null)} />
                              <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                                {rowMenuItems(u).map((item) => (
                                  <button
                                    key={item.label}
                                    type="button"
                                    onClick={item.onClick}
                                    className={cn(
                                      "block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-ensena-bg-soft",
                                      item.tone === "danger" ? "text-rose-600" : item.tone === "success" ? "text-ensena-success" : "text-ensena-ink"
                                    )}
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
                );
              })}
            </tbody>
          </table>
          {pageItems.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No users match this filter.</p>}
        </div>

        {/* Mobile cards */}
        <div className="mt-4 flex flex-col gap-3 lg:hidden">
          {pageItems.map((u) => {
            const action = rowAction(u);
            return (
              <div key={u.id} className="rounded-2xl border border-ensena-border p-4">
                <div className="flex items-start gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
                    <Image src={u.image} alt={u.name} fill sizes="44px" className="object-cover" />
                    {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-ensena-success" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{u.name}</p>
                    <p className="truncate text-xs text-ensena-muted">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ensena-muted">
                      <span>{u.role}</span>
                      <span>🇳🇬 {u.state}</span>
                      <span className="flex items-center gap-1 font-medium text-ensena-ink">
                        <span className={cn("size-1.5 rounded-full", statusDot[u.status])} /> {statusLabel[u.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ensena-muted">Joined {u.joined}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={action.href}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center rounded-full text-xs font-semibold",
                      action.label === "Review" ? "bg-ensena-primary text-white" : "border border-ensena-primary text-ensena-primary"
                    )}
                  >
                    {action.label}
                  </Link>
                  {u.status === "Suspended" && (
                    <button type="button" onClick={() => removeRestriction(u.id)} className="h-9 flex-1 rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink">
                      Restore Access
                    </button>
                  )}
                  {u.status === "Banned" && (
                    <button type="button" onClick={() => reactivate(u.id)} className="h-9 flex-1 rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink">
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {pageItems.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No users match this filter.</p>}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-4">
            <p className="text-xs text-ensena-muted">
              Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} users
            </p>
            <div className="flex items-center gap-2">
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="h-8 rounded-full border border-ensena-border px-2.5 text-xs">
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                <ChevronLeft className="size-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn("flex size-8 items-center justify-center rounded-full text-xs font-medium", n === currentPage ? "bg-ensena-primary text-white" : "text-ensena-ink hover:bg-ensena-bg-soft")}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ban confirmation — prevents accidental bans */}
      <Modal open={!!banTarget} onClose={() => setBanTargetId(null)} title="Ban this account?">
        {banTarget && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ensena-muted">
              This will prevent <span className="font-medium text-ensena-ink">{banTarget.name}</span> from accessing Enseña.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Reason</span>
              <select value={banReasonDraft} onChange={(e) => setBanReasonDraft(e.target.value)} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
                {banReasons.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <div className="mt-1 flex gap-2">
              <Button variant="outline" onClick={() => setBanTargetId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
              <Button onClick={confirmBan} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Ban Account</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Account">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This marks the account as deleted and revokes platform access. This action is logged in the audit trail.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={deleteAccount} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Delete Account</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add User">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Full name</span>
            <input value={newUser.name} onChange={(e) => setNewUser((v) => ({ ...v, name: e.target.value }))} placeholder="e.g. Amaka Chukwu" className="h-11 rounded-xl border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Email address</span>
            <input value={newUser.email} onChange={(e) => setNewUser((v) => ({ ...v, email: e.target.value }))} type="email" placeholder="name@example.com" className="h-11 rounded-xl border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">User type</span>
            <select value={newUser.role} onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value as PlatformUserRole }))} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {(["Student", "Tutor", "Counsellor", "Admin"] as PlatformUserRole[]).map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <Button onClick={addUser} className="mt-1 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">Add User</Button>
        </div>
      </Modal>

    </div>
  );
}
