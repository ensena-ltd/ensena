"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSearch,
  Headphones,
  Mail,
  MoreVertical,
  Search,
  XCircle,
  Zap,
} from "lucide-react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { currentActorLabel } from "@/lib/admin-session";
import {
  bookingStats,
  bookingStatusStyles,
  bookingTypeIconStyles,
  getBookingDisplayStatus,
  initialBookings,
  type BookingRow,
  type BookingStatus,
} from "@/lib/admin-bookings-data";
import { sendMessage } from "@/lib/admin-communications-store";
import { formatNaira } from "@/lib/format";
import { getPlatformNowMs } from "@/lib/platform-time";
import { cn } from "@/lib/utils";

type TypeTab = "All" | "Private" | "Group" | "Discovery";
const typeTabs: TypeTab[] = ["All", "Private", "Group", "Discovery"];

function matchesTypeTab(b: BookingRow, tab: TypeTab): boolean {
  if (tab === "All") return true;
  if (tab === "Private") return b.type === "Private Lesson";
  if (tab === "Group") return b.type === "Group Class";
  return b.type === "Discovery Session";
}

function sessionLabel(b: BookingRow): string {
  if (b.type === "Private Lesson") return `${b.subject} · Private Lesson`;
  if (b.type === "Discovery Session") return "Discovery Session";
  if (b.type === "Counselling") return "Academic Counselling";
  return b.subject;
}

