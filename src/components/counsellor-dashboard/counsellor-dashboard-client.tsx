"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  ClipboardList,
  MessageCircle,
  Phone,
  Plus,
  Star,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  actionPlansOverview,
  appointmentRequests,
  counsellorProfile,
  recentCounsellorMessages,
  studentLevelBreakdown,
  todaysSchedule,
  topConcernsThisMonth,
  upcomingFollowUps,
} from "@/lib/counsellor-dashboard-data";

const stats = [
  { label: "Today's Sessions", value: 4, hint: "View schedule", icon: Calendar },
  { label: "Pending Requests", value: 6, hint: "Review requests", icon: Users },
  { label: "Completed This Week", value: 18, hint: "View report", icon: ClipboardList },
  { label: "Average Rating", value: "4.98", hint: "From 128 reviews", icon: Star },
  { label: "Active Students", value: 96, hint: "View all students", icon: Users },
  { label: "Sessions This Month", value: 42, hint: "↑ 24% vs last month", icon: TrendingUp },
];

export function CounsellorDashboardClient() {
  const totalStudents = studentLevelBreakdown.reduce((sum, s) => sum + s.value, 0);
  const donutSegments = studentLevelBreakdown.reduce<{ item: (typeof studentLevelBreakdown)[number]; dash: number; offset: number }[]>((acc, item) => {
    const dash = (item.value / totalStudents) * 100;
    const previousOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    return [...acc, { item, dash, offset: previousOffset }];
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Good morning, {counsellorProfile.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your counselling sessions today.</p>
        </div>
        <div className="flex gap-2">
          <Button className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white">
            <Plus className="size-4" /> New Appointment
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/counsellor-dashboard/appointments" />}
            className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
          >
            <Calendar className="size-4" /> View Calendar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
              <s.icon className="size-4" />
            </span>
            <p className="mt-2 text-xs text-ensena-muted">{s.label}</p>
            <p className="text-xl font-semibold text-ensena-ink">{s.value}</p>
            <p className="mt-0.5 text-xs text-ensena-primary">{s.hint} →</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <Calendar className="size-4.5 text-ensena-primary" /> Today&apos;s Schedule
            </h2>
            <Link href="/counsellor-dashboard/appointments" className="text-xs font-medium text-ensena-primary">View full calendar</Link>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {todaysSchedule.map((s) => (
              <li key={s.id} className="rounded-xl border border-ensena-border p-3">
                <div className="flex items-start gap-3">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
                    <Image src={s.studentImage} alt={s.student} fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ensena-muted">{s.time}</p>
                    <p className="truncate text-sm font-semibold text-ensena-ink">{s.student}</p>
                    <p className="text-xs text-ensena-muted">{s.level} · {s.reason}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-medium text-ensena-ink">
                      {s.sessionType === "Video Call" ? <Video className="size-3" /> : <Phone className="size-3" />} {s.sessionType}
                    </span>
                  </div>
                  <Button className="h-8 shrink-0 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">Join Session</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Appointment Requests</h2>
            <span className="text-xs font-medium text-ensena-primary">View all</span>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {appointmentRequests.map((r) => (
              <li key={r.id} className="rounded-xl border border-ensena-border p-3">
                <div className="flex items-start gap-3">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
                    <Image src={r.studentImage} alt={r.student} fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{r.student}</p>
                    <p className="text-xs text-ensena-muted">{r.level} · {r.reason}</p>
                    <p className="text-xs text-ensena-muted">Requested {r.requestedDate}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button className="h-8 flex-1 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">Accept</Button>
                  <Button variant="outline" className="h-8 flex-1 rounded-full border-ensena-border text-xs font-medium">Suggest Time</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Student Overview</h2>
          </div>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative shrink-0">
              <svg viewBox="0 0 42 42" className="size-28 -rotate-90">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-ensena-ink">{totalStudents}</p>
                <p className="text-[10px] text-ensena-muted">Total Students</p>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs">
              {studentLevelBreakdown.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5 text-ensena-ink">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
                  <span className="text-ensena-muted">({s.value})</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-ensena-border p-3">
              <p className="text-xs text-ensena-muted">Follow-ups Due</p>
              <p className="text-lg font-semibold text-ensena-primary">14</p>
            </div>
            <div className="rounded-xl border border-ensena-border p-3">
              <p className="text-xs text-ensena-muted">At Risk Students</p>
              <p className="text-lg font-semibold text-rose-600">9</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <ClipboardList className="size-4.5 text-ensena-primary" /> Student Insights Summary
            </h2>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700">High Impact</p>
            <p className="mt-0.5 text-xs text-emerald-700">18 students are improving well. Consider encouraging them to stay consistent.</p>
          </div>
          <div className="mt-2.5 rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700">Needs Attention</p>
            <p className="mt-0.5 text-xs text-amber-700">9 students show signs of academic struggle. Consider scheduling follow-up sessions.</p>
          </div>
          <p className="mt-3 text-xs font-semibold text-ensena-ink">Top Concerns This Month</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ensena-muted">
            {topConcernsThisMonth.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2">
                <span>{c.label}</span>
                <span className="font-medium text-ensena-ink">{c.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Target className="size-4.5 text-ensena-primary" /> Action Plans Overview
          </h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative size-16 shrink-0">
              <svg viewBox="0 0 42 42" className="size-16 -rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#F1F5F9" strokeWidth="6" />
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#6C63FF" strokeWidth="6" strokeDasharray={`${actionPlansOverview.progressPct} ${100 - actionPlansOverview.progressPct}`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ensena-ink">{actionPlansOverview.progressPct}%</div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Plans in Progress</p>
              <p className="text-xs text-ensena-muted">{actionPlansOverview.inProgress} of {actionPlansOverview.totalStudents} students</p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            <li className="flex justify-between"><span className="text-ensena-muted">Completed This Week</span><span className="font-semibold text-ensena-success">{actionPlansOverview.completedThisWeek}</span></li>
            <li className="flex justify-between"><span className="text-ensena-muted">Overdue</span><span className="font-semibold text-rose-600">{actionPlansOverview.overdue}</span></li>
            <li className="flex justify-between"><span className="text-ensena-muted">Updates Needed</span><span className="font-semibold text-amber-600">{actionPlansOverview.updatesNeeded}</span></li>
            <li className="flex justify-between"><span className="text-ensena-muted">No Plan Yet</span><span className="font-semibold text-ensena-muted">{actionPlansOverview.noPlanYet}</span></li>
          </ul>
          <Link href="/counsellor-dashboard/action-plans" className="mt-3 block text-xs font-medium text-ensena-primary">Manage Action Plans →</Link>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <MessageCircle className="size-4.5 text-ensena-primary" /> Recent Messages
            </h2>
            <Link href="/counsellor-dashboard/messages" className="text-xs font-medium text-ensena-primary">View all</Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {recentCounsellorMessages.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
                  <Image src={m.studentImage} alt={m.student} fill sizes="32px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ensena-ink">{m.student}</p>
                  <p className="truncate text-xs text-ensena-muted">{m.preview}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-ensena-muted">{m.time}</p>
                  {m.unread && (
                    <span className="mt-0.5 inline-flex size-4 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">
                      {m.unread}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Follow-ups</h2>
            <span className="text-xs font-medium text-ensena-primary">View all</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {upcomingFollowUps.map((f) => (
              <li key={f.student} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                <span className="font-medium text-ensena-ink">{f.student}</span>
                <span className="text-xs text-ensena-muted">{f.date}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-primary/5 p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Counsellor Notes</h2>
          <p className="mt-1 text-xs text-ensena-muted">You have 7 private notes that require your attention.</p>
          <Link href="/counsellor-dashboard/students" className="mt-3 block text-xs font-medium text-ensena-primary">View Notes →</Link>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-6">
        <span className="text-3xl text-ensena-primary/30">&ldquo;</span>
        <p className="text-sm text-ensena-ink">Every student has potential; sometimes they just need the right guidance to see it.</p>
      </div>
    </div>
  );
}
