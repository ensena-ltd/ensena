"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, UserCheck, Users } from "lucide-react";

import { Card } from "@/components/admin/admin-analytics-client";
import { getPlatformOverview, type PeriodGranularity } from "@/lib/platform-overview";
import { subscribePageViews } from "@/lib/page-analytics-store";
import { subscribeSignupEvents } from "@/lib/signup-events-store";
import { cn } from "@/lib/utils";

const granularityOptions: { value: PeriodGranularity; label: string; bucketCount: number }[] = [
  { value: "day", label: "Day", bucketCount: 14 },
  { value: "week", label: "Week", bucketCount: 8 },
  { value: "month", label: "Month", bucketCount: 6 },
  { value: "year", label: "Year", bucketCount: 3 },
];

// Bumps on any real page-view or signup event so this section reflects new
// activity without a manual page refresh — the underlying numbers always
// come from getPlatformOverview() itself, never from this counter.
function useAnalyticsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const unsubViews = subscribePageViews(bump);
    const unsubSignups = subscribeSignupEvents(bump);
    return () => {
      unsubViews();
      unsubSignups();
    };
  }, []);
  return version;
}

const summaryCards: { key: "visitors" | "activeUsers" | "newSignups"; label: string; hint: string; icon: typeof Users; tint: string }[] = [
  { key: "visitors", label: "Total Visitors", hint: "Everyone who viewed a public page, signed in or not.", icon: Users, tint: "bg-blue-100 text-blue-600" },
  { key: "activeUsers", label: "Active Users", hint: "Visitors who were logged in during at least one of those views.", icon: UserCheck, tint: "bg-emerald-100 text-emerald-600" },
  { key: "newSignups", label: "New Signups", hint: "Real accounts created in this period.", icon: Activity, tint: "bg-purple-100 text-purple-600" },
];

// Platform Overview — the first of the two Analytics layers (Platform
// Overview, then Page Analytics below it). Everything here is computed live
// from real events (page-analytics-store.ts + signup-events-store.ts) via
// getPlatformOverview(), never a hardcoded number — see that file for each
// metric's exact, explicit definition.
export function PlatformOverviewSection() {
  const [granularity, setGranularity] = useState<PeriodGranularity>("day");
  const version = useAnalyticsVersion();
  const option = granularityOptions.find((g) => g.value === granularity) ?? granularityOptions[0];

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is an intentional recompute trigger, not a data input
  const overview = useMemo(() => getPlatformOverview(granularity, option.bucketCount), [granularity, option.bucketCount, version]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Platform Overview</h2>
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

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((c) => (
          <div key={c.key} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <div className={cn("flex size-10 items-center justify-center rounded-full", c.tint)}>
              <c.icon className="size-5" />
            </div>
            <p className="mt-2.5 text-xs font-medium text-ensena-muted">{c.label}</p>
            <p className="text-2xl font-semibold text-ensena-ink">{overview.totals[c.key].toLocaleString()}</p>
            <p className="mt-0.5 text-[11px] text-ensena-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      <Card title="Activity by Date" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 text-right font-medium">Visitors</th>
                <th className="py-2 pr-3 text-right font-medium">Active Users</th>
                <th className="py-2 pr-3 text-right font-medium">New Signups</th>
              </tr>
            </thead>
            <tbody>
              {overview.buckets.map((b) => (
                <tr key={b.startMs} className="border-b border-ensena-border text-sm last:border-0">
                  <td className="py-2.5 pr-3 text-ensena-ink">{b.label}</td>
                  <td className="py-2.5 pr-3 text-right text-ensena-muted">{b.visitors.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-ensena-muted">{b.activeUsers.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-ensena-ink">{b.newSignups.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
