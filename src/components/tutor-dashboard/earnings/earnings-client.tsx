"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, Info, Users2, Wallet } from "lucide-react";

import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { ENSENA_COMMISSION_PCT, splitEarnings } from "@/lib/commission";
import { formatNaira } from "@/lib/format";
import {
  earnings3MonthTrend,
  earningsMonthlyTrend,
  earningsPageOverview,
  earningsTransactions,
  earningsWeeklyTrend,
  incomeByLessonType,
  type EarningsTransaction,
  type EarningsTrendPoint,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const rangeOptions = ["This Week", "This Month", "Last 3 Months"] as const;
type Range = (typeof rangeOptions)[number];

const trendByRange: Record<Range, EarningsTrendPoint[]> = {
  "This Week": earningsWeeklyTrend,
  "This Month": earningsMonthlyTrend,
  "Last 3 Months": earnings3MonthTrend,
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// Simple inline SVG line/area chart — matches this codebase's existing
// convention of hand-rolled charts (no charting library anywhere in the
// app) rather than introducing a new dependency for one page.
function EarningsChart({ points }: { points: EarningsTrendPoint[] }) {
  const width = 800;
  const height = 220;
  const paddingLeft = 60;
  const paddingBottom = 24;
  const paddingTop = 12;
  const chartWidth = width - paddingLeft - 12;
  const chartHeight = height - paddingBottom - paddingTop;

  const maxRaw = Math.max(...points.map((p) => p.amount), 1);
  const step = Math.ceil(maxRaw / 5 / 1000) * 1000 || 1000;
  const maxValue = step * 5;
  const gridValues = [0, 1, 2, 3, 4, 5].map((i) => step * i);

  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: paddingLeft + i * stepX,
    y: paddingTop + chartHeight - (p.amount / maxValue) * chartHeight,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const floorY = paddingTop + chartHeight;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${floorY} L ${coords[0].x.toFixed(1)} ${floorY} Z`;

  const labelCount = Math.min(5, points.length);
  const labelIndices = Array.from(
    new Set(Array.from({ length: labelCount }, (_, i) => Math.round((i * (points.length - 1)) / (labelCount - 1 || 1))))
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-56 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ensena-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--ensena-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridValues.map((g) => {
        const y = paddingTop + chartHeight - (g / maxValue) * chartHeight;
        return (
          <g key={g}>
            <line x1={paddingLeft} y1={y} x2={width - 4} y2={y} stroke="#EEF1F5" strokeWidth="1" />
            <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{formatNaira(g)}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#earningsFill)" />
      <path d={linePath} fill="none" stroke="var(--ensena-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="var(--ensena-primary)" />
      ))}
      {labelIndices.map((idx) => (
        <text key={idx} x={coords[idx].x} y={height - 4} textAnchor="middle" fontSize="11" fill="#94A3B8">
          {points[idx].label}
        </text>
      ))}
    </svg>
  );
}

function TransactionAvatar({ tx }: { tx: EarningsTransaction }) {
  if (tx.type === "Group Class") {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <Users2 className="size-4.5" />
      </span>
    );
  }
  return tx.image ? (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
      <Image src={tx.image} alt={tx.name} fill sizes="40px" className="object-cover" />
    </div>
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">
      {initials(tx.name)}
    </span>
  );
}

const statusStyles: Record<EarningsTransaction["status"], string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
};

// MVP Earnings: overview + breakdown chart + income-by-lesson-type +
// transactions + withdraw. No revenue forecast, top-paying-students,
// per-subject tables, or AI insights — those were removed, not hidden,
// since none of them survive the mockup and nothing else on the site reads
// that data.
export function EarningsClient() {
  const [range, setRange] = useState<Range>("This Month");

  const monthlySplit = splitEarnings(earningsPageOverview.monthlyGross);
  const trend = trendByRange[range];

  const totalIncomeByType = incomeByLessonType.reduce((s, x) => s + x.amount, 0);
  const donutSegments = useMemo(() => {
    return incomeByLessonType.reduce<{ item: (typeof incomeByLessonType)[number]; dash: number; offset: number }[]>((acc, item) => {
      const dash = (item.amount / totalIncomeByType) * 100;
      const previousOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      return [...acc, { item, dash, offset: previousOffset }];
    }, []);
  }, [totalIncomeByType]);

  const withdrawLink = "/tutor-dashboard/earnings?tab=Withdrawals";

  return (
    <div>
      <TutorTopBar
        primaryAction={
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Earnings</h1>
            <p className="mt-1 text-sm text-ensena-muted">Track your tutoring income and withdrawals.</p>
          </div>
        }
      />

      <div className="lg:hidden">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Earnings</h1>
        <p className="mt-1 text-sm text-ensena-muted">Track your tutoring income and withdrawals.</p>
      </div>

      {/* Mobile: pink hero balance card with embedded Withdraw */}
      <div className="mt-4 rounded-2xl bg-rose-50 p-5 lg:hidden">
        <p className="text-sm font-medium text-ensena-ink">Available Balance</p>
        <p className="mt-1 font-heading text-3xl font-bold text-ensena-ink">{formatNaira(earningsPageOverview.availableBalance)}</p>
        <p className="mt-1 text-xs text-ensena-muted">Available to withdraw</p>
        <Link
          href={withdrawLink}
          className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
        >
          <Wallet className="size-4" /> Withdraw
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Users2 className="size-4" /></span>
          <p className="mt-2 text-xs text-ensena-muted">This Month</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(monthlySplit.net)}</p>
          <p className="text-[11px] text-ensena-muted">After 20% commission</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Users2 className="size-4" /></span>
          <p className="mt-2 text-xs text-ensena-muted">Total Earned</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(earningsPageOverview.totalEarnedNet)}</p>
          <p className="text-[11px] text-ensena-muted">All-time tutor earnings</p>
        </div>
      </div>

      {/* Desktop: three equal cards + Withdraw button */}
      <div className="mt-5 hidden items-stretch gap-4 lg:flex">
        <div className="flex flex-1 items-center justify-between rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div>
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Wallet className="size-4.5" /></span>
            <p className="mt-3 text-sm text-ensena-muted">Available Balance</p>
            <p className="font-heading text-2xl font-semibold text-ensena-ink">{formatNaira(earningsPageOverview.availableBalance)}</p>
            <p className="text-xs text-ensena-muted">Available to withdraw</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Users2 className="size-4.5" /></span>
          <p className="mt-3 text-sm text-ensena-muted">This Month</p>
          <p className="font-heading text-2xl font-semibold text-ensena-ink">{formatNaira(monthlySplit.net)}</p>
          <p className="text-xs text-ensena-muted">After 20% commission</p>
        </div>
        <div className="flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Users2 className="size-4.5" /></span>
          <p className="mt-3 text-sm text-ensena-muted">Total Earned</p>
          <p className="font-heading text-2xl font-semibold text-ensena-ink">{formatNaira(earningsPageOverview.totalEarnedNet)}</p>
          <p className="text-xs text-ensena-muted">All-time tutor earnings</p>
        </div>
        <Link
          href={withdrawLink}
          className="flex h-full shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-ensena-primary px-8 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
        >
          <Wallet className="size-4" /> Withdraw
        </Link>
      </div>

      {/* Earnings Breakdown */}
      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
            Earnings Breakdown <Info className="size-3.5 text-ensena-muted" aria-label="Shows your gross earnings over the selected period, before commission." />
          </h2>
          <span className="flex items-center gap-1 rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink">
            {range} <ChevronDown className="size-3.5 text-ensena-muted" />
          </span>
        </div>

        <div className="mt-4 flex w-fit gap-1 rounded-full border border-ensena-border p-1 text-xs">
          {rangeOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn("rounded-full px-3.5 py-1.5 font-medium", range === r ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "text-ensena-muted hover:text-ensena-ink")}
            >
              {r}
            </button>
          ))}
        </div>

        <EarningsChart points={trend} />

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-ensena-bg-soft p-3 text-sm sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-ensena-border sm:p-0">
          <div className="flex flex-1 items-center justify-between gap-2 sm:px-4 sm:py-3">
            <div>
              <p className="text-xs text-ensena-muted">Gross Earnings</p>
              <p className="font-semibold text-ensena-ink">{formatNaira(monthlySplit.gross)}</p>
            </div>
            <ChevronRight className="hidden size-4 shrink-0 text-ensena-muted sm:block" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2 sm:px-4 sm:py-3">
            <div>
              <p className="text-xs text-ensena-muted">Ensena Commission ({ENSENA_COMMISSION_PCT}%)</p>
              <p className="font-semibold text-rose-600">-{formatNaira(monthlySplit.commission)}</p>
            </div>
            <ChevronRight className="hidden size-4 shrink-0 text-ensena-muted sm:block" />
          </div>
          <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-2.5 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-3">
            <p className="text-xs text-ensena-muted">Your Earnings (After Commission)</p>
            <p className="font-semibold text-emerald-700">{formatNaira(monthlySplit.net)}</p>
          </div>
        </div>
      </div>

      {/* Income by Lesson Type */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
          Income by Lesson Type <Info className="size-3.5 text-ensena-muted" aria-label="Breakdown of your earnings after commission, by lesson type." />
        </h2>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <svg viewBox="0 0 42 42" className="size-40 shrink-0 -rotate-90">
            <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#F1F5F9" strokeWidth="6" />
            {donutSegments.map(({ item, dash, offset }) => (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="transparent"
                stroke={item.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-offset}
              />
            ))}
          </svg>
          <div className="flex w-full flex-1 flex-col gap-3">
            {incomeByLessonType.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-ensena-ink">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /> {item.label}
                </p>
                <p className="font-semibold text-ensena-ink">{formatNaira(item.amount)}</p>
                <p className="w-10 shrink-0 text-right text-ensena-muted">{item.pct}%</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ensena-border pt-4">
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Total Tutor Earnings <span className="font-normal text-ensena-muted">(After Commission)</span></p>
            <p className="text-xs text-ensena-muted">Earnings shown are after Ensena&apos;s {ENSENA_COMMISSION_PCT}% commission.</p>
          </div>
          <p className="font-heading text-xl font-semibold text-emerald-700">{formatNaira(totalIncomeByType)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Transactions</h2>

        {/* Desktop table */}
        <div className="mt-3 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-3 font-medium">Student / Class</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 text-right font-medium">Gross Amount</th>
                <th className="py-2 pr-3 text-right font-medium">Ensena Commission ({ENSENA_COMMISSION_PCT}%)</th>
                <th className="py-2 pr-3 text-right font-medium">Tutor Earnings ({100 - ENSENA_COMMISSION_PCT}%)</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {earningsTransactions.map((tx) => {
                const split = splitEarnings(tx.gross);
                return (
                  <tr key={tx.id} className="border-b border-ensena-border last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <TransactionAvatar tx={tx} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ensena-ink">{tx.name}</p>
                          <p className="text-xs text-ensena-muted">{tx.type}{tx.meta ? ` · ${tx.meta}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-ensena-muted">
                      <p>{tx.date}</p>
                      <p className="text-xs">{tx.time}</p>
                    </td>
                    <td className="py-3 pr-3 text-right text-ensena-ink">{formatNaira(split.gross)}</td>
                    <td className="py-3 pr-3 text-right text-rose-600">-{formatNaira(split.commission)}</td>
                    <td className="py-3 pr-3 text-right font-semibold text-ensena-ink">{formatNaira(split.net)}</td>
                    <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyles[tx.status])}>{tx.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-3 flex flex-col gap-3 lg:hidden">
          {earningsTransactions.map((tx) => {
            const split = splitEarnings(tx.gross);
            return (
              <div key={tx.id} className="rounded-2xl border border-ensena-border p-4">
                <div className="flex items-center gap-3">
                  <TransactionAvatar tx={tx} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ensena-ink">{tx.name}</p>
                    <p className="text-xs text-ensena-muted">{tx.type}{tx.meta ? ` · ${tx.meta}` : ""}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyles[tx.status])}>{tx.status}</span>
                </div>
                <p className="mt-2 text-xs text-ensena-muted">{tx.date} · {tx.time}</p>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between"><span className="text-ensena-muted">Gross</span><span className="text-ensena-ink">{formatNaira(split.gross)}</span></div>
                  <div className="flex justify-between"><span className="text-ensena-muted">Ensena Commission</span><span className="text-rose-600">-{formatNaira(split.commission)}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-ensena-ink">You Earned</span><span className="text-emerald-700">{formatNaira(split.net)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
