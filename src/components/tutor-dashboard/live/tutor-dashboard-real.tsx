"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Calendar,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Plus,
  Star,
  Users,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BirthdayCelebration } from "@/components/shared/birthday/birthday-celebration";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { formatTime, formatTimeRange, greeting, monthDay, platformISODate } from "@/components/student-dashboard/live/learning-utils";
import { PersonAvatar, useLiveNow } from "@/components/student-dashboard/live/live-shared";
import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { dismissTutorNotification } from "@/lib/actions/tutor-dashboard";
import { canEnterClassroom, getClassEntryState, TUTOR_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { formatNaira } from "@/lib/format";
import type { TutorDashboardSnapshot, TutorNotificationRow, TutorSession } from "@/lib/tutor-dashboard-server";
import { cn } from "@/lib/utils";

const SCHEDULE_HREF = "/tutor-dashboard/private-lessons?tab=Calendar";
const GROUP_CLASSES_HREF = "/tutor-dashboard/group-classes";

const kindLabel: Record<TutorSession["kind"], string> = {
  private: "Private",
  group: "Group",
  discovery: "Discovery",
};

const teachingTips = [
  "Break complex topics into smaller steps. Check in with your students often to make sure they're understanding.",
  "Start each session by reviewing what was covered last time. It helps retention stick.",
  "Ask students to explain a concept back to you; it's the fastest way to spot gaps.",
  "End every lesson with one clear takeaway and one small task to practise before next time.",
  "Share materials in the classroom before the lesson starts so students can follow along from minute one.",
];

const activityStyle: Record<string, { icon: LucideIcon; className: string }> = {
  Booking: { icon: Calendar, className: "bg-indigo-100 text-indigo-600" },
  Payments: { icon: Wallet, className: "bg-emerald-100 text-emerald-600" },
  Review: { icon: Star, className: "bg-amber-100 text-amber-600" },
  Message: { icon: MessageSquare, className: "bg-sky-100 text-sky-600" },
};
const defaultActivityStyle = { icon: Bell, className: "bg-ensena-bg-soft text-ensena-ink" };

function timeAgo(atMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - atMs) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function untilLabel(s: TutorSession, nowMs: number): string | null {
  if (s.status === "completed") return "Completed";
  if (nowMs >= s.endMs) return "Ended";
  if (nowMs >= s.startMs) return "In progress";
  const minutes = Math.round((s.startMs - nowMs) / 60_000);
  const h = Math.floor(minutes / 60);
  return h > 0 ? `In ${h}h ${minutes % 60}m` : `In ${minutes}m`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-ensena-bg-soft px-4 py-6 text-center text-sm text-ensena-muted">{children}</p>;
}

export function TutorDashboardReal({ data }: { data: TutorDashboardSnapshot }) {
  const me = useTutorIdentity();
  const nowMs = useLiveNow(data.generatedAtMs);
  const todayISO = platformISODate(nowMs);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const active = data.sessions.filter((s) => s.status !== "cancelled");
  const todays = active.filter((s) => platformISODate(s.startMs) === todayISO);
  const upcoming = active.filter((s) => s.status === "scheduled" && s.endMs > nowMs);
  const laterUpcoming = upcoming.filter((s) => platformISODate(s.startMs) > todayISO).slice(0, 4);

  const notifications = data.notifications.filter((n) => !dismissedIds.includes(n.id));
  const bookingAlert = notifications.find((n) => n.category === "Booking" && n.unread);
  const visibleActivity = activityExpanded ? notifications : notifications.slice(0, 3);

  const { earnings, performance } = data;

  function dismiss(n: TutorNotificationRow) {
    setDismissedIds((ids) => [...ids, n.id]);
    startTransition(async () => {
      const result = await dismissTutorNotification(n.id);
      if (!result.ok) {
        setDismissedIds((ids) => ids.filter((id) => id !== n.id));
        toast.error(result.message ?? "Couldn't dismiss that update.");
      }
    });
  }

  const statCards = [
    { icon: Calendar, iconClass: "bg-violet-100 text-violet-700 border-violet-200", cardClass: "bg-violet-50/60 border-violet-100", label: "Today's Classes", value: String(todays.length), linkLabel: "View today's schedule", href: SCHEDULE_HREF },
    { icon: CalendarDays, iconClass: "bg-blue-100 text-blue-700 border-blue-200", cardClass: "bg-blue-50/60 border-blue-100", label: "Upcoming Classes", value: String(upcoming.length), linkLabel: "View calendar", href: SCHEDULE_HREF },
    { icon: Users, iconClass: "bg-emerald-100 text-emerald-700 border-emerald-200", cardClass: "bg-emerald-50/60 border-emerald-100", label: "Total Students", value: String(data.totalStudents), linkLabel: "View all students", href: "/tutor-dashboard/students" },
    { icon: Wallet, iconClass: "bg-amber-100 text-amber-700 border-amber-200", cardClass: "bg-amber-50/60 border-amber-100", label: "This Month's Earnings", value: formatNaira(earnings.monthNet), linkLabel: "View earnings", href: "/tutor-dashboard/earnings" },
  ];

  const earningsBreakdown = [
    { label: "Private Lessons", value: earnings.monthPrivateNet, dot: "bg-violet-500" },
    { label: "Group Classes", value: earnings.monthGroupNet, dot: "bg-emerald-500" },
  ];

  return (
    <>
      <TutorTopBar
        live={{ notifications: data.notifications, unreadNotifications: data.unreadNotifications, unreadMessages: data.unreadMessages }}
        primaryAction={
          <Link
            href="/tutor-dashboard/profile?tab=Preview Profile"
            target="_blank"
            className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            View public profile <ExternalLink className="size-3.5" />
          </Link>
        }
      />

      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">
        {greeting(nowMs)}, {me.firstName} 👋
      </h1>
      <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your teaching today.</p>

      <BirthdayCelebration firstName={me.firstName} role="tutor" dob={me.dob} />

      {bookingAlert && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ensena-ink">Booking update</p>
            <p className="mt-0.5 text-sm text-ensena-ink">{bookingAlert.text}</p>
            {bookingAlert.actionUrl && (
              <Link href={bookingAlert.actionUrl} className="mt-1.5 inline-block text-sm font-semibold text-ensena-primary hover:underline">
                View booking
              </Link>
            )}
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(bookingAlert)} className="shrink-0 rounded-full p-1 text-ensena-muted hover:bg-amber-100">
            <X className="size-4" />
          </button>
        </div>
      )}

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
                <Link href={SCHEDULE_HREF} className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View full schedule <ChevronRight className="size-3" />
                </Link>
              </div>
              {todays.length === 0 ? (
                <div className="mt-4">
                  <EmptyState>No classes scheduled for today.</EmptyState>
                </div>
              ) : (
                <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                  {todays.map((item, i) => {
                    const state = getClassEntryState({ startMs: item.startMs, endMs: item.endMs, role: "tutor", nowMs });
                    const enterable = item.status === "scheduled" && canEnterClassroom(state);
                    const label = untilLabel(item, nowMs);
                    return (
                      <div key={`${item.kind}-${item.id}`} className={cn("flex items-center gap-3 py-3.5", i === 0 && "pt-0")}>
                        <div className="w-16 shrink-0 text-sm font-semibold text-ensena-ink">{formatTime(item.startMs)}</div>
                        {item.kind === "group" ? (
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                            <Users className="size-5" />
                          </span>
                        ) : (
                          <PersonAvatar name={item.withLabel} image={item.studentImage} className="size-11" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{item.title}</p>
                          <p className="truncate text-xs text-ensena-muted">{item.withLabel}</p>
                          <p className="text-xs text-ensena-muted">
                            {kindLabel[item.kind]} · {item.mode} · {item.durationMinutes} min
                            {item.kind === "private" && !item.paid && <span className="font-medium text-amber-600"> · Awaiting payment</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {label && (
                            <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">{label}</span>
                          )}
                          {enterable ? (
                            <Button
                              nativeButton={false}
                              render={<Link href={item.classroomHref} />}
                              className="h-8 rounded-full border border-ensena-primary bg-white px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                            >
                              <Video className="size-3.5" /> Enter Class
                            </Button>
                          ) : state === "too-early" ? (
                            <span className="text-[11px] text-ensena-muted">{entryOpensHint(item.startMs - TUTOR_ENTRY_WINDOW_MS, nowMs)}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:block">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Classes</h2>
                <Link href={SCHEDULE_HREF} className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View calendar <ChevronRight className="size-3" />
                </Link>
              </div>
              {laterUpcoming.length === 0 ? (
                <div className="mt-4">
                  <EmptyState>Nothing booked after today yet.</EmptyState>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {laterUpcoming.map((c) => {
                    const { month, day } = monthDay(c.startMs);
                    return (
                      <div key={`${c.kind}-${c.id}`} className="flex items-center gap-3">
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-rose-50 py-1 text-rose-600">
                          <span className="text-[9px] font-semibold uppercase">{month}</span>
                          <span className="text-sm font-bold leading-none">{day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ensena-ink">{c.title}</p>
                          <p className="truncate text-xs text-ensena-muted">
                            {kindLabel[c.kind]} · {c.withLabel}
                          </p>
                          <p className="text-xs text-ensena-muted">{formatTimeRange(c)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-medium text-ensena-ink">{c.durationMinutes} min</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                href={SCHEDULE_HREF}
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
              {data.messages.length === 0 ? (
                <div className="mt-4">
                  <EmptyState>No messages yet.</EmptyState>
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-3.5">
                  {data.messages.map((msg) => (
                    <li key={msg.id}>
                      <Link href="/tutor-dashboard/messages" className="flex items-start gap-2.5 rounded-lg hover:bg-ensena-bg-soft">
                        <PersonAvatar name={msg.name} image={msg.image} className="size-8 text-xs" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-ensena-ink">{msg.name}</p>
                            <span className="shrink-0 text-[11px] text-ensena-muted">{timeAgo(msg.atMs, nowMs)}</span>
                          </div>
                          <p className="truncate text-xs text-ensena-muted">{msg.preview}</p>
                        </div>
                        {msg.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-primary" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">My Group Classes</h2>
                <Link href={GROUP_CLASSES_HREF} className="text-xs font-semibold text-ensena-primary hover:underline">
                  View all classes
                </Link>
              </div>
              {data.groupClasses.length === 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  <EmptyState>You have no active group classes.</EmptyState>
                  <Link
                    href={GROUP_CLASSES_HREF}
                    className="flex h-9 items-center justify-center gap-1 rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                  >
                    <Plus className="size-3.5" /> Create a group class
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {data.groupClasses.slice(0, 2).map((c) => {
                    const seatsPct = c.seatsTotal > 0 ? Math.min(100, Math.round((c.seatsFilled / c.seatsTotal) * 100)) : 0;
                    return (
                      <div key={c.id} className="rounded-xl border border-ensena-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
                              <Users className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                              <p className="truncate text-xs text-ensena-muted">
                                {c.nextSessionMs ? `Next: ${monthDay(c.nextSessionMs).month} ${monthDay(c.nextSessionMs).day}, ${formatTime(c.nextSessionMs)}` : c.scheduleLine || c.subject}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-ensena-success/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-success">Active</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-ensena-muted">
                            {c.seatsFilled} / {c.seatsTotal} students
                          </span>
                          <span className="font-semibold text-ensena-ink">{formatNaira(c.price)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ensena-border">
                          <div className="h-full rounded-full bg-ensena-success" style={{ width: `${seatsPct}%` }} />
                        </div>
                        <div className="mt-2.5 flex gap-1.5">
                          <Link
                            href={`/tutor-dashboard/group-classes/${c.slug}`}
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
              )}
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
                  <p className="font-heading text-xl font-semibold text-ensena-ink">{performance.rating ?? "–"}</p>
                  <p className="text-xs text-ensena-muted">Tutor Rating</p>
                </div>
                <p className="ml-auto text-xs text-ensena-muted">
                  {performance.reviewCount} {performance.reviewCount === 1 ? "review" : "reviews"}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ensena-border pt-4 text-sm">
                <div>
                  <p className="text-xs text-ensena-muted">Students taught</p>
                  <p className="font-semibold text-ensena-ink">{performance.studentsTaught}</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Lessons taught</p>
                  <p className="font-semibold text-ensena-ink">{performance.lessonsTaught}</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Repeat students</p>
                  <p className="font-semibold text-ensena-ink">{performance.repeatStudentsPct}%</p>
                </div>
                <div>
                  <p className="text-xs text-ensena-muted">Cancellation rate</p>
                  <p className="font-semibold text-ensena-ink">{performance.cancellationRatePct}%</p>
                </div>
              </div>
              <Link href="/tutor-dashboard/analytics" className="mt-2 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline sm:hidden">
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
              <span className="flex items-center gap-1 rounded-full border border-ensena-border px-2.5 py-1 text-xs font-medium text-ensena-ink">This Month</span>
            </div>
            <p className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">{formatNaira(earnings.monthNet)}</p>
            <p className="text-xs text-ensena-muted">Total earnings (after commission)</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {earningsBreakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ensena-muted">
                    <span className={cn("size-2 rounded-full", row.dot)} /> {row.label}
                  </span>
                  <span className="font-medium text-ensena-ink">{formatNaira(row.value)}</span>
                </div>
              ))}
              {earnings.pendingClearance > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ensena-muted">
                    <span className="size-2 rounded-full bg-amber-500" /> Pending confirmation
                  </span>
                  <span className="font-medium text-ensena-ink">{formatNaira(earnings.pendingClearance)}</span>
                </div>
              )}
              {earnings.frozen > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ensena-muted">
                    <span className="size-2 rounded-full bg-rose-500" /> On hold (disputed)
                  </span>
                  <span className="font-medium text-ensena-ink">{formatNaira(earnings.frozen)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 rounded-xl bg-ensena-success/10 p-3">
              <p className="text-xs text-ensena-muted">Available to withdraw</p>
              <p className="font-heading text-lg font-semibold text-ensena-success">{formatNaira(earnings.available)}</p>
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
            {notifications.length === 0 ? (
              <div className="mt-4">
                <EmptyState>No activity yet. Bookings, payments and reviews will show up here.</EmptyState>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {visibleActivity.map((activity) => {
                  const style = activityStyle[activity.category] ?? defaultActivityStyle;
                  const Icon = style.icon;
                  const body = (
                    <>
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.className)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ensena-ink">{activity.category || "Update"}</p>
                        <p className="text-xs text-ensena-muted">{activity.text}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-ensena-muted">{timeAgo(activity.createdAtMs, nowMs)}</span>
                    </>
                  );
                  return activity.actionUrl ? (
                    <Link key={activity.id} href={activity.actionUrl} className="flex items-start gap-3 rounded-lg hover:bg-ensena-bg-soft">
                      {body}
                    </Link>
                  ) : (
                    <div key={activity.id} className="flex items-start gap-3">
                      {body}
                    </div>
                  );
                })}
              </div>
            )}
            {notifications.length > 3 && (
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
          Next tip
        </Button>
      </div>
    </>
  );
}
