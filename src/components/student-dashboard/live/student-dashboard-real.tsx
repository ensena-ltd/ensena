"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  ClipboardList,
  GraduationCap,
  Heart,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Users2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { BirthdayCelebration } from "@/components/shared/birthday/birthday-celebration";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { GuardianDetailsCard } from "@/components/student-dashboard/guardian-details-card";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { confirmLessonCompleted, reportLessonIssue } from "@/lib/actions/student-learning";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { complaintReasons, disputeReasons, formatCountdown } from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { buildStudentAccountMenuItems } from "@/lib/student-dashboard-data";
import type { CompletedLesson, LearningSession, RecommendedTutor, StudentLearningSnapshot } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import {
  formatShortDate,
  formatTime,
  formatTimeRange,
  greeting,
  isUpcoming,
  kindBadge,
  kindLabel,
  monthDay,
  needsPayment,
  platformISODate,
  relativeDay,
  tasksDueOn,
  weekBounds,
} from "./learning-utils";
import { AddTaskForm, PersonAvatar, TaskCheckboxList, useLiveNow, useStudyTasks } from "./live-shared";

const PLANNER_HREF = "/student-dashboard/lessons?tab=Study%20Planner";

function entryHint(s: LearningSession, nowMs: number): ReactNode {
  if (needsPayment(s)) return "Payment required to join this session";
  const state = getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs });
  if (state === "too-early") return entryOpensHint(s.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs);
  return undefined;
}

function canEnter(s: LearningSession, nowMs: number): boolean {
  return !needsPayment(s) && canEnterClassroom(getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs }));
}

const detailsHref = (s: LearningSession) => `/student-dashboard/lessons?view=${s.id}`;

