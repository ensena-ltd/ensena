"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Ticket as TicketIcon,
  X,
} from "lucide-react";

import { supportPriorityStyles, supportStatusStyles } from "@/components/support/support-conversation";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useSupportRequests } from "@/hooks/use-support-requests";
import { downloadCsv } from "@/lib/csv";
import { relativeTimeFromNow } from "@/lib/escrow-release";
import type { SupportRequest, SupportSource, SupportUserRole } from "@/lib/support-data";
import { cn } from "@/lib/utils";
import type { SupportStatus } from "@/lib/support-data";

type StatusTab = "All" | SupportStatus | "Assigned to Me" | "My Requests";
const statusTabs: StatusTab[] = ["All", "Open", "In Progress", "Waiting for User", "Resolved", "Closed", "Assigned to Me", "My Requests"];

const SOURCE_STYLES: Record<SupportSource, { icon: typeof Mail; className: string }> = {
  Ticket: { icon: TicketIcon, className: "bg-blue-50 text-blue-600" },
  Email: { icon: Mail, className: "bg-rose-50 text-rose-600" },
  "Live Chat": { icon: MessageCircle, className: "bg-emerald-50 text-emerald-600" },
  Report: { icon: AlertTriangle, className: "bg-amber-50 text-amber-600" },
  Manual: { icon: Phone, className: "bg-purple-50 text-purple-600" },
};

const ROLE_OPTIONS: ("All" | SupportUserRole)[] = ["All", "Student", "Tutor", "Admin", "Guest"];
const SOURCE_OPTIONS: ("All" | SupportSource)[] = ["All", "Ticket", "Manual", "Email", "Live Chat", "Report"];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Case-insensitive so a link like /admin/support?tab=My Requests (from the
// admin Help Center's "Your Support Requests" card) always lands on the
// right tab — same reasoning as the tabParam pattern used elsewhere in the
// dashboards (e.g. my-profile-client.tsx).
function resolveTab(raw: string | null): StatusTab {
  if (!raw) return "All";
  const normalized = raw.trim().toLowerCase();
  const match = statusTabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "All";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-[11px] font-semibold text-ensena-primary", className)}>
      {initials(name)}
    </span>
  );
}

