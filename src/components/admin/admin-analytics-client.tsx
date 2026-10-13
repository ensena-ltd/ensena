"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  CalendarPlus,
  GraduationCap,
  MapPin,
  School,
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";

import {
  analyticsDataByRange,
  analyticsRangeLabels,
  countriesBreakdown,
  platformActivityRows,
  recentSignups,
  statesByCountry,
  userStatusBreakdown,
  userTypeShare,
  type AnalyticsRange,
  type AnalyticsUserType,
} from "@/lib/admin-analytics-data";
import { counsellingDashboardStats } from "@/lib/admin-counselling-data";
import { groupClassStats } from "@/lib/admin-group-classes-data";
import { tutorVerificationSummaryStats } from "@/lib/admin-tutor-verification-data";
import { cn } from "@/lib/utils";
import { ConversionFunnelSection } from "@/components/admin/analytics/conversion-funnel-section";
import { PageAnalyticsSection } from "@/components/admin/analytics/page-analytics-section";
import { PlatformOverviewSection } from "@/components/admin/analytics/platform-overview-section";

const ranges: AnalyticsRange[] = ["7d", "30d", "90d"];
const userTypes: AnalyticsUserType[] = ["All Users", "Students", "Tutors"];

const toneStyles: Record<string, { dot: string; text: string }> = {
  success: { dot: "bg-emerald-500", text: "text-emerald-700" },
  warning: { dot: "bg-amber-500", text: "text-amber-700" },
  danger: { dot: "bg-orange-500", text: "text-orange-700" },
  muted: { dot: "bg-rose-500", text: "text-rose-700" },
};

const statusHref: Record<string, string> = {
  Active: "/admin/users",
  Pending: "/admin/users",
  Restricted: "/admin/users?tab=Restricted",
  Banned: "/admin/users?tab=Banned",
};