export function StudentDashboardReal({ data }: { data: StudentLearningSnapshot }) {
  const me = useStudentIdentity();
  const nowMs = useLiveNow(data.generatedAtMs);
  const { tasks, toggle, add, remove } = useStudyTasks(data.studyTasks);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reviewsDismissed, setReviewsDismissed] = useState(false);
  const accountMenuItems = buildStudentAccountMenuItems(data.hasCounselling);

  const todayISO = platformISODate(nowMs);
  const upcoming = data.sessions.filter((s) => isUpcoming(s, nowMs));
  const todaysClasses = upcoming.filter((s) => platformISODate(s.startMs) === todayISO);
  const laterClasses = upcoming.filter((s) => platformISODate(s.startMs) !== todayISO);

  const activeArrangements = new Set(upcoming.filter((s) => s.kind === "private" || s.kind === "group").map((s) => s.seriesId ?? s.id));

  const todayTasks = tasksDueOn(tasks, todayISO);
  const overdueTasks = tasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < todayISO);
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayPct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;

  // Weekly progress: of everything planned for this Mon–Sun (study tasks
  // due this week + lessons scheduled this week), how much is done.
  const week = weekBounds(todayISO);
  const weekTasks = tasks.filter((t) => t.dueDate !== null && t.dueDate >= week.start && t.dueDate <= week.end);
  const weekSessions = data.sessions.filter((s) => {
    const d = platformISODate(s.startMs);
    return (s.kind === "private" || s.kind === "group") && s.status !== "cancelled" && d >= week.start && d <= week.end;
  });
  const weekPlanned = weekTasks.length + weekSessions.length;
  const weekDone = weekTasks.filter((t) => t.done).length + weekSessions.filter((s) => s.status === "completed" || s.endMs <= nowMs).length;
  const weekPct = weekPlanned ? Math.round((weekDone / weekPlanned) * 100) : null;

  const pendingReviews = data.completed.filter((c) => c.reviewable && !c.review);
  const confirmations = data.completed.filter((c) => c.confirmationStatus === "Pending" && (c.bookingType === "private" || (c.autoReleaseAtMs ?? 0) > nowMs));

  const hasAnyEngagement = data.sessions.length > 0 || data.completed.length > 0;
  const firstName = me.firstName;

  const quickStats = [
    { label: "Active Classes", value: String(activeArrangements.size), linkLabel: "View my classes", href: "/student-dashboard/lessons?tab=Active", icon: GraduationCap },
    { label: "Upcoming Classes", value: String(upcoming.length), linkLabel: "View schedule", href: "/student-dashboard/lessons?tab=Upcoming", icon: CalendarCheck },
    { label: "Study Tasks", value: todayTasks.length ? `${todayDone}/${todayTasks.length}` : "0", linkLabel: "Open planner", href: PLANNER_HREF, icon: ClipboardList },
    { label: "Weekly Progress", value: weekPct === null ? "—" : `${weekPct}%`, linkLabel: "View progress", href: "/student-dashboard/progress", icon: TrendingUp },
  ];

  const searchForm = (
    <>
      <input name="q" placeholder="What do you want to learn?" aria-label="What do you want to learn?" className="h-full flex-1 border-0 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted" />
    </>
  );

  return (
    <div>
      {/* Desktop header */}
      <div className="mt-6 hidden items-start justify-between gap-4 lg:flex">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{greeting(nowMs)}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your learning today.</p>
        </div>
        <form action="/student-dashboard/find-a-tutor" className="flex h-12 w-full max-w-md items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm">
          {searchForm}
          <button type="submit" aria-label="Search" className="text-ensena-muted">
            <Search className="size-4.5" />
          </button>
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative flex size-11 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink"
            >
              <Bell className="size-4.5" />
              {data.unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                  {data.unreadNotifications > 9 ? "9+" : data.unreadNotifications}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-13 z-30 w-80 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <p className="text-xs font-semibold text-ensena-ink">Notifications</p>
                  <Link href="/student-dashboard/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-ensena-primary hover:underline">
                    View all
                  </Link>
                </div>
                {data.notifications.length === 0 ? (
                  <p className="px-2.5 py-4 text-center text-xs text-ensena-muted">You&apos;re all caught up.</p>
                ) : (
                  <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                    {data.notifications.map((n) => (
                      <li key={n.id}>
                        <Link href={n.actionUrl ?? "/student-dashboard/notifications"} onClick={() => setNotifOpen(false)} className="block rounded-xl px-2.5 py-2 text-xs hover:bg-ensena-bg-soft">
                          <p className={cn("font-medium", n.unread ? "text-ensena-ink" : "text-ensena-muted")}>{n.text}</p>
                          <p className="mt-0.5 text-ensena-muted">{relativeDay(n.createdAtMs, nowMs)} · {formatTime(n.createdAtMs)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-ensena-border bg-ensena-surface py-1 pl-1 pr-3"
            >
              <PersonAvatar name={me.name} image={me.image} className="size-9" />
              <span className="text-sm font-medium text-ensena-ink">{me.name}</span>
              <ChevronDown className="size-3.5 text-ensena-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-13 z-30 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
                {accountMenuItems.map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)} className="block rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                    {item.label}
                  </Link>
                ))}
                <SignOutLink
                  onBeforeNavigate={() => setProfileOpen(false)}
                  className="mt-1 flex w-full items-center gap-1.5 rounded-xl border-t border-ensena-border px-2.5 pt-2.5 pb-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-3.5" /> Logout
                </SignOutLink>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="mt-6 lg:hidden">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{greeting(nowMs)}, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your learning today.</p>
      </div>

      <BirthdayCelebration firstName={firstName} role="student" dob={me.dob} />
      <GuardianDetailsCard className="mt-6" />

      {pendingReviews.length > 0 && !reviewsDismissed && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Star className="size-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm font-medium text-ensena-ink">
            You have {pendingReviews.length} {pendingReviews.length === 1 ? "review" : "reviews"} pending. Let your tutor{pendingReviews.length === 1 ? "" : "s"} know how your{" "}
            {pendingReviews.length === 1 ? "class" : "classes"} went.
          </p>
          <Link href="/student-dashboard/lessons?tab=Completed" className="shrink-0 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
            Review Now
          </Link>
          <button type="button" onClick={() => setReviewsDismissed(true)} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-white">
            <X className="size-4" />
          </button>
        </div>
      )}

      <form action="/student-dashboard/find-a-tutor" className="mt-6 flex h-12 max-w-xl items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm lg:hidden">
        <Search className="size-4.5 shrink-0 text-ensena-muted" />
        {searchForm}
      </form>

      {!hasAnyEngagement && (
        <div className="mt-6 rounded-3xl border border-ensena-primary/20 bg-ensena-primary/5 p-6 sm:p-8">
          <h2 className="font-heading text-xl font-semibold text-ensena-ink">Welcome to Ensena, {firstName} 👋</h2>
          <p className="mt-1.5 text-sm text-ensena-muted">You haven&apos;t booked a class yet. Find the right tutor or join a group class to get started. Your schedule will show up here.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button nativeButton={false} render={<Link href="/student-dashboard/find-a-tutor" />} className="h-11 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
              Find a Tutor
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/student-dashboard/group-classes" />} className="h-11 rounded-full border-ensena-border bg-ensena-surface px-5 text-sm font-medium">
              Explore Group Classes
            </Button>
          </div>
        </div>
      )}

      {hasAnyEngagement && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-ink">
                <stat.icon className="size-4.5" />
              </span>
              <p className="mt-3 text-sm text-ensena-ink">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
              <Link href={stat.href} className="mt-1 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                {stat.linkLabel} <ChevronRight className="size-3" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {hasAnyEngagement && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Classes</h2>
                <Link href="/student-dashboard/lessons" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View full schedule <ChevronRight className="size-3" />
                </Link>
              </div>
              {todaysClasses.length === 0 ? (
                <div className="mt-2 flex flex-col items-center gap-1.5 py-6 text-center">
                  <p className="text-sm font-semibold text-ensena-ink">No classes today 🎉</p>
                  <p className="text-xs text-ensena-muted">
                    {laterClasses[0] ? `Your next class is ${relativeDay(laterClasses[0].startMs, nowMs).toLowerCase() === "tomorrow" ? "tomorrow" : `on ${formatShortDate(laterClasses[0].startMs)}`} at ${formatTime(laterClasses[0].startMs)}.` : "You have some time to keep learning."}
                  </p>
                  <Link href={PLANNER_HREF} className="mt-2 text-xs font-semibold text-ensena-primary hover:underline">
                    Continue with Study Planner →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                  {todaysClasses.map((c, i) => {
                    const live = nowMs >= c.startMs;
                    const hint = entryHint(c, nowMs);
                    return (
                      <div key={c.id} className={cn("flex flex-wrap items-center gap-3 py-3.5", i === 0 && "pt-0")}>
                        <div className="w-16 shrink-0 text-sm font-semibold text-ensena-ink">{formatTime(c.startMs)}</div>
                        <PersonAvatar name={c.personName} image={c.personImage} className="size-11" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                          <p className="truncate text-xs text-ensena-muted">with {c.personName} · {kindLabel[c.kind]} · {c.mode}</p>
                          {hint && <p className="mt-0.5 text-xs font-medium text-ensena-primary">{hint}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", live ? "bg-rose-100 text-rose-700" : "bg-ensena-bg-soft text-ensena-muted")}>
                            {live && <span className="size-1.5 animate-pulse rounded-full bg-rose-600" />}
                            {live ? "In progress" : "Upcoming"}
                          </span>
                          {c.classroomHref && (
                            <Button
                              disabled={!canEnter(c, nowMs)}
                              nativeButton={false}
                              render={<Link href={c.classroomHref} />}
                              className="h-8 rounded-full border border-ensena-primary bg-white px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                            >
                              <Video className="size-3.5" /> Enter Classroom
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {laterClasses.length > 0 && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Classes</h2>
                <Link href="/student-dashboard/lessons?tab=Upcoming" className="text-xs font-semibold text-ensena-primary hover:underline">View all →</Link>
              </div>
              <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                {laterClasses.slice(0, 4).map((c, i) => {
                  const { month, day } = monthDay(c.startMs);
                  return (
                    <div key={c.id} className={cn("flex flex-wrap items-center gap-3 py-3.5 sm:flex-nowrap", i === 0 && "pt-0")}>
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-ensena-bg-soft py-1.5 text-ensena-ink">
                        <span className="text-[9px] font-semibold uppercase text-ensena-muted">{month}</span>
                        <span className="text-sm font-bold leading-none">{day}</span>
                      </div>
                      <PersonAvatar name={c.personName} image={c.personImage} className="size-10" />
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-ensena-ink">
                          {c.title}
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", kindBadge[c.kind])}>{kindLabel[c.kind]}</span>
                        </p>
                        <p className="truncate text-xs text-ensena-muted">with {c.personName}</p>
                        <p className="truncate text-xs text-ensena-muted">
                          {relativeDay(c.startMs, nowMs)} · {formatTimeRange(c)} · {c.mode}
                          {c.kind === "group" && c.seatsTotal ? ` · ${c.seatsFilled}/${c.seatsTotal} students` : ""}
                        </p>
                      </div>
                      <Button variant="outline" nativeButton={false} render={<Link href={detailsHref(c)} />} className="h-9 shrink-0 rounded-full border-ensena-border bg-white px-4 text-xs font-semibold">
                        View Class
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Study Plan</h2>
              <Link href={PLANNER_HREF} className="text-xs font-semibold text-ensena-primary hover:underline">Open Planner →</Link>
            </div>
            {todayTasks.length > 0 && (
              <>
                <p className="mt-1 text-sm text-ensena-muted">{todayDone} of {todayTasks.length} tasks completed</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-ensena-primary transition-all" style={{ width: `${todayPct}%` }} />
                </div>
              </>
            )}
            <div className="mt-4">
              <TaskCheckboxList tasks={todayTasks} onToggle={toggle} onRemove={remove} empty="Nothing planned for today yet. Add a task to stay on track." />
            </div>
            {overdueTasks.length > 0 && (
              <p className="mt-3 text-xs font-medium text-amber-700">
                {overdueTasks.length} unfinished {overdueTasks.length === 1 ? "task" : "tasks"} from earlier days.{" "}
                <Link href={PLANNER_HREF} className="underline">Review</Link>
              </p>
            )}
            <div className="mt-4">
              <AddTaskForm onAdd={(label) => add(label, todayISO)} defaultDue={todayISO} />
            </div>
            {todayTasks.length > 0 && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3">
                <TrendingUp className="size-4 shrink-0 text-rose-500" />
                <p className="text-xs font-medium text-rose-700">{todayDone === todayTasks.length ? "All done for today! 🎉" : "Keep going! You're on track."}</p>
              </div>
            )}
          </section>

          <RecommendedTutors tutors={data.recommendedTutors} savedIds={data.savedTutorIds} basis={[me.level, me.course].filter(Boolean).join(" · ")} subjects={me.subjects} />

          <section>
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Find a Tutor", subtitle: "1-on-1 private lessons", icon: Search, href: "/student-dashboard/find-a-tutor" },
                { label: "Explore Group Classes", subtitle: "Learn with other students", icon: Users2, href: "/student-dashboard/group-classes" },
                { label: "Study Planner", subtitle: "Plan and track your study", icon: ClipboardList, href: PLANNER_HREF },
                { label: "Speak to a Counsellor", subtitle: "Get free guidance", icon: MessageCircle, href: "/student-dashboard/counselling" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-4 transition-colors hover:border-ensena-primary/40 hover:bg-ensena-primary/5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                    <action.icon className="size-4.5" />
                  </span>
                  <span className="text-sm font-semibold text-ensena-ink">{action.label}</span>
                  <span className="text-xs text-ensena-muted">{action.subtitle}</span>
                </Link>
              ))}
            </div>
          </section>

          {data.groupClassSuggestions.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Group Classes for {me.level || "you"}</h2>
                <Link href="/student-dashboard/group-classes" className="text-xs font-semibold text-ensena-primary hover:underline">Explore Group Classes →</Link>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.groupClassSuggestions.map((g) => (
                  <div key={g.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar name={g.tutorName} image={g.tutorImage} className="size-9" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{g.title}</p>
                        <p className="truncate text-xs text-ensena-muted">{g.tutorName}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ensena-muted">{[g.level, g.subject].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-ensena-muted">Starts {formatShortDate(Date.parse(g.startDate))} · {g.seatsFilled}/{g.seatsTotal} students</p>
                    {g.price > 0 && <p className="mt-1 text-sm font-semibold text-ensena-ink">{formatNaira(g.price)}</p>}
                    <Button variant="outline" nativeButton={false} render={<Link href={`/student-dashboard/group-classes?q=${encodeURIComponent(g.title)}`} />} className="mt-2.5 h-9 w-full rounded-full border-ensena-border text-xs font-semibold">
                      View Class
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {confirmations.length > 0 && <LessonConfirmations items={confirmations} nowMs={nowMs} />}
          {pendingReviews.length > 0 && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
                <Star className="size-4.5 text-amber-500" /> Waiting for your review
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {pendingReviews.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5">
                    <PersonAvatar name={c.tutorName} image={c.tutorImage} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ensena-ink">{c.subject}</p>
                      <p className="truncate text-xs text-ensena-muted">{c.tutorName} · {formatShortDate(c.completedAtMs)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/student-dashboard/lessons?tab=Completed" className="mt-3 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                Leave reviews <ChevronRight className="size-3" />
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function RecommendedTutors({ tutors, savedIds, basis, subjects }: { tutors: RecommendedTutor[]; savedIds: string[]; basis: string; subjects: string[] }) {
  const subjectsLabel = subjects.slice(0, 2).join(", ");

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Recommended for You</h2>
          <p className="text-xs text-ensena-muted">
            Based on your {basis || "profile"}
            {subjectsLabel ? ` + ${subjectsLabel}` : ""} profile
          </p>
        </div>
        <Link href="/student-dashboard/find-a-tutor" className="shrink-0 text-xs font-semibold text-ensena-primary hover:underline">View all tutors →</Link>
      </div>
      {tutors.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-ensena-border bg-ensena-surface p-5 text-sm text-ensena-muted">
          {subjects.length === 0 ? (
            <>
              Add the subjects you&apos;re studying to your{" "}
              <Link href="/student-dashboard/profile" className="font-semibold text-ensena-primary hover:underline">profile</Link> and we&apos;ll recommend tutors who teach them.
            </>
          ) : (
            <>
              We don&apos;t have a verified tutor for {subjectsLabel || "your subjects"} yet. New tutors join every week.{" "}
              <Link href="/student-dashboard/find-a-tutor" className="font-semibold text-ensena-primary hover:underline">Browse all tutors</Link>.
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {tutors.map((t) => (
            <RecommendedTutorCard key={t.id} tutor={t} initiallySaved={savedIds.includes(t.id)} />
          ))}
        </div>
      )}

    </section>
  );
}

function RecommendedTutorCard({ tutor: t, initiallySaved }: { tutor: RecommendedTutor; initiallySaved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setTutorSaved(t.id, next);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "Couldn't update your saved tutors.");
      }
    });
  }

  return (
    <div className="relative w-48 shrink-0 overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface sm:w-auto">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-ensena-primary/5">
        <PersonAvatar name={t.name} image={t.image} className={cn(t.image ? "absolute inset-0 size-full rounded-none" : "size-16 text-2xl")} />
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save tutor"}
          disabled={pending}
          onClick={toggleSaved}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90"
        >
          <Heart className={cn("size-3.5", saved ? "fill-rose-500 text-rose-500" : "text-ensena-muted")} />
        </button>
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-semibold text-ensena-ink">{t.name}</p>
        <p className="truncate text-xs text-ensena-muted">{t.matchedSubjects.slice(0, 2).join(", ")}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {t.rating !== null ? `${t.rating} (${t.reviewCount})` : "New tutor"}
        </p>
        <p className="text-sm font-semibold text-ensena-ink">{t.pricePerHour ? `${formatNaira(t.pricePerHour)}/hr` : "Price on request"}</p>
        <Button variant="outline" nativeButton={false} render={<Link href={`/student-dashboard/tutors/${t.id}`} />} className="mt-2.5 h-8 w-full rounded-full border-ensena-border text-xs font-medium">
          View Tutor
        </Button>
      </div>
    </div>
  );
}

function LessonConfirmations({ items, nowMs }: { items: CompletedLesson[]; nowMs: number }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<CompletedLesson | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, startTransition] = useTransition();

  function confirm(item: CompletedLesson) {
    setPendingId(item.id);
    startTransition(async () => {
      const result = await confirmLessonCompleted(item.id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't confirm this lesson.");
        return;
      }
      toast.success(`Thanks! Payment has been released to ${item.tutorName}.`);
      router.refresh();
    });
  }

  function openReport(item: CompletedLesson) {
    setReason((item.bookingType === "private" ? disputeReasons : complaintReasons)[0]);
    setDetails("");
    setReporting(item);
  }

  function submitReport() {
    if (!reporting) return;
    startTransition(async () => {
      const result = await reportLessonIssue(reporting.id, reason, details);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't submit your report.");
        return;
      }
      toast.success("Your report has been submitted. Ensena support will review it.");
      setReporting(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Lesson Confirmations
      </h2>
      <p className="text-xs text-ensena-muted">Confirm your recent lessons so payment can be released to your tutor.</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((l) => {
          const msRemaining = (l.autoReleaseAtMs ?? 0) - nowMs;
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
              <p className="text-xs text-ensena-muted">
                {l.tutorName}
                {l.amount ? ` · ${formatNaira(l.amount)}` : ""} · {formatShortDate(l.completedAtMs)}
              </p>
              {msRemaining > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                  <Clock className="size-3.5" /> {l.bookingType === "private" ? "Auto-releases in" : "You can report a problem within"} {formatCountdown(msRemaining)}
                </p>
              )}
              {l.bookingType === "private" ? (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <Button onClick={() => confirm(l)} loading={pendingId === l.id} className="h-8 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">
                    Confirm Lesson
                  </Button>
                  <Button variant="outline" disabled={msRemaining <= 0} onClick={() => openReport(l)} className="h-8 rounded-full border-ensena-border text-xs font-medium">
                    Report an Issue
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => openReport(l)} className="mt-2 h-8 w-full rounded-full border-ensena-border text-xs font-medium">
                  Report a Problem
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={!!reporting} onClose={() => setReporting(null)} title="Report an Issue">
        {reporting && (
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Payment for this lesson stays on hold until Ensena support reviews your report.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Reason</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {(reporting.bookingType === "private" ? disputeReasons : complaintReasons).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Tell us more</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={800} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>
            <Button onClick={submitReport} loading={submitting} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
              Submit
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
}