export function AdminBookingsClient() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const validStatuses: BookingStatus[] = ["Pending", "Upcoming", "Live", "Completed", "Cancelled", "Disputed"];
  const initialStatus = validStatuses.includes(statusParam as BookingStatus) ? (statusParam as BookingStatus) : null;

  const [rawBookings] = useState<BookingRow[]>(initialBookings);
  const [nowMs, setNowMs] = useState(() => getPlatformNowMs());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(getPlatformNowMs()), 1000);
    return () => clearInterval(interval);
  }, []);
  // The one place every booking's Upcoming/Live/Completed label gets
  // re-derived from real Africa/Lagos time — every filter, count, table
  // row, and export below reads `status` off this array, never off
  // `rawBookings` directly, so the fix applies everywhere automatically.
  const bookings = useMemo<BookingRow[]>(
    () => rawBookings.map((b) => ({ ...b, status: getBookingDisplayStatus(b, nowMs) })),
    [rawBookings, nowMs]
  );
  const [typeTab, setTypeTab] = useState<TypeTab>("All");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "All Statuses">(initialStatus ?? "All Statuses");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [tutorFilter, setTutorFilter] = useState("All Tutors");
  const [classFilter, setClassFilter] = useState("All Subjects");
  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [toast, setToast] = useState<string | null>(null);
  const [msgTarget, setMsgTarget] = useState<{ name: string; role: "Student" | "Tutor" } | null>(null);
  const [bulkMsgOpen, setBulkMsgOpen] = useState(false);
  const [bulkMsgSubject, setBulkMsgSubject] = useState("");
  const [bulkMsgBody, setBulkMsgBody] = useState("");

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const tutors = ["All Tutors", ...Array.from(new Set(bookings.map((b) => b.tutor)))];
  const subjects = ["All Subjects", ...Array.from(new Set(bookings.map((b) => b.subject)))];

  const summaryCards: { key: BookingStatus; label: string; value: number; icon: typeof CalendarCheck; tint: string; sub?: string }[] = [
    { key: "Upcoming", label: "Upcoming", value: bookings.filter((b) => b.status === "Upcoming" || b.status === "Live").length, icon: CalendarCheck, tint: "bg-emerald-100 text-emerald-600", sub: "Bookings" },
    { key: "Pending", label: "Pending", value: bookingStats.pendingApproval, icon: Clock, tint: "bg-orange-100 text-orange-600", sub: "Needs attention" },
    { key: "Completed", label: "Completed", value: bookings.filter((b) => b.status === "Completed").length, icon: CheckCircle2, tint: "bg-blue-100 text-blue-600", sub: "Bookings" },
    { key: "Cancelled", label: "Cancelled", value: bookingStats.cancelled, icon: XCircle, tint: "bg-rose-100 text-rose-600", sub: "Bookings" },
    { key: "Disputed", label: "Disputed", value: bookingStats.disputed, icon: AlertTriangle, tint: "bg-purple-100 text-purple-600", sub: "Bookings" },
  ];

  function changeStatusCard(key: BookingStatus) {
    setStatusFilter((cur) => (cur === key ? "All Statuses" : key));
    setPage(1);
  }

  const filtered = bookings.filter((b) => {
    const matchesTypeFilter = matchesTypeTab(b, typeTab);
    const matchesStatus = statusFilter === "All Statuses" || b.status === statusFilter || (statusFilter === "Upcoming" && b.status === "Live");
    const matchesTutor = tutorFilter === "All Tutors" || b.tutor === tutorFilter;
    const matchesSubject = classFilter === "All Subjects" || b.subject === classFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      b.bookingReference.toLowerCase().includes(q) ||
      b.student.toLowerCase().includes(q) ||
      b.tutor.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q);
    return matchesTypeFilter && matchesStatus && matchesTutor && matchesSubject && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  function exportBookings() {
    const rows = [
      ["Booking ID", "Student", "Tutor", "Class/Session", "Type", "Date", "Time", "Amount", "Status"],
      ...filtered.map((b) => [b.bookingReference, b.student, b.tutor, sessionLabel(b), b.type, b.date, b.time, b.amountGross, b.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ensena-bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
    flash("Bookings exported.");
  }

  // Same real broadcast store group-class-full-details-client.tsx's "Msg
  // Students" writes to — the audience here is whatever the current
  // filters/search resolve to, so the broadcast always matches what the
  // admin is actually looking at.
  function sendBulkMessage() {
    if (!bulkMsgSubject.trim() || !bulkMsgBody.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: `Bookings matching current filters (${filtered.length})`,
      recipientCount: filtered.length,
      channels: ["In-App"],
      subject: bulkMsgSubject.trim(),
      body: bulkMsgBody.trim(),
    });
    flash(`Bulk message sent to ${filtered.length} booking${filtered.length === 1 ? "" : "s"}.`);
    setBulkMsgSubject("");
    setBulkMsgBody("");
    setBulkMsgOpen(false);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Bookings</h1>
        <p className="mt-1 text-sm text-ensena-muted">View and manage all private lessons, group classes, and discovery sessions.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => changeStatusCard(card.key)}
            className={cn(
              "rounded-2xl border bg-white p-4 text-left transition-colors hover:border-ensena-primary/40",
              statusFilter === card.key ? "border-ensena-primary" : "border-ensena-border"
            )}
          >
            <div className={cn("flex size-10 items-center justify-center rounded-full", card.tint)}>
              <card.icon className="size-4.5" />
            </div>
            <p className="mt-3 text-xl font-semibold text-ensena-ink">{card.value.toLocaleString()}</p>
            <p className="text-xs font-medium text-ensena-ink">{card.label}</p>
            {card.sub && <p className="text-xs text-ensena-muted">{card.sub}</p>}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {typeTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTypeTab(t); setPage(1); }}
                className={cn(
                  "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
                  typeTab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by Booking ID, student, tutor or class…"
                className="h-11 w-full rounded-xl border border-ensena-border pl-11 pr-4 text-sm"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as BookingStatus | "All Statuses"); setPage(1); }} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              <option>All Statuses</option>
              {validStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={tutorFilter} onChange={(e) => { setTutorFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {tutors.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-ensena-primary px-4 text-sm font-medium text-ensena-primary">
              <FileSearch className="size-4" /> Filters
            </button>
            <button type="button" onClick={exportBookings} className="flex h-11 items-center gap-1.5 rounded-xl border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              <Download className="size-4" /> Export
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
                {["All Dates", "Today", "This Week", "This Month"].map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="mt-4 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Booking ID</th>
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Tutor</th>
                  <th className="py-2 pr-4 font-medium">Class / Session</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((b) => (
                  <tr key={b.id} className="border-b border-ensena-border last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-ensena-ink hover:text-ensena-primary">{b.bookingReference}</Link>
                    </td>
                    <td className="py-3 pr-4">
                      {b.studentImage ? (
                        <div className="flex items-center gap-2">
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={b.studentImage} alt={b.student} fill sizes="32px" className="object-cover" /></span>
                          <span className="text-ensena-ink">{b.student}</span>
                        </div>
                      ) : (
                        <span className="text-ensena-muted">{b.student}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={b.tutorImage} alt={b.tutor} fill sizes="32px" className="object-cover" /></span>
                        <span className="text-ensena-ink">{b.tutor}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-ensena-ink">{sessionLabel(b)}</p>
                      <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", bookingTypeIconStyles[b.type])}>{b.type}</span>
                    </td>
                    <td className="py-3 pr-4 text-ensena-muted">{b.type === "Private Lesson" ? "Private" : b.type === "Group Class" ? "Group" : b.type === "Discovery Session" ? "Discovery" : "Counselling"}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{b.date}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{b.time}</td>
                    <td className="py-3 pr-4 text-ensena-ink">{b.amountGross > 0 ? formatNaira(b.amountGross) : "Free"}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", bookingStatusStyles[b.status])}>{b.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/bookings/${b.id}`} className="flex h-8 shrink-0 items-center justify-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View</Link>
                        <div className="relative">
                          <button type="button" aria-label="More options" onClick={() => setRowMenuId((cur) => (cur === b.id ? null : b.id))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                            <MoreVertical className="size-4" />
                          </button>
                          {rowMenuId === b.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setRowMenuId(null)} />
                              <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                                <Link href={`/admin/bookings/${b.id}`} onClick={() => setRowMenuId(null)} className="block rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Booking</Link>
                                <button type="button" onClick={() => { setMsgTarget({ name: b.student, role: "Student" }); setRowMenuId(null); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Contact Student</button>
                                <button type="button" onClick={() => { setMsgTarget({ name: b.tutor, role: "Tutor" }); setRowMenuId(null); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Contact Tutor</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr><td colSpan={10} className="py-10 text-center text-ensena-muted">No bookings match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — a table this wide shouldn't be squeezed horizontally on a phone */}
          <div className="mt-4 flex flex-col gap-3 lg:hidden">
            {pageItems.map((b) => (
              <div key={b.id} className="rounded-2xl border border-ensena-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-ensena-ink">{b.bookingReference}</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", bookingStatusStyles[b.status])}>{b.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ensena-ink">{sessionLabel(b)}</p>
                <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", bookingTypeIconStyles[b.type])}>{b.type}</span>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {b.studentImage ? <span className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={b.studentImage} alt={b.student} fill sizes="28px" className="object-cover" /></span> : null}
                    <span className="text-sm text-ensena-ink">{b.student}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={b.tutorImage} alt={b.tutor} fill sizes="28px" className="object-cover" /></span>
                    <span className="text-sm text-ensena-ink">{b.tutor}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-ensena-ink">{b.date} · {b.time}</span>
                  <span className="font-semibold text-ensena-ink">{b.amountGross > 0 ? formatNaira(b.amountGross) : "Free"}</span>
                </div>
                <Link href={`/admin/bookings/${b.id}`} className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary">View Booking</Link>
              </div>
            ))}
            {pageItems.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No bookings match this filter.</p>}
          </div>

          {filtered.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-4">
              <p className="text-xs text-ensena-muted">Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} bookings</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className={cn("flex size-8 items-center justify-center rounded-full text-xs font-medium", n === currentPage ? "bg-ensena-primary text-white" : "text-ensena-ink hover:bg-ensena-bg-soft")}>{n}</button>
                ))}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Booking Overview</h2>
            <p className="text-xs text-ensena-muted">Track all bookings across the platform.</p>
            <ul className="mt-4 flex flex-col gap-4">
              {[
                { icon: CalendarCheck, tint: "bg-emerald-100 text-emerald-600", title: "Upcoming", desc: "Lessons scheduled in the future." },
                { icon: Clock, tint: "bg-orange-100 text-orange-600", title: "Pending", desc: "Awaiting payment or confirmation." },
                { icon: CheckCircle2, tint: "bg-blue-100 text-blue-600", title: "Completed", desc: "Lessons that have been completed." },
                { icon: XCircle, tint: "bg-rose-100 text-rose-600", title: "Cancelled", desc: "Bookings that were cancelled." },
                { icon: AlertTriangle, tint: "bg-purple-100 text-purple-600", title: "Disputed", desc: "Bookings under dispute." },
              ].map((row) => (
                <li key={row.title} className="flex gap-3">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", row.tint)}><row.icon className="size-3.5" /></span>
                  <div><p className="text-sm font-semibold text-ensena-ink">{row.title}</p><p className="text-xs text-ensena-muted">{row.desc}</p></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
              <Zap className="size-4 text-ensena-primary" /> Quick Actions
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" onClick={exportBookings} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                <Download className="size-3.5 text-ensena-primary" /> Export Bookings
              </button>
              <button type="button" onClick={() => setBulkMsgOpen(true)} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                <Mail className="size-3.5 text-ensena-primary" /> Send Bulk Message
              </button>
              <button type="button" onClick={() => { setStatusFilter("Disputed"); setTypeTab("All"); setPage(1); }} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                <AlertTriangle className="size-3.5 text-ensena-primary" /> View Disputed Bookings
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><Headphones className="size-4 text-ensena-primary" /> Need Help?</h2>
            <p className="mt-2 text-xs text-ensena-muted">If you need help with a booking, contact our support team.</p>
            <Link href="/admin/support" className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">Contact Support</Link>
          </div>
        </div>
      </div>

      {msgTarget && (
        <AdminMsgTutorModal open={!!msgTarget} onClose={() => setMsgTarget(null)} recipientName={msgTarget.name} role={msgTarget.role} />
      )}

      <Modal open={bulkMsgOpen} onClose={() => setBulkMsgOpen(false)} title="Send Bulk Message">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Sent to everyone in the currently filtered {filtered.length} booking{filtered.length === 1 ? "" : "s"}.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={bulkMsgSubject} onChange={(e) => setBulkMsgSubject(e.target.value)} placeholder="e.g. Upcoming platform maintenance" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={bulkMsgBody} onChange={(e) => setBulkMsgBody(e.target.value)} rows={3} placeholder="Write your message…" className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={sendBulkMessage} disabled={!bulkMsgSubject.trim() || !bulkMsgBody.trim()} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
            Send to {filtered.length} Booking{filtered.length === 1 ? "" : "s"}
          </Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
