"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertOctagon,
  Banknote,
  CreditCard,
  Download,
  Percent,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminDisputesClient } from "@/components/admin/admin-disputes-client";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { usePayoutRequests } from "@/hooks/use-payouts";
import { isDispute } from "@/lib/escrow-release";
import {
  formatBookingDisplayId,
  initialBookings,
  type BookingRow,
  type BookingType,
} from "@/lib/admin-bookings-data";
import {
  formatPayoutDisplayId,
  payoutStatusStyles,
  payoutSummaryStats,
  type PayoutStatus,
} from "@/lib/admin-tutor-payouts-data";
import { splitEarnings } from "@/lib/commission";
import { formatNaira } from "@/lib/format";
import { lessonConfirmationToBookingRow } from "@/lib/lesson-confirmation-to-booking-row";
import { statusToneStyles, transactionStatus, type TxStatus } from "@/lib/transaction-status";
import { cn } from "@/lib/utils";

type Tab = "Overview" | "Transactions" | "Tutor Payouts" | "Refunds" | "Disputes";
const tabs: Tab[] = ["Overview", "Transactions", "Tutor Payouts", "Refunds", "Disputes"];

type TypeFilter = "All Types" | "Private" | "Group" | "Discovery";
const typeFilters: TypeFilter[] = ["All Types", "Private", "Group", "Discovery"];

function matchesType(b: BookingRow, filter: TypeFilter): boolean {
  if (filter === "All Types") return true;
  if (filter === "Private") return b.type === "Private Lesson";
  if (filter === "Group") return b.type === "Group Class";
  return b.type === "Discovery Session";
}

function typeBadgeStyle(type: BookingType): string {
  if (type === "Private Lesson") return "bg-emerald-100 text-emerald-700";
  if (type === "Group Class") return "bg-purple-100 text-purple-700";
  if (type === "Discovery Session") return "bg-amber-100 text-amber-700";
  return "bg-ensena-bg-soft text-ensena-muted";
}

function typeLabel(type: BookingType): string {
  if (type === "Private Lesson") return "Private";
  if (type === "Group Class") return "Group";
  if (type === "Discovery Session") return "Discovery";
  return type;
}

function StatusPill({ status }: { status: TxStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusToneStyles[status.tone])}>
      <span className="size-1.5 rounded-full bg-current" /> {status.label}
    </span>
  );
}

