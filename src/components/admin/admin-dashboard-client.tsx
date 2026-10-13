"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  GraduationCap,
  MessageSquare,
  Users2,
} from "lucide-react";

import { demoAccounts } from "@/lib/demo-auth";
import type { AdminDashboardLive } from "@/lib/admin-registrations";
import {
  dashboardBookingsOverview,
  dashboardRecentActivity,
  overviewCards,
  pendingActionsOverview,
  userDistributionByCountry,
  userDistributionByState,
  userGrowthTrend,
  type ActivityTone,
  type PendingActionItem,
} from "@/lib/admin-dashboard-widgets";
import { cn } from "@/lib/utils";

const admin = demoAccounts.find((a) => a.role === "Admin")!;

function relativeTime(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function niceMax(values: number[]) {
  const max = Math.max(0, ...values);
  if (max <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / step) * step;
}

const activityToneStyles: Record<ActivityTone, string> = {
  success: "bg-emerald-100 text-emerald-600",
  info: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-ensena-primary/10 text-ensena-primary",
  gray: "bg-slate-100 text-slate-600",
};

const activityIcon: Record<ActivityTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Calendar,
  purple: DollarSign,
  pink: Users2,
  gray: MessageSquare,
};

const toneStyles: Record<PendingActionItem["tone"], { iconBg: string; button: string }> = {
  rose: { iconBg: "bg-rose-100 text-rose-600", button: "bg-rose-500 hover:bg-rose-600" },
  orange: { iconBg: "bg-orange-100 text-orange-600", button: "bg-orange-500 hover:bg-orange-600" },
  amber: { iconBg: "bg-amber-100 text-amber-600", button: "bg-amber-500 hover:bg-amber-600" },
  blue: { iconBg: "bg-blue-100 text-blue-600", button: "bg-blue-500 hover:bg-blue-600" },
};

