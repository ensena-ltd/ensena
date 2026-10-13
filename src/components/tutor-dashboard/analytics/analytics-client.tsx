"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import {
  analyticsOverview,
  bookingsBySubject,
  peakHours,
  revenueTrend,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const rangeOptions = ["7 Days", "30 Days", "90 Days", "This Year"] as const;

const statCards = [
  { key: "bookings", label: "Bookings", format: (v: number) => `${v}` },
  { key: "revenue", label: "Revenue", format: (v: number) => formatNaira(v) },
  { key: "profileViews", label: "Profile Views", format: (v: number) => `${v}` },
  { key: "conversionRate", label: "Conversion Rate", format: (v: number) => `${v}%` },
  { key: "repeatStudents", label: "Repeat Students", format: (v: number) => `${v}%` },
  { key: "lessonCompletion", label: "Lesson Completion", format: (v: number) => `${v}%` },
  { key: "cancellationRate", label: "Cancellation Rate", format: (v: number) => `${v}%` },
] as const;

function downloadReport() {
  const rows = [
    ["Metric", "Value"],
    ...Object.entries(analyticsOverview).map(([key, val]) => [key, String(val.value)]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ensena-analytics-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsClient() {
  const [range, setRange] = useState<(typeof rangeOptions)[number]>("30 Days");

  const sparklinePoints = useMemo(() => {
    const max = Math.max(...revenueTrend);
    const min = Math.min(...revenueTrend);
    const spread = max - min || 1;
    return revenueTrend
      .map((v, i) => `${(i / (revenueTrend.length - 1)) * 300},${70 - ((v - min) / spread) * 65}`)
      .join(" ");
  }, []);

  const maxBooking = Math.max(...bookingsBySubject.map((b) => b.bookings));
  const maxPeak = Math.max(...peakHours.map((p) => p.bookings));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ensena-muted">Track your performance and growth over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-ensena-border bg-ensena-surface p-1 text-xs">
            {rangeOptions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium",
                  range === r ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Button onClick={downloadReport} className="h-9 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-4 text-xs font-semibold text-white">
            <Download className="size-3.5" /> Download Report
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {statCards.map(({ key, label, format }) => {
          const data = analyticsOverview[key as keyof typeof analyticsOverview];
          return (
            <div key={key} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <p className="text-xs text-ensena-muted">{label}</p>
              <p className="text-xl font-semibold text-ensena-ink">{format(data.value as number)}</p>
              <p className={cn("mt-0.5 text-xs", data.changePct >= 0 ? "text-ensena-success" : "text-rose-500")}>
                {data.changePct >= 0 ? "↑" : "↓"} {Math.abs(data.changePct)}%
              </p>
            </div>
          );
        })}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Response Time</p>
          <p className="text-xl font-semibold text-ensena-ink">{analyticsOverview.responseTime.value}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Revenue Growth</h2>
          <svg viewBox="0 0 300 70" className="mt-3 h-24 w-full" preserveAspectRatio="none">
            <polyline points={sparklinePoints} fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs text-ensena-muted">Revenue has grown steadily over the last 12 months.</p>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Bookings by Subject</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {bookingsBySubject.map((b) => (
              <div key={b.subject} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-ensena-muted">{b.subject}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${(b.bookings / maxBooking) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right font-medium text-ensena-ink">{b.bookings}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:col-span-2">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Peak Teaching Hours</h2>
          <div className="mt-4 flex h-32 items-end gap-3">
            {peakHours.map((p) => (
              <div key={p.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-ensena-primary/80"
                  style={{ height: `${(p.bookings / maxPeak) * 100}%` }}
                />
                <span className="text-[11px] text-ensena-muted">{p.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
