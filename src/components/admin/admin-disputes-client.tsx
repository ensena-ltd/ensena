"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Flag,
  LifeBuoy,
  Lock,
  MessageSquare,
  RotateCcw,
  Search,
} from "lucide-react";

import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatBookingDisplayId } from "@/lib/admin-bookings-data";
import { splitEarnings } from "@/lib/commission";
import {
  disputePriorityStyles,
  disputeStatusStyles,
  formatDisputeDisplayId,
  isDispute,
  relativeTimeFromNow,
  type DisputePriority,
  type DisputeStatus,
  type LessonConfirmation,
} from "@/lib/escrow-release";
import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

type DisputeTab = "All Disputes" | DisputeStatus;
const tabs: DisputeTab[] = ["All Disputes", "New", "Under Review", "Awaiting Response", "Resolved", "Dismissed"];
const priorities: DisputePriority[] = ["High", "Medium", "Low"];
const OPEN_STATUSES: DisputeStatus[] = ["New", "Under Review", "Awaiting Response"];

function reasonFor(l: LessonConfirmation): string {
  return l.disputeReason ?? l.complaintReason ?? l.tutorReportedIssue ?? (l.tutorAbsent ? "Tutor did not attend" : "—");
}

function activityIcon(action: string) {
  if (action.includes("Resolved") || action === "Admin Release" || action === "Auto Released") return CheckCircle2;
  if (action.includes("Refund")) return RotateCcw;
  if (action === "Tutor Responded") return MessageSquare;
  return Flag;
}