const pendingActionIcons: Record<string, typeof GraduationCap> = {
  "Tutor Verifications": Users2,
  "Group Class Approvals": ClipboardList,
  "Pending Accounts": Users2,
  "Counselling Appointments": CalendarCheck,
  "Guardian Consent": Users2,
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 100;
  const height = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;
  const gradId = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-10 w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// `live` = real numbers from Supabase (see loadAdminDashboard in
// src/lib/admin-registrations.ts); without it (demo mode) the static demo
// widgets are shown.
export function AdminDashboardClient({ live = null }: { live?: AdminDashboardLive | null } = {}) {
  const [range, setRange] = useState("This Month");
  const [distributionTab, setDistributionTab] = useState<"country" | "state">("country");

  const firstName = (live?.adminName || admin.name).split(" ")[0];

  const studentsCard = live ? live.students : { total: overviewCards.students.total, newThisMonth: overviewCards.students.newThisMonth, spark: overviewCards.students.spark };
  const tutorsCard = live ? live.tutors : { total: overviewCards.tutors.total, newThisMonth: overviewCards.tutors.newThisMonth, spark: overviewCards.tutors.spark };
  const pendingOverview: { total: number; items: (PendingActionItem & { caption?: string })[] } = live ? live.pending : pendingActionsOverview;
  const bookingsOverview = live
    ? {
        total: live.bookings.total,
        segments: [
          { label: "Upcoming", count: live.bookings.upcoming, color: "#3B82F6" },
          { label: "Completed", count: live.bookings.completed, color: "#22C55E" },
          { label: "Cancelled", count: live.bookings.cancelled, color: "#F43F5E" },
        ],
      }
    : dashboardBookingsOverview;
  const bookingsSpark = live ? live.bookings.spark : [8, 10, 9, 12, 11, 14, 13, 16, 15, 18];
  const growth = live ? (range === "This Year" ? live.growth.year : live.growth.month) : userGrowthTrend;
  // Month view has a label per day — show ~6 evenly spaced ones.
  const growthLabels = live
    ? growth.labels.filter((_, i, all) => all.length <= 7 || i % Math.ceil(all.length / 6) === 0 || i === all.length - 1).map((l) => (range === "This Year" ? l : `${l} ${new Date().toLocaleDateString("en-GB", { month: "short" })}`))
    : userGrowthTrend.labels;
  const activityItems = live
    ? live.activity.map((a) => ({ id: a.id, tone: a.tone, title: a.title, detail: a.detail, time: relativeTime(a.at) }))
    : dashboardRecentActivity;

  // User Growth dual-line chart
  const chartWidth = 640;
  const chartHeight = 200;
  const maxVal = live ? niceMax([...growth.students, ...growth.tutors]) : 1500; // demo: 0 / 300 / … / 1.5k axis
  const gridLines = [0, 1, 2, 3, 4, 5].map((i) => (maxVal / 5) * i);
  function toPoints(series: number[]) {
    return series.map((v, i) => {
      const x = series.length > 1 ? (i / (series.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - (v / maxVal) * chartHeight;
      return { x, y };
    });
  }
  const studentPoints = toPoints(growth.students);
  const tutorPoints = toPoints(growth.tutors);
  const studentPath = studentPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const tutorPath = tutorPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // User Distribution donut
  const rawDistribution = live
    ? distributionTab === "country"
      ? live.distribution.byRole
      : live.distribution.tutorsByCountry
    : distributionTab === "country"
      ? userDistributionByCountry
      : userDistributionByState;
  const distributionTotal = rawDistribution.reduce((sum, d) => sum + d.count, 0);
  const distributionList = rawDistribution.map((d) => ({ ...d, pct: distributionTotal ? Math.round((d.count / distributionTotal) * 1000) / 10 : 0 }));
  const circumference = 2 * Math.PI * 15.9;
  const distributionSegments = distributionList.reduce<{ label: string; color: string; count: number; pct: number; dash: number; offset: number }[]>((acc, seg) => {
    const dash = (seg.pct / 100) * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    return [...acc, { ...seg, dash, offset }];
  }, []);

  return (
    <div>
      <div>
        <h2 className="font-heading text-xl font-semibold text-ensena-ink">Welcome back, {firstName}! 👋</h2>
        <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening on Enseña today.</p>
      </div>

      {/* Overview cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
            <GraduationCap className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-ensena-ink">Students</p>
          <p className="mt-1 font-heading text-2xl font-bold text-ensena-ink">{studentsCard.total.toLocaleString()}</p>
          <p className="text-xs text-ensena-muted">Total Students</p>
          <p className="mt-1.5 text-xs font-semibold text-emerald-600">
            +{studentsCard.newThisMonth.toLocaleString()} this month{studentsCard.newThisMonth > 0 ? " ↑" : ""}
          </p>
          <Sparkline values={studentsCard.spark} color="#F80248" />
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <Users2 className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-ensena-ink">Tutors</p>
          <p className="mt-1 font-heading text-2xl font-bold text-ensena-ink">{tutorsCard.total.toLocaleString()}</p>
          <p className="text-xs text-ensena-muted">Total Tutors</p>
          <p className="mt-1.5 text-xs font-semibold text-emerald-600">
            +{tutorsCard.newThisMonth.toLocaleString()} this month{tutorsCard.newThisMonth > 0 ? " ↑" : ""}
          </p>
          <Sparkline values={tutorsCard.spark} color="#8B5CF6" />
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <ClipboardList className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-ensena-ink">Pending Actions</p>
          <p className="mt-1 font-heading text-2xl font-bold text-ensena-ink">{pendingOverview.total}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ensena-muted">Requires Attention</p>
            <Link href="#pending-actions" className="text-xs font-semibold text-ensena-primary hover:underline">View all →</Link>
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {pendingOverview.items.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ensena-ink">
                  <span className={cn("size-1.5 rounded-full", toneStyles[item.tone].button)} />
                  {item.label}
                </span>
                <span className="font-semibold text-ensena-ink">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Calendar className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-ensena-ink">Bookings</p>
          <p className="mt-1 font-heading text-2xl font-bold text-ensena-ink">{bookingsOverview.total.toLocaleString()}</p>
          <p className="text-xs text-ensena-muted">Total Bookings</p>
          <Sparkline values={bookingsSpark} color="#3B82F6" />
          <ul className="mt-2 flex flex-col gap-1">
            {bookingsOverview.segments.map((seg) => (
              <li key={seg.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ensena-ink">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  {seg.label}
                </span>
                <span className="font-semibold text-ensena-ink">{seg.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Growth | User Distribution | Recent Activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-ensena-ink">User Growth</h2>
              <p className="text-xs text-ensena-muted">({live ? range : "This Month"}{live ? " · new sign-ups" : ""})</p>
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)} className="h-8 rounded-full border border-ensena-border px-2.5 text-xs">
              {(live ? ["This Month", "This Year"] : ["This Month", "Last Month", "This Year"]).map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ensena-ink"><span className="size-2 rounded-full bg-ensena-primary" /> Students</span>
            <span className="flex items-center gap-1.5 text-ensena-ink"><span className="size-2 rounded-full bg-violet-500" /> Tutors</span>
          </div>
          <div className="relative mt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-44 w-full overflow-visible" preserveAspectRatio="none">
              {gridLines.map((g) => (
                <line key={g} x1="0" x2={chartWidth} y1={chartHeight - (g / maxVal) * chartHeight} y2={chartHeight - (g / maxVal) * chartHeight} stroke="#EAECEF" strokeWidth="1" />
              ))}
              <polyline points={studentPath} fill="none" stroke="var(--ensena-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={tutorPath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-ensena-muted">
              {growthLabels.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">User Distribution</h2>
          <div className="mt-2 flex gap-4 border-b border-ensena-border text-sm font-medium">
            <button
              type="button"
              onClick={() => setDistributionTab("country")}
              className={cn("border-b-2 pb-2 transition-colors", distributionTab === "country" ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
            >
              {live ? "By Role" : "By Country"}
            </button>
            <button
              type="button"
              onClick={() => setDistributionTab("state")}
              className={cn("border-b-2 pb-2 transition-colors", distributionTab === "state" ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
            >
              {live ? "Tutors by Country" : "By State (Nigeria)"}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 42 42" className="size-28 shrink-0 -rotate-90">
              <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#EAECEF" strokeWidth="6" />
              {distributionSegments.map((seg) => (
                <circle
                  key={seg.label}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="6"
                  strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                  strokeDashoffset={-seg.offset}
                />
              ))}
              <text x="21" y="19" textAnchor="middle" className="fill-ensena-ink font-heading" style={{ fontSize: "6px", fontWeight: 700, transform: "rotate(90deg)", transformOrigin: "21px 21px" }}>
                {distributionTotal.toLocaleString()}
              </text>
              <text x="21" y="25" textAnchor="middle" className="fill-ensena-muted" style={{ fontSize: "3.5px", transform: "rotate(90deg)", transformOrigin: "21px 21px" }}>
                Users
              </text>
            </svg>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
              {distributionList.length === 0 && <p className="text-ensena-muted">No data yet.</p>}
              {distributionList.map((seg) => (
                <p key={seg.label} className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="min-w-0 flex-1 truncate text-ensena-ink">{seg.label}</span>
                  <span className="shrink-0 text-ensena-muted">{seg.count.toLocaleString()} ({seg.pct}%)</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Activity</h2>
            <Link href="/admin/audit-logs" className="text-xs font-medium text-ensena-primary hover:underline">View all →</Link>
          </div>
          <ul className="mt-3 flex flex-col gap-3.5">
            {activityItems.length === 0 && <li className="text-sm text-ensena-muted">No activity yet.</li>}
            {activityItems.map((a) => {
              const Icon = activityIcon[a.tone];
              return (
                <li key={a.id} className="flex items-start gap-2.5">
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", activityToneStyles[a.tone])}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ensena-ink">{a.title}</p>
                      <span className="shrink-0 text-[11px] text-ensena-muted">{a.time}</span>
                    </div>
                    <p className="truncate text-xs text-ensena-muted">{a.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/admin/audit-logs" className="mt-3 flex items-center justify-center text-sm font-semibold text-ensena-primary hover:underline">
            View all activity →
          </Link>
        </div>
      </div>

      {/* Pending Actions */}
      <div id="pending-actions" className="mt-6 scroll-mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Pending Actions</h2>
          <Link href="/admin/verification" className="text-sm font-semibold text-ensena-primary hover:underline">View all pending →</Link>
        </div>
        <div className={cn("mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2", pendingOverview.items.length > 4 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
          {pendingOverview.items.map((item) => {
            const Icon = pendingActionIcons[item.label] ?? ClipboardList;
            const tone = toneStyles[item.tone];
            const caption =
              item.caption ??
              (item.label === "Tutor Verifications" ? "awaiting review" :
              item.label === "Group Class Approvals" ? "awaiting approval" :
              item.label === "Pending Accounts" ? "awaiting action" :
              "today");
            return (
              <div key={item.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <div className={cn("flex size-11 items-center justify-center rounded-full", tone.iconBg)}>
                  <Icon className="size-5" />
                </div>
                <p className="mt-3 font-heading text-2xl font-bold text-ensena-ink">{item.count}</p>
                <p className="text-sm font-semibold text-ensena-ink">{item.label}</p>
                <p className="text-xs text-ensena-muted">{caption}</p>
                <Link
                  href={item.href}
                  className={cn("mt-3 flex h-9 w-full items-center justify-center rounded-full text-sm font-semibold text-white", tone.button)}
                >
                  {item.actionLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
