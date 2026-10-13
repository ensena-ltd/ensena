"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/admin/admin-analytics-client";
import { getConversionFunnelForWindow } from "@/lib/conversion-funnel";
import { subscribePageViews } from "@/lib/page-analytics-store";
import { subscribeSignupEvents } from "@/lib/signup-events-store";
import { subscribePaymentPlans } from "@/lib/payment-plans-store";
import { subscribePrivateLessons } from "@/lib/private-lessons-store";

const windowOptions = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function useAnalyticsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const unsubs = [subscribePageViews(bump), subscribeSignupEvents(bump), subscribePaymentPlans(bump), subscribePrivateLessons(bump)];
    return () => unsubs.forEach((u) => u());
  }, []);
  return version;
}

// The top-of-funnel view: Views -> Signups -> Bookings -> Payments, each a
// real count from its own real store (conversion-funnel.ts) for the same
// window — every stage's drop-off is computed from the stage before it,
// never a hardcoded/assumed ratio.
export function ConversionFunnelSection() {
  const [windowDays, setWindowDays] = useState(30);
  const version = useAnalyticsVersion();

  const funnel = useMemo(
    () => getConversionFunnelForWindow(windowDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is an intentional recompute trigger, not a data input
    [windowDays, version]
  );

  const stages: { key: keyof typeof funnel; label: string }[] = [
    { key: "views", label: "Views" },
    { key: "signups", label: "Signups" },
    { key: "bookings", label: "Bookings" },
    { key: "payments", label: "Payments" },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Conversion Funnel</h2>
        <div className="flex gap-1 rounded-xl border border-ensena-border bg-ensena-surface p-1">
          {windowOptions.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setWindowDays(w.days)}
              className={
                windowDays === w.days
                  ? "rounded-lg bg-ensena-primary px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-lg px-3 py-1.5 text-xs font-semibold text-ensena-muted hover:text-ensena-ink"
              }
            >
              Last {w.label}
            </button>
          ))}
        </div>
      </div>

      <Card title="Views to Payments" className="mt-3">
        <p className="-mt-1 mb-4 text-xs text-ensena-muted">
          How visitors move from browsing the site to a completed payment, over the last {windowDays} days.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
          {stages.map((stage, i) => {
            const value = funnel[stage.key];
            const previousValue = i > 0 ? funnel[stages[i - 1].key] : null;
            const dropOffPct = previousValue && previousValue > 0 ? Math.round((value / previousValue) * 100) : null;
            return (
              <div key={stage.key} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-4 text-center">
                  <p className="text-xs font-medium text-ensena-muted">{stage.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-ensena-ink">{value.toLocaleString()}</p>
                  {dropOffPct !== null && <p className="mt-0.5 text-[11px] text-ensena-muted">{dropOffPct}% of {stages[i - 1].label.toLowerCase()}</p>}
                </div>
                {i < stages.length - 1 && <ArrowRight className="hidden size-4 shrink-0 text-ensena-muted sm:block" />}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
