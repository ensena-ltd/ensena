"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Calendar,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Star,
  Users,
  Video,
  Wallet,
} from "lucide-react";

import { useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { Button } from "@/components/ui/button";
import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { useTutorRating } from "@/hooks/use-reviews";
import { BirthdayCelebration } from "@/components/shared/birthday/birthday-celebration";
import { TutorImportantUpdatesBanner } from "@/components/tutor-dashboard/important-updates-banner";
import { TutorPendingReviewsBanner } from "@/components/tutor-dashboard/pending-reviews-banner";
import {
  dashboardMessages,
  dashboardTutor,
  earningsOverview,
  initialMyGroupClasses,
  quickStats,
  slugifyTitle,
  students,
  todaySchedule,
} from "@/lib/tutor-dashboard-data";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const upcomingClasses = [
  { day: "MON", date: "19", month: "AUG", title: "Mathematics", meta: "Private · Chinedu K.", time: "7:00 PM – 8:00 PM", duration: "60 min" },
  { day: "TUE", date: "20", month: "AUG", title: "WAEC Mathematics Prep", meta: "Group Class", time: "6:00 PM – 7:30 PM", duration: "90 min" },
  { day: "WED", date: "21", month: "AUG", title: "Mathematics", meta: "Private · Amina S.", time: "7:00 PM – 8:00 PM", duration: "60 min" },
  { day: "THU", date: "22", month: "AUG", title: "Mathematics", meta: "Private · David O.", time: "7:00 PM – 8:00 PM", duration: "60 min" },
];

const recentActivity = [
  { icon: Calendar, iconClass: "bg-indigo-100 text-indigo-600", title: "New booking confirmed", description: "A new student booked a session", time: "2h ago" },
  { icon: Users, iconClass: "bg-emerald-100 text-emerald-600", title: "Payment received", description: `${formatNaira(12000)} earned from a student`, time: "3h ago" },
  { icon: Star, iconClass: "bg-amber-100 text-amber-600", title: "New 5-star review", description: "A student left you a review", time: "1d ago" },
  { icon: Calendar, iconClass: "bg-indigo-100 text-indigo-600", title: "Lesson rescheduled", description: "A student moved their session to a new time", time: "2d ago" },
  { icon: Wallet, iconClass: "bg-amber-100 text-amber-600", title: "Withdrawal processed", description: `${formatNaira(35000)} sent to your bank account`, time: "3d ago" },
];

const teachingTips = [
  "Break complex topics into smaller steps. Check in with your students often to make sure they're understanding.",
  "Start each session by reviewing what was covered last time. It helps retention stick.",
  "Ask students to explain a concept back to you; it's the fastest way to spot gaps.",
];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function parseTimeToMinutes(label: string): number | null {
  const match = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function useCountdownLabels(times: string[]): (string | null)[] {
  const [labels, setLabels] = useState<(string | null)[]>(() => times.map(() => null));

  useEffect(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // The real "now" only exists client-side — computing it during render
    // would mismatch the server-rendered markup, so it's applied here,
    // post-mount, same pattern as useSavedTutor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabels(
      times.map((t) => {
        const target = parseTimeToMinutes(t);
        if (target === null) return null;
        const diff = target - nowMinutes;
        if (diff <= 0) return "In progress";
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `In ${h}h ${m}m` : `In ${m}m`;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return labels;
}

export function TutorDashboardClient() {
  const me = useTutorIdentity();
  const firstName = me.firstName;
  const rating = useTutorRating(me.name, me.id ? 0 : dashboardTutor.rating, me.id ? 0 : dashboardTutor.reviews);
  // A real tutor's teaching stats start at zero until lessons are recorded.
  const teachingStats = me.id
    ? { studentsTaught: 0, lessonsTaught: 0, repeatStudentsPct: 0, cancellationRatePct: 0 }
    : dashboardTutor;
  const countdowns = useCountdownLabels(todaySchedule.map((s) => s.time));
  const totalUpcoming = students.reduce((sum, s) => sum + s.upcomingLessons, 0);
  const availableBalance = quickStats.find((s) => s.label === "Available Balance")?.value ?? formatNaira(0);
  const myGroupClasses = initialMyGroupClasses.filter((c) => c.status === "Live").slice(0, 2);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const visibleActivity = activityExpanded ? recentActivity : recentActivity.slice(0, 3);
  const [tipIndex, setTipIndex] = useState(0);

  const statCards = [
    { icon: Calendar, iconClass: "bg-violet-100 text-violet-700 border-violet-200", cardClass: "bg-violet-50/60 border-violet-100", label: "Today's Classes", value: String(todaySchedule.length), linkLabel: "View today's schedule", href: "/tutor-dashboard/private-lessons?tab=Calendar" },
    { icon: CalendarDays, iconClass: "bg-blue-100 text-blue-700 border-blue-200", cardClass: "bg-blue-50/60 border-blue-100", label: "Upcoming Classes", value: String(totalUpcoming), linkLabel: "View calendar", href: "/tutor-dashboard/private-lessons?tab=Calendar" },
    { icon: Users, iconClass: "bg-emerald-100 text-emerald-700 border-emerald-200", cardClass: "bg-emerald-50/60 border-emerald-100", label: "Total Students", value: String(students.length), linkLabel: "View all students", href: "/tutor-dashboard/students" },
    { icon: Wallet, iconClass: "bg-amber-100 text-amber-700 border-amber-200", cardClass: "bg-amber-50/60 border-amber-100", label: "This Month's Earnings", value: formatNaira(earningsOverview.total), linkLabel: "View earnings", href: "/tutor-dashboard/earnings" },
  ];

  const earningsBreakdown = [
    { label: "Private Lessons", value: earningsOverview.completedLessons, dot: "bg-violet-500" },
    { label: "Group Classes", value: earningsOverview.groupClasses, dot: "bg-emerald-500" },
    ...(earningsOverview.bonuses > 0 ? [{ label: "Bonuses", value: earningsOverview.bonuses, dot: "bg-amber-500" }] : []),
  ];

  return (
    <>
      <TutorTopBar
        primaryAction={
          <Link
            href={me.id ? "/tutor-dashboard/profile?tab=Preview Profile" : "/find-teachers/tunde-adebayo"}
            target="_blank"
            className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            View public profile <ExternalLink className="size-3.5" />
          </Link>
        }
      />

      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Good morning, {firstName} 👋</h1>
      <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your teaching today.</p>

      <BirthdayCelebration firstName={firstName} role="tutor" dob={me.dob} />

      <TutorImportantUpdatesBanner />
      <TutorPendingReviewsBanner />

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn("rounded-2xl border p-4", stat.cardClass)}>
              <span className={cn("flex size-9 items-center justify-center rounded-xl border", stat.iconClass)}>
                <Icon className="size-4.5" />
              </span>
              <p className="mt-3 text-sm text-ensena-ink">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
              <Link href={stat.href} className="mt-1 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                {stat.linkLabel} <ChevronRight className="size-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Today's Classes + Upcoming Classes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Classes</h2>
                <Link href="/tutor-dashboard/private-lessons?tab=Calendar" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View full schedule <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                {todaySchedule.map((item, i) => (
                  <div key={item.time} className={cn("flex items-center gap-3 py-3.5", i === 0 && "pt-0")}>
                    <div className="w-16 shrink-0 text-sm font-semibold text-ensena-ink">{item.time}</div>
                    {item.type === "Group" ? (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                        <Users className="size-5" />
                      </span>
                    ) : (
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-ensena-bg-soft">
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-ensena-ink">
                          {initials(item.student)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ensena-ink">
                        {item.type === "Group" ? item.student : item.subject.split(" · ")[0]}
                      </p>
                      {item.type !== "Group" && <p className="truncate text-xs text-ensena-muted">{item.student}</p>}
                      <p className="text-xs text-ensena-muted">
                        {item.type} · Online{item.enrolled ? ` · ${item.enrolled}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {countdowns[i] && (
                        <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">
                          {countdowns[i]}
                        </span>
                      )}
                      <Button
                        nativeButton={false}
                        render={<Link href="/tutor-dashboard/private-lessons?tab=Calendar" />}
                        className="h-8 rounded-full border border-ensena-primary bg-white px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                      >
                        <Video className="size-3.5" /> Enter Class
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/tutor-dashboard/private-lessons?tab=Calendar"
                className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
              >
                View full schedule <ChevronRight className="size-3.5" />
              </Link>
            </div>

            <div className="hidden rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:block">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Classes</h2>
                <Link href="/tutor-dashboard/private-lessons?tab=Calendar" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View calendar <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {upcomingClasses.map((c) => (
                  <div key={`${c.date}-${c.title}`} className="flex items-center gap-3">
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-rose-50 py-1 text-rose-600">
                      <span className="text-[9px] font-semibold uppercase">{c.day}</span>
                      <span className="text-sm font-bold leading-none">{c.date}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ensena-ink">{c.title}</p>
                      <p className="truncate text-xs text-ensena-muted">{c.meta}</p>
                      <p className="text-xs text-ensena-muted">{c.time}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-medium text-ensena-ink">
                      {c.duration}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/tutor-dashboard/private-lessons?tab=Calendar"
                className="mt-4 flex h-9 w-full items-center justify-center gap-1 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                View full calendar <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Messages + Group Classes + Performance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Messages</h2>
                <Link href="/tutor-dashboard/messages" className="text-xs font-semibold text-ensena-primary hover:underline">
                  View all messages
                </Link>
              </div>
              <ul className="mt-4 flex flex-col gap-3.5">
                {dashboardMessages.slice(0, 3).map((msg) => (
                  <li key={msg.id} className="flex items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-xs font-semibold text-ensena-ink">
                      {initials(msg.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ensena-ink">{msg.name}</p>
                        <span className="shrink-0 text-[11px] text-ensena-muted">{msg.time}</span>
                      </div>
                      <p className="truncate text-xs text-ensena-muted">{msg.preview}</p>
                    </div>
                    {msg.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-primary" />}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">My Group Classes</h2>
                <Link href="/tutor-dashboard/private-lessons?tab=Group Classes" className="text-xs font-semibold text-ensena-primary hover:underline">
                  View all classes
                </Link>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {myGroupClasses.map((c) => {
                  const seatsPct = Math.round((c.seatsFilled / c.seatsTotal) * 100);
                  return (
                    <div key={c.id} className="rounded-xl border border-ensena-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: c.color }}
                          >
                            <Users className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                            <p className="truncate text-xs text-ensena-muted">{c.schedule.split(" · ")[0]}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-ensena-success/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-success">
                          Active
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-ensena-muted">{c.seatsFilled} / {c.seatsTotal} students</span>
                        <span className="font-semibold text-ensena-ink">{formatNaira(c.price)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ensena-border">
                        <div className="h-full rounded-full bg-ensena-success" style={{ width: `${seatsPct}%` }} />
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <Link
                          href={`/tutor-dashboard/group-classes/${slugifyTitle(c.title)}`}
                          className="flex h-8 flex-1 items-center justify-center rounded-full border border-ensena-primary text-[11px] font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                        >
                          Manage Class
                        </Link>
                        <Link
                          href={`/tutor-dashboard/classroom/group/${c.id}`}
                          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-full border border-ensena-border text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                        >
                          <Video className="size-3" /> Enter
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Performance</h2>
                <Link href="/tutor-dashboard/analytics" className="hidden text-xs font-semibold text-ensena-primary hover:underline sm:block">
                  View performance
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Star className="size-5 fill-amber-500 text-amber-500" />
                </span>
                <div>
                  <p className="font-heading text-xl font-semibold text-ensena-ink">{rating.rating}</p>
                  <p className="text-xs text-ensena-muted">Tutor Rating</p>
                </div>
                <p className="ml-auto text-xs text-ensena-muted">{rating.reviews} reviews</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ensena-border pt-4 text-sm">
                <div>
                  <p className="text-xs text-ensena-muted">Students taught</p>
                  <p className="font-semibold text-ensena-ink">{teachingStats.studentsTaught}</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Lessons taught</p>
                  <p className="font-semibold text-ensena-ink">{teachingStats.lessonsTaught}{me.id ? "" : "+"}</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Repeat students</p>
                  <p className="font-semibold text-ensena-ink">{teachingStats.repeatStudentsPct}%</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Cancellation rate</p>
                  <p className="font-semibold text-ensena-ink">{teachingStats.cancellationRatePct}%</p>
                </div>
              </div>
              <Link
                href="/tutor-dashboard/analytics"
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline sm:hidden"
              >
                View performance <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Earnings Overview</h2>
              <span className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 text-xs font-medium text-ensena-ink">
                This Month
              </span>
            </div>
            <p className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">{formatNaira(earningsOverview.total)}</p>
            <p className="text-xs text-ensena-muted">Total earnings</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {earningsBreakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ensena-muted">
                    <span className={cn("size-2 rounded-full", row.dot)} /> {row.label}
                  </span>
                  <span className="font-medium text-ensena-ink">{formatNaira(row.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-ensena-success/10 p-3">
              <p className="text-xs text-ensena-muted">Available to withdraw</p>
              <p className="font-heading text-lg font-semibold text-ensena-success">{availableBalance}</p>
              <Button
                nativeButton={false}
                render={<Link href="/tutor-dashboard/withdrawals" />}
                className="mt-2 h-9 w-full rounded-full border border-ensena-success bg-white text-xs font-semibold text-ensena-success hover:bg-ensena-success/10"
              >
                <Banknote className="size-3.5" /> Withdraw Earnings
              </Button>
            </div>
            <Link href="/tutor-dashboard/earnings" className="mt-3 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
              View earnings details <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="hidden rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:block">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Activity</h2>
            <div className="mt-4 flex flex-col gap-4">
              {visibleActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.title} className="flex items-start gap-3">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", activity.iconClass)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ensena-ink">{activity.title}</p>
                      <p className="text-xs text-ensena-muted">{activity.description}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ensena-muted">{activity.time}</span>
                  </div>
                );
              })}
            </div>
            {recentActivity.length > 3 && (
              <button
                type="button"
                onClick={() => setActivityExpanded((v) => !v)}
                className="mt-4 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline"
              >
                {activityExpanded ? "Show less" : "View all activity"} <ChevronRight className={cn("size-3 transition-transform", activityExpanded && "rotate-90")} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Teaching tip */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600">
            <Lightbulb className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Teaching Tip of the Day</p>
            <p className="text-xs text-ensena-muted">{teachingTips[tipIndex]}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setTipIndex((i) => (i + 1) % teachingTips.length)}
          className="h-9 shrink-0 rounded-full border-indigo-200 bg-white px-4 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
        >
          View more tips
        </Button>
      </div>
    </>
  );
}
