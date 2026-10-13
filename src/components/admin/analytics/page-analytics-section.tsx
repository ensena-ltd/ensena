"use client";

import { useEffect, useMemo, useState } from "react";
import { Laptop, Smartphone, Tablet, TrendingUp } from "lucide-react";

import { Card } from "@/components/admin/admin-analytics-client";
import { getPageRankingForWindow, subscribePageViews, type DeviceType } from "@/lib/page-analytics-store";
import type { PeriodGranularity } from "@/lib/platform-overview";
import { cn } from "@/lib/utils";

const granularityOptions: { value: PeriodGranularity; label: string; windowDays: number }[] = [
  { value: "day", label: "Day", windowDays: 14 },
  { value: "week", label: "Week", windowDays: 56 },
  { value: "month", label: "Month", windowDays: 180 },
  { value: "year", label: "Year", windowDays: 1095 },
];

const deviceIcon: Record<DeviceType, typeof Laptop> = { Desktop: Laptop, Mobile: Smartphone, Tablet: Tablet };

function useAnalyticsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    return subscribePageViews(bump);
  }, []);
  return version;
}

// Page Analytics — the second Analytics layer, always ranked highest-traffic
// first (never alphabetical). Every meaningful page (including dynamic
// tutor/group-class routes, kept distinct by entityId — see
// page-analytics-store.ts's classifyPath) that was actually viewed in the
// selected window shows up here, aggregated once via getPageRanking() rather
// than rendered from a raw per-event loop.
export function PageAnalyticsSection() {
  const [granularity, setGranularity] = useState<PeriodGranularity>("day");
  const version = useAnalyticsVersion();
  const option = granularityOptions.find((g) => g.value === granularity) ?? granularityOptions[0];

  const rows = useMemo(
    () => getPageRankingForWindow(option.windowDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is an intentional recompute trigger, not a data input
    [option.windowDays, version]
  );

  const totalViews = rows.reduce((sum, r) => sum + r.views, 0);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Page Analytics</h2>
        <div className="flex gap-1 rounded-xl border border-ensena-border bg-ensena-surface p-1">
          {granularityOptions.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGranularity(g.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                granularity === g.value ? "bg-ensena-primary text-white" : "text-ensena-muted hover:text-ensena-ink"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <Card title="Most Visited Pages" icon={TrendingUp} className="mt-3">
        <p className="-mt-1 mb-3 text-xs text-ensena-muted">{totalViews.toLocaleString()} page views in the selected period, ranked highest first.</p>
        {rows.length === 0 ? (
          <p className="text-sm text-ensena-muted">No page views recorded in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-3 font-medium">Rank</th>
                  <th className="py-2 pr-3 font-medium">Page</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 text-right font-medium">Views</th>
                  <th className="py-2 pr-3 text-right font-medium">Unique Visitors</th>
                  <th className="py-2 pr-3 font-medium">Devices</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.pageCategory}:${row.entityId ?? row.path}`} className="border-b border-ensena-border text-sm last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-ensena-muted">#{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ensena-ink">{row.pageTitle}</p>
                      <p className="font-mono text-[11px] text-ensena-muted">{row.path}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-ensena-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ensena-ink">{row.pageCategory}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ensena-ink">{row.views.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right text-ensena-muted">{row.uniqueVisitors.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5 text-xs text-ensena-muted">
                        {(Object.keys(row.deviceBreakdown) as DeviceType[])
                          .filter((d) => row.deviceBreakdown[d] > 0)
                          .map((d) => {
                            const Icon = deviceIcon[d];
                            return (
                              <span key={d} className="flex items-center gap-1">
                                <Icon className="size-3.5" /> {row.deviceBreakdown[d]}
                              </span>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