// `live` = every request from the database (Supabase configured); without
// it the inbox falls back to the browser demo store.
export function AdminSupportClient({ live }: { live?: SupportRequest[] } = {}) {
  const session = useAdminSession();
  const router = useRouter();
  const demo = useSupportRequests();
  const requests = live ?? demo;
  // New tickets show up without a manual reload.
  const isLive = Boolean(live);
  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [isLive, router]);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [statusFilter, setStatusFilter] = useState<StatusTab>(() => resolveTab(tabParam));
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setStatusFilter(resolveTab(tabParam));
  }
  const queryParam = searchParams.get("query");
  const [query, setQuery] = useState(() => queryParam ?? "");
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);
  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setQuery(queryParam ?? "");
  }
  const relatedRecordId = searchParams.get("relatedRecordId");
  const relatedRecordLabel = searchParams.get("relatedRecordLabel");
  const [relatedFilterActive, setRelatedFilterActive] = useState(!!relatedRecordId);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"All" | SupportUserRole>("All");
  const [sourceFilter, setSourceFilter] = useState<"All" | SupportSource>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const q = query.trim().toLowerCase();
  const activeFilterCount = (roleFilter !== "All" ? 1 : 0) + (sourceFilter !== "All" ? 1 : 0);

  const filtered = requests
    .filter((r) => !relatedFilterActive || !relatedRecordId || r.relatedRecordId === relatedRecordId)
    .filter((r) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "Assigned to Me") return r.assignedStaff === session.name;
      if (statusFilter === "My Requests") return r.userName === session.name;
      return r.status === statusFilter;
    })
    .filter((r) => roleFilter === "All" || r.userRole === roleFilter)
    .filter((r) => sourceFilter === "All" || r.source === sourceFilter)
    .filter((r) => !dateFrom || r.createdAtISO.slice(0, 10) >= dateFrom)
    .filter((r) => !dateTo || r.createdAtISO.slice(0, 10) <= dateTo)
    .filter(
      (r) =>
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false) ||
        r.subject.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q)
    )
    .sort((a, b) => (a.updatedAtISO < b.updatedAtISO ? 1 : -1));

  // Adjust the current page during render when filtering shrinks the result
  // set below it — same "derive state from a changed value" pattern used
  // throughout the dashboards instead of an effect.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const [prevTotalPages, setPrevTotalPages] = useState(totalPages);
  if (totalPages !== prevTotalPages) {
    setPrevTotalPages(totalPages);
    if (page > totalPages) setPage(totalPages);
  }
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts: Record<StatusTab, number> = {
    All: requests.length,
    Open: requests.filter((r) => r.status === "Open").length,
    "In Progress": requests.filter((r) => r.status === "In Progress").length,
    "Waiting for User": requests.filter((r) => r.status === "Waiting for User").length,
    Resolved: requests.filter((r) => r.status === "Resolved").length,
    Closed: requests.filter((r) => r.status === "Closed").length,
    "Assigned to Me": requests.filter((r) => r.assignedStaff === session.name).length,
    "My Requests": requests.filter((r) => r.userName === session.name).length,
  };

  function handleExport() {
    downloadCsv(
      [
        ["Request ID", "Subject", "Requester", "Role", "Source", "Category", "Priority", "Status", "Assigned To", "Updated"],
        ...filtered.map((r: SupportRequest) => [r.id, r.subject, r.userName, r.userRole, r.source, r.category, r.priority, r.status, r.assignedStaff ?? "Unassigned", r.updatedAtISO]),
      ],
      "support-requests.csv"
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Support</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage and respond to support requests from students, tutors and staff across the platform.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Download className="size-4" /> Export
          </button>
          <Link href="/admin/support/new" className="flex h-10 items-center gap-1.5 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
            <Plus className="size-4" /> New Ticket
          </Link>
        </div>
      </div>

      {relatedFilterActive && relatedRecordId && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-ensena-primary/30 bg-ensena-primary/5 px-4 py-2.5 text-sm text-ensena-ink">
          <span>
            Showing support requests related to <span className="font-semibold">{relatedRecordLabel ?? relatedRecordId}</span>
          </span>
          <button type="button" onClick={() => setRelatedFilterActive(false)} className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
            <X className="size-3.5" /> Clear filter
          </button>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by request, user, email, or code (e.g. SUP3Q7NB)…"
              className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <Filter className="size-4" /> Filters {activeFilterCount > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">{activeFilterCount}</span>}
            </button>
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-ensena-border bg-ensena-surface p-4 shadow-lg">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">Requester role</span>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "All" | SupportUserRole)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm">
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">Source</span>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "All" | SupportSource)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm">
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setRoleFilter("All"); setSourceFilter("All"); }}
                    className="mt-3 text-xs font-semibold text-ensena-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDatesOpen((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              {dateFrom || dateTo ? `${dateFrom || "…"} – ${dateTo || "…"}` : "All Time"}
            </button>
            {datesOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDatesOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-ensena-border bg-ensena-surface p-4 shadow-lg">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">From</span>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                  <label className="mt-3 flex flex-col gap-1 text-xs">
                    <span className="font-medium text-ensena-muted">To</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                  <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="mt-3 text-xs font-semibold text-ensena-primary hover:underline">
                    Clear dates
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-ensena-border pb-3">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium",
                statusFilter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {tab}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", statusFilter === tab ? "bg-ensena-primary/20" : "bg-ensena-bg-soft")}>{counts[tab]}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Request</th>
                <th className="py-2 pr-4 font-medium">Requester</th>
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Priority</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Assigned To</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 pr-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => {
                const SourceIcon = SOURCE_STYLES[r.source].icon;
                return (
                  <tr key={r.id} className="border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/support/${r.id}`} className="flex items-start gap-2.5">
                        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", SOURCE_STYLES[r.source].className)}>
                          <SourceIcon className="size-4" />
                        </span>
                        <span>
                          <span className="block font-medium text-ensena-ink">{r.subject}</span>
                          <span className="block font-mono text-[11px] text-ensena-muted">{r.id}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.userName} />
                        <div>
                          <p className="font-medium text-ensena-ink">{r.userName}</p>
                          <p className="text-xs text-ensena-muted">{r.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ensena-ink">{r.source}</td>
                    <td className="py-3 pr-4 text-ensena-ink">{r.category}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", supportPriorityStyles[r.priority])}>{r.priority}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", supportStatusStyles[r.status])}>{r.status}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {r.assignedStaff ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={r.assignedStaff} />
                          <p className="text-ensena-ink">{r.assignedStaff}</p>
                        </div>
                      ) : (
                        <span className="text-ensena-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-ensena-muted">{relativeTimeFromNow(new Date(r.updatedAtISO).getTime())}</td>
                    <td className="py-3 pr-2 text-right">
                      <Link href={`/admin/support/${r.id}`} className="text-xs font-semibold text-ensena-primary hover:underline">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pageItems.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No support requests match this filter.</p>}
        </div>

        {filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ensena-muted">
            <p>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} results</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex size-8 items-center justify-center rounded-full border border-ensena-border disabled:opacity-40">
                <ChevronLeft className="size-4" />
              </button>
              <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{currentPage}</span>
              <span className="text-xs">of {totalPages}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex size-8 items-center justify-center rounded-full border border-ensena-border disabled:opacity-40">
                <ChevronRight className="size-4" />
              </button>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 rounded-lg border border-ensena-border px-2 text-xs">
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
