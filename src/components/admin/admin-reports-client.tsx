"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertOctagon, CheckCircle2, Clock, Download, Search } from "lucide-react";

import { useReports } from "@/hooks/use-reports";
import {
  reportPriorityStyles,
  reportStatusStyles,
  reportTypes,
  type Report,
  type ReportPriority,
  type ReportStatus,
  type ReportType,
} from "@/lib/admin-reports-data";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type ReportTab = "All" | ReportStatus;
const tabs: ReportTab[] = ["All", "Open", "Under Review", "Awaiting Information", "Escalated", "Resolved", "Dismissed"];

export function AdminReportsClient() {
  const router = useRouter();
  const reports = useReports();
  const [tab, setTab] = useState<ReportTab>("All");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All Types" | ReportType>("All Types");
  const [priorityFilter, setPriorityFilter] = useState<"All Priorities" | ReportPriority>("All Priorities");

  const newCount = reports.filter((r) => r.status === "Open").length;
  const underReviewCount = reports.filter((r) => r.status === "Under Review" || r.status === "Awaiting Information" || r.status === "Escalated").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;

  const summaryCards = [
    { label: "Open Reports", value: newCount, tint: "bg-rose-100 text-rose-600", icon: AlertOctagon },
    { label: "In Progress", value: underReviewCount, tint: "bg-amber-100 text-amber-600", icon: Clock },
    { label: "Resolved", value: resolvedCount, tint: "bg-emerald-100 text-emerald-600", icon: CheckCircle2 },
  ];

  const q = query.trim().toLowerCase();
  const filtered = reports
    .filter((r) => tab === "All" || r.status === tab)
    .filter((r) => typeFilter === "All Types" || r.type === typeFilter)
    .filter((r) => priorityFilter === "All Priorities" || r.priority === priorityFilter)
    .filter((r) => {
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.reportedName.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q)
      );
    });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Reports &amp; Issues</h1>
          <p className="mt-1 text-sm text-ensena-muted">Review reports, complaints and platform issues.</p>
        </div>
        <div className="relative min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search report, user or reporter…"
            className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <div className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}><c.icon className="size-4.5" /></div>
            <p className="mt-2.5 text-xs font-medium text-ensena-muted">{c.label}</p>
            <p className="text-xl font-semibold text-ensena-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
          {tabs.map((t) => {
            const count = t === "All" ? reports.length : reports.filter((r) => r.status === t).length;
            return (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
                {t} {count > 0 && <span className="text-xs text-ensena-muted">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option>All Types</option>
            {reportTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option>All Priorities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                [
                  ["Report ID", "Type", "Reported", "Reporter", "Reason", "Status", "Priority", "Submitted"],
                  ...filtered.map((r) => [r.id, r.type, r.reportedName, r.reporterName, r.reason, r.status, r.priority, r.submittedLabel]),
                ],
                "ensena-reports.csv"
              )
            }
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Download className="size-4" /> Export
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Report</th>
                <th className="py-2 pr-4 font-medium">Reported</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Reporter</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Priority</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: Report) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/admin/reports/${r.id}`)}
                  className="cursor-pointer border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft"
                >
                  <td className="py-3 pr-4">
                    <Link href={`/admin/reports/${r.id}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{r.id}</Link>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {r.reportedImage && <span className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={r.reportedImage} alt={r.reportedName} fill sizes="28px" className="object-cover" /></span>}
                      <span className="font-medium text-ensena-ink">{r.reportedName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">{r.type}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{r.reporterName}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{r.submittedLabel.split(" · ")[0]}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", reportStatusStyles[r.status])}>{r.status}</span></td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", reportPriorityStyles[r.priority])}>{r.priority}</span></td>
                  <td className="py-3 pr-4 text-right">
                    <Link href={`/admin/reports/${r.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                      {r.status === "Resolved" || r.status === "Dismissed" ? "View" : "Review"}
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-ensena-muted">No reports match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ensena-muted">Showing {filtered.length} of {reports.length} reports</p>
      </div>
    </div>
  );
}