export function Card({ title, icon: Icon, action, children, className }: { title: string; icon?: typeof Users; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
          {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

function scaleForType(base: number, userType: AnalyticsUserType): number {
  if (userType === "All Users") return base;
  return Math.max(0, Math.round(base * userTypeShare[userType]));
}

export function AdminAnalyticsClient() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [locationUserType, setLocationUserType] = useState<AnalyticsUserType>("All Users");
  const [selectedCountry, setSelectedCountry] = useState("Nigeria");

  const data = analyticsDataByRange[range];
  const { overview, signupActivity, signupActivityGranularity } = data;
  const weeklyTotalStudents = signupActivity.reduce((s, r) => s + r.students, 0);
  const weeklyTotalTutors = signupActivity.reduce((s, r) => s + r.tutors, 0);

  const overviewCards = [
    { label: "Total Signups", value: overview.totalSignups, delta: overview.totalSignupsDeltaPct, icon: Users, tint: "bg-purple-100 text-purple-600" },
    { label: "Students", value: overview.students, delta: overview.studentsDeltaPct, icon: GraduationCap, tint: "bg-blue-100 text-blue-600" },
    { label: "Tutors", value: overview.tutors, delta: overview.tutorsDeltaPct, icon: UserCheck, tint: "bg-emerald-100 text-emerald-600" },
    { label: "New This Week", value: overview.newThisWeek, delta: overview.newThisWeekDeltaPct, icon: CalendarPlus, tint: "bg-amber-100 text-amber-600", sub: "vs previous week" },
    { label: "New This Month", value: overview.newThisMonth, delta: overview.newThisMonthDeltaPct, icon: Calendar, tint: "bg-rose-100 text-rose-600", sub: "vs previous month" },
  ];

  const states = statesByCountry[selectedCountry] ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ensena-muted">Track user growth, platform activity and where your users are coming from.</p>
        </div>
        <label className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsRange)}
            className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm font-medium text-ensena-ink"
          >
            {ranges.map((r) => <option key={r} value={r}>{analyticsRangeLabels[r]}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <PlatformOverviewSection />
        <PageAnalyticsSection />
        <ConversionFunnelSection />
      </div>

      <div className="mt-8 border-t border-ensena-border pt-6">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Signups &amp; Platform Activity</h2>
        <p className="mt-1 text-xs text-ensena-muted">Growth and activity across every part of the platform.</p>
      </div>

      {/* Overview cards */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {overviewCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <div className={cn("flex size-10 items-center justify-center rounded-full", c.tint)}>
              <c.icon className="size-5" />
            </div>
            <p className="mt-2.5 text-xs font-medium text-ensena-muted">{c.label}</p>
            <p className="text-2xl font-semibold text-ensena-ink">{c.value.toLocaleString()}</p>
            <p className="text-xs font-medium text-ensena-success">↑ {c.delta}% <span className="font-normal text-ensena-muted">{c.sub ?? `vs previous ${analyticsRangeLabels[range].toLowerCase()}`}</span></p>
          </div>
        ))}
      </div>

      {/* Signup Activity | User Status | Platform Activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr_1.2fr]">
        <Card title="Signup Activity">
          <p className="-mt-1 mb-3 text-xs text-ensena-muted">{signupActivityGranularity === "Daily" ? "Daily" : "Weekly"} signups for the selected period.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-3 font-medium">{signupActivityGranularity === "Daily" ? "Date" : "Week"}</th>
                  <th className="py-2 pr-3 text-right font-medium">Students</th>
                  <th className="py-2 pr-3 text-right font-medium">Tutors</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {signupActivity.map((row) => (
                  <tr key={row.label} className="border-b border-ensena-border text-sm last:border-0">
                    <td className="py-2.5 pr-3 text-ensena-ink">{row.label}</td>
                    <td className="py-2.5 pr-3 text-right text-ensena-muted">{row.students}</td>
                    <td className="py-2.5 pr-3 text-right text-ensena-muted">{row.tutors}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ensena-ink">{row.students + row.tutors}</td>
                  </tr>
                ))}
                <tr className="bg-ensena-bg-soft text-sm font-semibold text-ensena-ink">
                  <td className="rounded-l-lg py-2.5 pr-3">Total {signupActivityGranularity === "Daily" ? "this week" : "this period"}</td>
                  <td className="py-2.5 pr-3 text-right">{weeklyTotalStudents}</td>
                  <td className="py-2.5 pr-3 text-right">{weeklyTotalTutors}</td>
                  <td className="rounded-r-lg py-2.5 pr-3 text-right">{weeklyTotalStudents + weeklyTotalTutors}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="User Status">
          <ul className="flex flex-col gap-3">
            {userStatusBreakdown.map((s) => {
              const tone = toneStyles[s.tone];
              return (
                <li key={s.status}>
                  <Link href={statusHref[s.status] ?? "/admin/users"} className="flex items-center justify-between gap-2 rounded-xl px-1 py-1 hover:bg-ensena-bg-soft">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={cn("size-2.5 shrink-0 rounded-full", tone.dot)} />
                      <span className="font-medium text-ensena-ink">{s.status}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold text-ensena-ink">{s.count.toLocaleString()}</span>
                      <span className="block text-[11px] text-ensena-muted">{s.pct}%</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/admin/users" className="mt-3 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View all users →</Link>
        </Card>

        <Card title="Platform Activity">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-2 font-medium">Activity</th>
                  <th className="py-2 pr-2 text-right font-medium">Week</th>
                  <th className="py-2 pr-2 text-right font-medium">Month</th>
                </tr>
              </thead>
              <tbody>
                {platformActivityRows.map((r) => (
                  <tr key={r.label} className="border-b border-ensena-border text-xs last:border-0">
                    <td className="py-2 pr-2 text-ensena-ink">{r.label}</td>
                    <td className="py-2 pr-2 text-right text-ensena-muted">{r.thisWeek}</td>
                    <td className="py-2 pr-2 text-right font-medium text-ensena-ink">{r.thisMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/admin/dashboard" className="mt-3 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View full activity report →</Link>
        </Card>
      </div>

      {/* User Location | Counselling | Tutor Verification | Group Classes */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr_1fr_1fr]">
        <Card
          title="User Location"
          icon={MapPin}
          action={
            <div className="flex gap-2">
              <select value={locationUserType} onChange={(e) => setLocationUserType(e.target.value as AnalyticsUserType)} className="h-8 rounded-lg border border-ensena-border px-2 text-xs">
                {userTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="h-8 rounded-lg border border-ensena-border px-2 text-xs">
                {countriesBreakdown.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
              </select>
            </div>
          }
        >
          <p className="-mt-1 mb-3 text-xs text-ensena-muted">See where Enseña users are joining from.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Users by Country</p>
              <ul className="mt-2 flex flex-col gap-2">
                {countriesBreakdown.map((c) => (
                  <li key={c.country}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-ensena-ink">{c.flag} {c.country}</span>
                      <span className="font-medium text-ensena-ink">{scaleForType(c.users, locationUserType).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${c.pct}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Users by State / Region ({selectedCountry})</p>
              {states.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {states.map((s) => {
                    const max = states[0].users;
                    return (
                      <li key={s.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ensena-ink">{s.name}</span>
                          <span className="font-medium text-ensena-ink">{scaleForType(s.users, locationUserType).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary/70" style={{ width: `${(s.users / max) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ensena-muted">No detailed region data yet for {selectedCountry}.</p>
              )}
            </div>
          </div>
          <Link href="/admin/users" className="mt-4 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View all countries →</Link>
        </Card>

        <Card title="Counselling" icon={Calendar}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-ensena-muted">Sessions This Month</dt><dd className="font-semibold text-ensena-ink">{counsellingDashboardStats.completedThisMonth}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Upcoming Sessions</dt><dd className="font-semibold text-ensena-ink">{counsellingDashboardStats.upcomingNext7Days}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Completed Sessions</dt><dd className="font-semibold text-ensena-ink">{counsellingDashboardStats.completedThisMonth}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Follow-ups Scheduled</dt><dd className="font-semibold text-ensena-ink">{counsellingDashboardStats.followUpsDue}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">New Intake Forms</dt><dd className="font-semibold text-ensena-ink">{counsellingDashboardStats.newBookings}</dd></div>
          </dl>
          <Link href="/admin/counsellors" className="mt-4 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View Counselling →</Link>
        </Card>

        <Card title="Tutor Verification" icon={ShieldCheck}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-ensena-muted">Pending</dt><dd className="font-semibold text-ensena-ink">{tutorVerificationSummaryStats.pending}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Approved This Month</dt><dd className="font-semibold text-ensena-ink">{tutorVerificationSummaryStats.approvedThisMonth}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Rejected</dt><dd className="font-semibold text-ensena-ink">{tutorVerificationSummaryStats.rejected}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Resubmission Required</dt><dd className="font-semibold text-ensena-ink">{tutorVerificationSummaryStats.resubmissionRequired}</dd></div>
          </dl>
          <Link href="/admin/verification" className="mt-4 inline-flex text-xs font-semibold text-ensena-primary hover:underline">Review pending tutors →</Link>
        </Card>

        <Card title="Group Classes" icon={School}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-ensena-muted">Pending Approval</dt><dd className="font-semibold text-ensena-ink">{groupClassStats.pendingApproval}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Approved</dt><dd className="font-semibold text-ensena-ink">{groupClassStats.approved}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Rejected</dt><dd className="font-semibold text-ensena-ink">{groupClassStats.rejected}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Active Classes</dt><dd className="font-semibold text-ensena-ink">{groupClassStats.live}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Students Enrolled</dt><dd className="font-semibold text-ensena-ink">{groupClassStats.studentsEnrolled}</dd></div>
          </dl>
          <Link href="/admin/group-classes" className="mt-4 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View group classes →</Link>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card title="Recent Signups" icon={UserPlus} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((u) => (
                <tr key={u.name} className="border-b border-ensena-border text-sm last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={u.image} alt={u.name} fill sizes="32px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", u.type === "Tutor" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>{u.type}</span>
                  </td>
                  <td className="py-2.5 pr-4 flex items-center gap-1 text-ensena-muted"><MapPin className="size-3.5" /> {u.location}</td>
                  <td className="py-2.5 pr-4 text-ensena-muted">{u.joinedAgo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/admin/users" className="mt-3 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View all signups →</Link>
      </Card>
    </div>
  );
}