function Card({ title, children, action, className }: { title?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      {title && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const dateRanges = ["Today", "This Week", "This Month", "Last 3 Months", "Custom"] as const;

function buildFiltered(allBookings: BookingRow[], typeFilter: TypeFilter, query: string, effectiveStatus: string) {
  const q = query.trim().toLowerCase();
  return [...allBookings]
    .filter((b) => matchesType(b, typeFilter))
    .filter((b) => effectiveStatus === "All Statuses" || transactionStatus(b).label === effectiveStatus)
    .filter((b) => {
      if (!q) return true;
      return (
        formatBookingDisplayId(b.id).toLowerCase().includes(q) ||
        b.student.toLowerCase().includes(q) ||
        b.tutor.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function exportCsv(rowsToExport: BookingRow[]) {
  const rows = [
    ["Booking ID", "Student", "Tutor", "Type", "Gross", "Commission", "Tutor Earnings", "Status", "Date"],
    ...rowsToExport.map((b) => {
      const split = splitEarnings(b.amountGross);
      const status = transactionStatus(b);
      return [formatBookingDisplayId(b.id), b.student, b.tutor, typeLabel(b.type), b.amountGross, split.commission, split.net, status.label, b.date];
    }),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ensena-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface TransactionsTableProps {
  allBookings: BookingRow[];
  forceStatus?: string;
  query: string;
  setQuery: (v: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  statusOptions: string[];
  page: number;
  setPage: (updater: (p: number) => number) => void;
  perPage: number;
}

function TransactionsTable({
  allBookings,
  forceStatus,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  statusOptions,
  page,
  setPage,
  perPage,
}: TransactionsTableProps) {
  const effectiveStatus = forceStatus ?? statusFilter;
  const filtered = buildFiltered(allBookings, typeFilter, query, effectiveStatus);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <Card title={forceStatus ? undefined : "Transactions"}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(() => 1); }}
            placeholder="Search by Booking ID, student or tutor…"
            className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
          />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(() => 1); }} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
          {typeFilters.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {!forceStatus && (
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(() => 1); }} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <Button variant="outline" onClick={() => exportCsv(filtered)} className="h-10 shrink-0 rounded-full border-ensena-border px-4 text-sm font-medium">
          <Download className="size-4" /> Export
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-4 font-medium">Booking ID</th>
              <th className="py-2 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Tutor</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 text-right font-medium">Gross Amount</th>
              <th className="py-2 pr-4 text-right font-medium">Enseña Commission</th>
              <th className="py-2 pr-4 text-right font-medium">Tutor Earnings</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((b) => {
              const split = splitEarnings(b.amountGross);
              const status = transactionStatus(b);
              return (
                <tr key={b.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/payments/${b.id}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(b.id)}</Link>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={b.studentImage} alt={b.student} fill sizes="28px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{b.student}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={b.tutorImage} alt={b.tutor} fill sizes="28px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{b.tutor}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", typeBadgeStyle(b.type))}>{typeLabel(b.type)}</span></td>
                  <td className="py-3 pr-4 text-right font-medium text-ensena-ink">{formatNaira(b.amountGross)}</td>
                  <td className="py-3 pr-4 text-right text-ensena-muted">{formatNaira(split.commission)}</td>
                  <td className="py-3 pr-4 text-right text-ensena-muted">{formatNaira(split.net)}</td>
                  <td className="py-3 pr-4"><StatusPill status={status} /></td>
                  <td className="py-3 pr-4 text-ensena-muted">
                    <p>{b.date}</p>
                    <p className="text-xs">{b.time}</p>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Link href={`/admin/payments/${b.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View</Link>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-sm text-ensena-muted">No transactions match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ensena-muted">Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} transactions</p>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-ink disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(() => p)} className={cn("flex size-8 items-center justify-center rounded-full text-xs font-semibold", currentPage === p ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}>{p}</button>
            ))}
            {totalPages > 3 && <span className="px-1 text-xs text-ensena-muted">…</span>}
            {totalPages > 3 && <button type="button" onClick={() => setPage(() => totalPages)} className={cn("flex size-8 items-center justify-center rounded-full text-xs font-semibold", currentPage === totalPages ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}>{totalPages}</button>}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-ink disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AdminPaymentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : "Overview";

  const [dateRange, setDateRange] = useState<(typeof dateRanges)[number]>("This Month");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All Types");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [page, setPage] = useState(1);
  const perPage = 8;

  function setTab(next: Tab) {
    router.push(next === "Overview" ? "/admin/payments" : `/admin/payments?tab=${encodeURIComponent(next)}`);
  }

  // ---- Disputed/flagged lessons, from the same escrow store the Virtual
  // Classroom and student/tutor dashboards write to — not a separate
  // dataset, so a dispute opened there shows up here immediately. ----
  const { lessons: escrowLessons } = useLessonConfirmations();
  const openDisputes = escrowLessons.filter((l) => isDispute(l) && l.disputeStatus !== "Resolved" && l.disputeStatus !== "Dismissed");
  const disputedAmount = openDisputes.reduce((s, l) => s + l.amountGross, 0);

  // ---- Real financial figures — the static seed bookings (legitimate
  // pre-existing demo history) merged with every REAL session a student/
  // tutor has actually completed (escrow-store.ts), so a booking made
  // through the live app shows up here too instead of only ever showing
  // seed data. Both the stat cards below and the Transactions table read
  // this exact same merged array, so the total always agrees with what the
  // rows underneath actually sum to. ----
  const allBookings: BookingRow[] = [...initialBookings, ...escrowLessons.map(lessonConfirmationToBookingRow)];
  const paidBookings = allBookings.filter((b) => b.amountGross > 0);
  const totalRevenue = paidBookings.reduce((s, b) => s + b.amountGross, 0);
  const totalCommission = paidBookings.reduce((s, b) => s + splitEarnings(b.amountGross).commission, 0);
  const totalTutorPayouts = paidBookings.reduce((s, b) => s + splitEarnings(b.amountGross).net, 0);
  const pendingBookings = allBookings.filter((b) => b.amountGross > 0 && (b.paymentStatus === "Held in Escrow" || b.paymentStatus === "Awaiting Payment"));
  const pendingAmount = pendingBookings.reduce((s, b) => s + b.amountGross, 0);
  const refundedBookings = allBookings.filter((b) => b.paymentStatus === "Refunded");
  const refundedAmount = refundedBookings.reduce((s, b) => s + b.amountGross, 0);

  const overviewCards = [
    { label: "Total Platform Revenue", value: totalRevenue, delta: 18.6, icon: Banknote, tint: "bg-emerald-100 text-emerald-600" },
    { label: "Tutor Payouts", value: totalTutorPayouts, delta: 16.3, icon: Wallet, tint: "bg-blue-100 text-blue-600" },
    { label: "Enseña Commission", value: totalCommission, delta: 21.4, icon: Percent, tint: "bg-purple-100 text-purple-600" },
    { label: "Pending Payments", value: pendingAmount, sub: `${pendingBookings.length} transactions`, icon: CreditCard, tint: "bg-amber-100 text-amber-600" },
    { label: "Refunds", value: refundedAmount, sub: `${refundedBookings.length} transactions`, icon: RotateCcw, tint: "bg-rose-100 text-rose-600" },
  ];

  const statusOptions = ["All Statuses", ...Array.from(new Set(allBookings.map((b) => transactionStatus(b).label)))];

  const tableProps = { allBookings, query, setQuery, typeFilter, setTypeFilter, statusFilter, setStatusFilter, statusOptions, page, setPage, perPage };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Payments &amp; Earnings</h1>
          <p className="mt-1 text-sm text-ensena-muted">Overview of platform payments, tutor earnings, commissions and refunds.</p>
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value as (typeof dateRanges)[number])} className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm font-medium text-ensena-ink">
          {dateRanges.map((r) => <option key={r} value={r}>{r === "This Month" ? "Last 30 Days" : r}</option>)}
        </select>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
            {t}
            {t === "Disputes" && openDisputes.length > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white">{openDisputes.length}</span>
            )}
          </button>
        ))}
      </div>

      {openDisputes.length > 0 && tab !== "Disputes" && (
        <button
          type="button"
          onClick={() => setTab("Disputes")}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left hover:bg-rose-100"
        >
          <span className="flex items-center gap-2.5">
            <AlertOctagon className="size-4.5 shrink-0 text-rose-600" />
            <span className="text-sm text-rose-700">
              <span className="font-semibold">{openDisputes.length} open dispute{openDisputes.length === 1 ? "" : "s"}</span> · {formatNaira(disputedAmount)} in question. Tutor earnings held pending review
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-rose-700">Review →</span>
        </button>
      )}

      {tab === "Overview" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {overviewCards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className={cn("flex size-10 items-center justify-center rounded-full", c.tint)}><c.icon className="size-5" /></div>
                <p className="mt-2.5 text-xs font-medium text-ensena-muted">{c.label}</p>
                <p className="text-xl font-semibold text-ensena-ink">{formatNaira(c.value)}</p>
                {c.delta !== undefined ? (
                  <p className="text-xs font-medium text-ensena-success">↑ {c.delta}% <span className="font-normal text-ensena-muted">vs previous 30 days</span></p>
                ) : (
                  <p className="text-xs font-semibold text-ensena-ink">{c.sub} <span className="font-normal text-ensena-muted">vs previous 30 days</span></p>
                )}
              </div>
            ))}
          </div>

          <TransactionsTable {...tableProps} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card title="Recent Transactions" action={<button type="button" onClick={() => setTab("Transactions")} className="text-xs font-semibold text-ensena-primary hover:underline">View All</button>}>
              <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                {[...initialBookings].filter((b) => b.amountGross > 0).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((b) => {
                  const status = transactionStatus(b);
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/admin/payments/${b.id}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(b.id)}</Link>
                        <p className="truncate text-xs text-ensena-muted">{b.student} → {b.tutor}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-ensena-ink">{formatNaira(b.amountGross)}</p>
                        <StatusPill status={status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card title="Pending Payments" action={<button type="button" onClick={() => { setStatusFilter("Pending"); setTab("Transactions"); }} className="text-xs font-semibold text-ensena-primary hover:underline">View All</button>}>
              <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                {pendingBookings.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/admin/payments/${b.id}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(b.id)}</Link>
                      <p className="truncate text-xs text-ensena-muted">{b.student} → {b.tutor}</p>
                    </div>
                    <p className="shrink-0 font-medium text-ensena-ink">{formatNaira(b.amountGross)}</p>
                  </li>
                ))}
                {pendingBookings.length === 0 && <p className="text-sm text-ensena-muted">No pending payments.</p>}
              </ul>
            </Card>

            <Card title="Recent Refunds" action={<button type="button" onClick={() => setTab("Refunds")} className="text-xs font-semibold text-ensena-primary hover:underline">View All</button>}>
              <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                {refundedBookings.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/admin/payments/${b.id}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(b.id)}</Link>
                      <p className="truncate text-xs text-ensena-muted">{b.student} → {b.tutor}</p>
                    </div>
                    <p className="shrink-0 font-medium text-rose-600">{formatNaira(b.amountGross)}</p>
                  </li>
                ))}
                {refundedBookings.length === 0 && <p className="text-sm text-ensena-muted">No refunds.</p>}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "Transactions" && <div className="mt-5"><TransactionsTable {...tableProps} /></div>}

      {tab === "Refunds" && (
        <div className="mt-5">
          <TransactionsTable {...tableProps} forceStatus="Refunded" />
        </div>
      )}

      {tab === "Tutor Payouts" && <TutorPayoutsSection />}

      {tab === "Disputes" && (
        <div className="mt-5">
          <AdminDisputesClient />
        </div>
      )}
    </div>
  );
}

// ==================== TUTOR PAYOUTS ====================

function TutorPayoutsSection() {
  const [statusTab, setStatusTab] = useState<"All" | PayoutStatus>("All");
  const payoutRequests = usePayoutRequests();

  const statusTabs: ("All" | PayoutStatus)[] = ["All", "Pending Review", "Processing", "Paid", "Failed", "Rejected"];
  const filtered = statusTab === "All" ? payoutRequests : payoutRequests.filter((p) => p.status === statusTab);

  const summaryCards = [
    { label: "Pending Requests", value: payoutSummaryStats.pendingCount.toString() },
    { label: "Amount Pending", value: formatNaira(payoutSummaryStats.amountPending) },
    { label: "Processing", value: payoutSummaryStats.processingCount.toString() },
    { label: "Paid This Month", value: formatNaira(payoutSummaryStats.paidThisMonth) },
    { label: "Failed", value: payoutSummaryStats.failedCount.toString() },
  ];

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Tutor Payouts</h2>
        <p className="text-sm text-ensena-muted">Review and process tutor withdrawal requests.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs font-medium text-ensena-muted">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-ensena-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap gap-1.5">
          {statusTabs.map((s) => (
            <button key={s} type="button" onClick={() => setStatusTab(s)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", statusTab === s ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{s}</button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Payout Account</th>
                <th className="py-2 pr-4 font-medium">Requested</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={p.tutorImage} alt={p.tutor} fill sizes="32px" className="object-cover" /></div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ensena-ink">{p.tutor}</p>
                        <p className="truncate text-xs text-ensena-muted">{formatPayoutDisplayId(p.id)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-ensena-ink">{formatNaira(p.amount)}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{p.bankName} ••••{p.accountLast4}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{p.requestedAgo}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", payoutStatusStyles[p.status])}>{p.status}</span></td>
                  <td className="py-3 pr-4 text-right">
                    <Link href={`/admin/payments/payouts/${p.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      {p.status === "Pending Review" ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-ensena-muted">No payout requests in this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