function Card({ title, icon: Icon, action, children }: { title: string; icon?: typeof Flag; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
          {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminDisputesClient() {
  const { lessons, auditLog } = useLessonConfirmations();
  const [tab, setTab] = useState<DisputeTab>("All Disputes");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All Priorities" | DisputePriority>("All Priorities");

  const allDisputes = lessons.filter(isDispute);

  const openDisputes = allDisputes.filter((d) => OPEN_STATUSES.includes(d.disputeStatus ?? "New"));
  const newCount = allDisputes.filter((d) => d.disputeStatus === "New").length;
  const awaitingResponseCount = allDisputes.filter((d) => d.disputeStatus === "Awaiting Response").length;
  const resolvedCount = allDisputes.filter((d) => d.disputeStatus === "Resolved").length;
  const highPriorityOpenCount = openDisputes.filter((d) => d.disputePriority === "High").length;
  const fundsOnHold = openDisputes.reduce((s, d) => s + splitEarnings(d.amountGross).net, 0);
  const refundsIssued = allDisputes.reduce((s, d) => s + (d.resolution?.studentRefund ?? 0), 0);

  const summaryCards = [
    { label: "Open Disputes", value: openDisputes.length.toString(), icon: Flag, tint: "bg-rose-100 text-rose-600", sub: null },
    { label: "Awaiting Review", value: newCount.toString(), icon: Clock, tint: "bg-amber-100 text-amber-600", sub: "Requires attention" },
    { label: "Resolved", value: resolvedCount.toString(), icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-600", sub: "This month" },
    { label: "Funds On Hold", value: formatNaira(fundsOnHold), icon: Lock, tint: "bg-violet-100 text-violet-600", sub: `From ${openDisputes.length} dispute${openDisputes.length === 1 ? "" : "s"}` },
    { label: "Refunds Issued", value: formatNaira(refundsIssued), icon: RotateCcw, tint: "bg-blue-100 text-blue-600", sub: "This month" },
  ];

  const q = query.trim().toLowerCase();
  const filtered = allDisputes
    .filter((d) => tab === "All Disputes" || (d.disputeStatus ?? "New") === tab)
    .filter((d) => priorityFilter === "All Priorities" || d.disputePriority === priorityFilter)
    .filter((d) => {
      if (!q) return true;
      return (
        formatDisputeDisplayId(d.id, d.disputeReferenceCode).toLowerCase().includes(q) ||
        (d.bookingId ? formatBookingDisplayId(d.bookingId).toLowerCase().includes(q) : false) ||
        d.student.toLowerCase().includes(q) ||
        d.tutor.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.completedAt - a.completedAt);

  const recentActivity = auditLog.slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Disputes</h1>
          <p className="mt-1 text-sm text-ensena-muted">Review evidence and resolve disputed lessons and flagged complaints.</p>
        </div>
        <div className="relative min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search booking ID, student or tutor…"
            className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {summaryCards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}><c.icon className="size-4.5" /></div>
                <p className="mt-2.5 text-xs font-medium text-ensena-muted">{c.label}</p>
                <p className="text-xl font-semibold text-ensena-ink">{c.value}</p>
                {c.sub && <p className="text-xs font-medium text-ensena-muted">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
              {tabs.map((t) => {
                const count = t === "All Disputes" ? allDisputes.length : allDisputes.filter((d) => (d.disputeStatus ?? "New") === t).length;
                return (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
                    {t} {count > 0 && <span className="text-xs text-ensena-muted">({count})</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
                <option>All Priorities</option>
                {priorities.map((p) => <option key={p}>{p}</option>)}
              </select>
              <Button
                icon={Download}
                onClick={() =>
                  downloadCsv(
                    [
                      ["Dispute ID", "Student", "Tutor", "Reason", "Status", "Priority", "Amount"],
                      ...filtered.map((d) => [
                        formatDisputeDisplayId(d.id, d.disputeReferenceCode),
                        d.student,
                        d.tutor,
                        reasonFor(d),
                        d.disputeStatus ?? "New",
                        d.disputePriority ?? "",
                        formatNaira(splitEarnings(d.amountGross).net),
                      ]),
                    ],
                    "ensena-disputes.csv"
                  )
                }
              >
                Export
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                    <th className="py-2 pr-4 font-medium">Dispute ID</th>
                    <th className="py-2 pr-4 font-medium">Booking ID</th>
                    <th className="py-2 pr-4 font-medium">Class / Lesson</th>
                    <th className="py-2 pr-4 font-medium">Student</th>
                    <th className="py-2 pr-4 font-medium">Tutor</th>
                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Priority</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const status = d.disputeStatus ?? "New";
                    const priority = d.disputePriority ?? "Low";
                    return (
                      <tr key={d.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                        <td className="py-3 pr-4 font-mono text-xs font-semibold text-ensena-primary">{formatDisputeDisplayId(d.id, d.disputeReferenceCode)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-ensena-ink">{d.bookingId ? formatBookingDisplayId(d.bookingId) : "—"}</td>
                        <td className="py-3 pr-4 text-ensena-ink">
                          <p className="font-medium">{d.subject}</p>
                          <p className="text-xs text-ensena-muted">{d.type === "Group" ? "Group Class" : "Private Lesson"}</p>
                        </td>
                        <td className="py-3 pr-4 text-ensena-ink">{d.student}</td>
                        <td className="py-3 pr-4 text-ensena-ink">{d.tutor}</td>
                        <td className="py-3 pr-4 text-right font-medium text-ensena-ink">{formatNaira(d.amountGross)}</td>
                        <td className="py-3 pr-4 text-ensena-muted">{reasonFor(d)}</td>
                        <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", disputeStatusStyles[status])}>{status}</span></td>
                        <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", disputePriorityStyles[priority])}>{priority}</span></td>
                        <td className="py-3 pr-4 text-right">
                          <Link href={`/admin/disputes/${d.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                            {status === "Resolved" || status === "Dismissed" ? "View" : "Review"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="py-10 text-center text-sm text-ensena-muted">No disputes match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ensena-muted">Showing {filtered.length} of {allDisputes.length} disputes</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Needs Attention" icon={AlertTriangle}>
            <dl className="mt-2 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between"><dt className="text-ensena-muted">New disputes</dt><dd className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{newCount}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-ensena-muted">Awaiting tutor response</dt><dd className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{awaitingResponseCount}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-ensena-muted">Funds on hold</dt><dd className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{formatNaira(fundsOnHold)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-ensena-muted">High priority</dt><dd className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{highPriorityOpenCount}</dd></div>
            </dl>
            <button type="button" onClick={() => setTab("All Disputes")} className="mt-3 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">View all disputes →</button>
          </Card>

          <Card title="Recent Activity" icon={Clock}>
            <ul className="mt-2 flex flex-col gap-3">
              {recentActivity.map((entry) => {
                const Icon = activityIcon(entry.action);
                return (
                  <li key={entry.id} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Icon className="size-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ensena-ink">{entry.action}</p>
                      <p className="text-xs text-ensena-muted">{formatDisputeDisplayId(entry.lessonId)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ensena-muted">{relativeTimeFromNow(entry.atMs)}</span>
                  </li>
                );
              })}
              {recentActivity.length === 0 && <p className="text-sm text-ensena-muted">No activity yet.</p>}
            </ul>
          </Card>

          <Card title="Helpful Links" icon={LifeBuoy}>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {["Dispute Resolution Policy", "How Disputes Work", "Evidence Guidelines", "Communication Templates"].map((link) => (
                <li key={link}><span className="cursor-default text-ensena-muted">{link}</span></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Button({ icon: Icon, children, onClick }: { icon: typeof Download; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
      <Icon className="size-4" /> {children}
    </button>
  );
}
