"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Atom,
  Award,
  Bell,
  BookOpen,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  Heart,
  Languages,
  Lightbulb,
  LogOut,
  MessageCircle,
  Rocket,
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
import { SignOutLink } from "@/components/auth/sign-out-link";
import { BirthdayCelebration } from "@/components/shared/birthday/birthday-celebration";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { MilestoneBanner } from "@/components/shared/milestone-banner";
import { GuardianDetailsCard } from "@/components/student-dashboard/guardian-details-card";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { confirmLessonCompleted } from "@/lib/actions/student-learning";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { formatCountdown, reminderStageFor } from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { PLATFORM_TIMEZONE } from "@/lib/platform-time";
import { buildStudentAccountMenuItems } from "@/lib/student-dashboard-data";
import type { CompletedLesson, LearningSession, RecommendedTutor, StudentLearningSnapshot } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import { formatShortDate, formatTime, greeting, isUpcoming, kindLabel, monthDay, needsPayment, platformISODate, relativeDay, tasksDueOn } from "./learning-utils";
import { PersonAvatar, useLiveNow, useStudyTasks } from "./live-shared";
import { useReportIssue } from "./report-issue";
import { computeProgress } from "./progress-utils";

const PLANNER_HREF = "/student-dashboard/lessons?tab=Study%20Planner";
const detailsHref = (id: string) => `/student-dashboard/lessons?view=${id}`;

const SUBJECT_ICONS: [RegExp, typeof Calculator][] = [
  [/math|further|stat|account/i, Calculator],
  [/physic|chem|bio|science|agric/i, Atom],
  [/english|literature|reading|writing/i, BookOpen],
  [/french|spanish|igbo|yoruba|hausa|language|german|chinese/i, Languages],
];
function subjectIcon(subject: string) {
  return SUBJECT_ICONS.find(([re]) => re.test(subject))?.[1] ?? GraduationCap;
}

const studyTips = [
  "Review your notes within 24 hours of a lesson. It's the single best way to make new material stick.",
  "Break big assignments into small daily tasks. Consistent daily progress beats one long cram session.",
  "Ask your tutor to explain anything unclear right away. Small gaps turn into big ones if they pile up.",
  "Practise past questions under timed conditions at least once a week before an exam.",
];

function timeAgo(ms: number, nowMs: number): string {
  const mins = Math.max(0, Math.round((nowMs - ms) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : formatShortDate(ms);
}

function entryHint(s: LearningSession, nowMs: number): ReactNode {
  if (needsPayment(s)) return "Payment required to join this session";
  const state = getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs });
  if (state === "too-early") return entryOpensHint(s.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs);
  return undefined;
}

function canEnter(s: LearningSession, nowMs: number): boolean {
  return !needsPayment(s) && canEnterClassroom(getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs }));
}

// The banner congratulates the latest milestone reached; dismissing hides
// that milestone on this device until the next one is reached.
const MILESTONE_KEY = "ensena_dismissed_milestone";
function milestoneFor(lessonsCompleted: number): { id: string; icon: typeof Rocket; message: string } {
  if (lessonsCompleted >= 50) return { id: "lessons-50", icon: Award, message: "50 lessons completed. That's real commitment! 🏆" };
  if (lessonsCompleted >= 10) return { id: "lessons-10", icon: Award, message: "You've completed 10 lessons. Keep the momentum going! 🎉" };
  if (lessonsCompleted >= 1) return { id: "lessons-1", icon: Star, message: "You completed your first lesson. Great start! 🎉" };
  return { id: "journey-start", icon: Rocket, message: "Your learning journey starts today." };
}

export function StudentDashboardReal({ data }: { data: StudentLearningSnapshot }) {
  const me = useStudentIdentity();
  const nowMs = useLiveNow(data.generatedAtMs);
  const { tasks, toggle } = useStudyTasks(data.studyTasks);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reviewsDismissed, setReviewsDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [dismissedMilestone, setDismissedMilestone] = useState<string | null>(null);
  const accountMenuItems = buildStudentAccountMenuItems(data.hasCounselling);
  const firstName = me.firstName;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a per-device preference after mount
      setDismissedMilestone(window.localStorage.getItem(MILESTONE_KEY));
    } catch {
      // Storage unavailable — the banner just shows.
    }
  }, []);

  const progress = computeProgress(data, tasks, me.subjects, nowMs);
  const milestone = milestoneFor(progress.lessonsCompleted);

  function dismissMilestone() {
    setDismissedMilestone(milestone.id);
    try {
      window.localStorage.setItem(MILESTONE_KEY, milestone.id);
    } catch {
      // Not remembered — fine.
    }
  }

  const todayISO = platformISODate(nowMs);
  const upcoming = data.sessions.filter((s) => isUpcoming(s, nowMs));
  const todaysClasses = upcoming.filter((s) => platformISODate(s.startMs) === todayISO);
  const laterClasses = upcoming.filter((s) => platformISODate(s.startMs) !== todayISO);
  const activeArrangements = new Set(upcoming.filter((s) => s.kind === "private" || s.kind === "group").map((s) => s.seriesId ?? s.id));

  const todayTasks = tasksDueOn(tasks, todayISO);
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayPct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;

  const pendingReviews = data.completed.filter((c) => c.reviewable && !c.review);
  const privateConfirmations = data.completed.filter((c) => c.bookingType === "private" && c.confirmationStatus !== null && c.escrowStatus !== "Released");
  const groupReports = data.completed.filter((c) => c.bookingType === "group" && c.confirmationStatus !== null && (c.confirmationStatus === "Disputed" || (c.autoReleaseAtMs ?? 0) > nowMs));

  // One card per group class the student is enrolled in, pointing at its next session.
  // (sessions are sorted by start, so the first not-yet-ended one wins; a class with none left keeps its last session).
  const groupByClass = new Map<string, LearningSession>();
  for (const s of data.sessions) {
    if (s.kind !== "group" || s.status === "cancelled" || !s.groupClassId) continue;
    const current = groupByClass.get(s.groupClassId);
    if (!current || current.endMs <= nowMs) groupByClass.set(s.groupClassId, s);
  }
  const myGroupClasses = [...groupByClass.values()].sort((a, b) => Number(a.endMs <= nowMs) - Number(b.endMs <= nowMs) || a.startMs - b.startMs);

  const quickStats = [
    { label: "Active Classes", value: String(activeArrangements.size), linkLabel: "View my classes", href: "/student-dashboard/lessons", icon: GraduationCap, iconClass: "bg-violet-100 text-violet-700 border-violet-200", cardClass: "bg-violet-50/60 border-violet-100" },
    { label: "Upcoming Classes", value: String(upcoming.length), linkLabel: "View schedule", href: "/student-dashboard/lessons?tab=Upcoming", icon: CalendarCheck, iconClass: "bg-blue-100 text-blue-700 border-blue-200", cardClass: "bg-blue-50/60 border-blue-100" },
    { label: "Study Tasks", value: `${todayDone}/${todayTasks.length}`, linkLabel: "Open planner", href: PLANNER_HREF, icon: ClipboardList, iconClass: "bg-emerald-100 text-emerald-700 border-emerald-200", cardClass: "bg-emerald-50/60 border-emerald-100" },
    { label: "Weekly Progress", value: progress.weekly === null ? "0%" : `${progress.weekly}%`, linkLabel: "View progress", href: "/student-dashboard/progress", icon: TrendingUp, iconClass: "bg-amber-100 text-amber-700 border-amber-200", cardClass: "bg-amber-50/60 border-amber-100" },
  ];

  const hasAnyEngagement = data.sessions.length > 0 || data.completed.length > 0;

  return (
    <div>
      {/* Desktop top bar */}
      <div className="mt-6 mb-6 hidden items-center justify-between gap-4 lg:flex">
        <form action="/student-dashboard/find-a-tutor" className="flex h-11 w-full max-w-md items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4">
          <Search className="size-4 shrink-0 text-ensena-muted" />
          <input name="q" placeholder="What do you want to learn?" aria-label="What do you want to learn?" className="h-full flex-1 border-0 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted" />
        </form>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <Bell className="size-5" />
              {data.unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                  {data.unreadNotifications > 9 ? "9+" : data.unreadNotifications}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
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
                          <p className="mt-0.5 text-ensena-muted">{timeAgo(n.createdAtMs, nowMs)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Link href="/student-dashboard/messages" aria-label="Messages" className="relative flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
            <MessageCircle className="size-5" />
            {data.unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                {data.unreadMessages > 99 ? "99+" : data.unreadMessages}
              </span>
            )}
          </Link>
          <div className="relative border-l border-ensena-border pl-4">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2.5"
            >
              <PersonAvatar name={me.name} image={me.image} className="size-9" />
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold text-ensena-ink">{me.name}</span>
                <span className="block text-xs text-ensena-muted">Student</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-ensena-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
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

      <div className="mt-6 lg:mt-0">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{greeting(nowMs)}, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your learning today.</p>
      </div>

      <BirthdayCelebration firstName={firstName} role="student" dob={me.dob} />

      {dismissedMilestone !== milestone.id && (
        <div className="mt-6">
          <MilestoneBanner icon={milestone.icon} message={milestone.message} onDismiss={dismissMilestone} />
        </div>
      )}

      {pendingReviews.length > 0 && !reviewsDismissed && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Star className="size-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm font-medium text-ensena-ink">
            You have {pendingReviews.length} {pendingReviews.length === 1 ? "review" : "reviews"} pending. Let your tutor{pendingReviews.length === 1 ? "" : "s"} know how your {pendingReviews.length === 1 ? "class" : "classes"} went.
          </p>
          <Link href="/student-dashboard/lessons/completed" className="shrink-0 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
            Review Now
          </Link>
          <button type="button" onClick={() => setReviewsDismissed(true)} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-white">
            <X className="size-4" />
          </button>
        </div>
      )}

      <GuardianDetailsCard className="mt-6" />

      <form action="/student-dashboard/find-a-tutor" className="mt-6 flex max-w-xl items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm lg:hidden">
        <Search className="size-4.5 shrink-0 text-ensena-muted" />
        <input name="q" placeholder="What do you want to learn?" aria-label="What do you want to learn?" className="h-12 flex-1 border-0 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted" />
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

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className={cn("rounded-2xl border p-4", stat.cardClass)}>
            <span className={cn("flex size-9 items-center justify-center rounded-xl border", stat.iconClass)}>
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

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Today's Classes + Upcoming Classes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Classes</h2>
                <Link href="/student-dashboard/lessons" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View full schedule <ChevronRight className="size-3" />
                </Link>
              </div>
              {todaysClasses.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-1.5 py-8 text-center">
                  <p className="text-sm font-semibold text-ensena-ink">No classes today 🎉</p>
                  <p className="text-xs text-ensena-muted">
                    {laterClasses[0]
                      ? `Your next class is ${relativeDay(laterClasses[0].startMs, nowMs) === "Tomorrow" ? "tomorrow" : `on ${formatShortDate(laterClasses[0].startMs)}`} at ${formatTime(laterClasses[0].startMs)}.`
                      : "You have some time to keep learning."}
                  </p>
                  <Link href={PLANNER_HREF} className="mt-2 text-xs font-semibold text-ensena-primary hover:underline">
                    Continue with Study Planner →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                  {todaysClasses.map((c, i) => {
                    const Icon = subjectIcon(c.subject || c.title);
                    const live = nowMs >= c.startMs;
                    const hint = entryHint(c, nowMs);
                    return (
                      <div key={c.id} className={cn("flex flex-wrap items-center gap-3 py-3.5", i === 0 && "pt-0")}>
                        <div className="w-16 shrink-0 text-sm font-semibold text-ensena-ink">{formatTime(c.startMs)}</div>
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={detailsHref(c.id)} className="block truncate text-sm font-semibold text-ensena-ink hover:underline">{c.title}</Link>
                          <p className="truncate text-xs text-ensena-muted">
                            with {c.personName} · {kindLabel[c.kind]} · {c.mode}
                            {c.kind === "group" && c.seatsTotal ? ` · ${c.seatsFilled}/${c.seatsTotal} students` : ""}
                          </p>
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
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Classes</h2>
                <Link href="/student-dashboard/lessons?tab=Upcoming" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View all <ChevronRight className="size-3" />
                </Link>
              </div>
              {laterClasses.length === 0 ? (
                <p className="mt-4 text-sm text-ensena-muted">Nothing else scheduled yet.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {laterClasses.slice(0, 4).map((c) => {
                    const { month, day } = monthDay(c.startMs);
                    const Icon = subjectIcon(c.subject || c.title);
                    const group = c.kind === "group";
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-rose-50 py-1 text-rose-600">
                          <span className="text-[9px] font-semibold uppercase">{month}</span>
                          <span className="text-sm font-bold leading-none">{day}</span>
                        </div>
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", group ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600")}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ensena-ink">{c.title}</p>
                          <p className="truncate text-xs text-ensena-muted">with {c.personName} · {kindLabel[c.kind]}</p>
                          <p className="truncate text-xs text-ensena-muted">
                            {formatTime(c.startMs)}
                            {group && c.seatsTotal ? ` · ${c.seatsFilled}/${c.seatsTotal} students` : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={detailsHref(c.id)} />}
                          className={cn("h-8 shrink-0 rounded-full bg-white px-3 text-[11px] font-semibold", group ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-violet-300 text-violet-700 hover:bg-violet-50")}
                        >
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link href="/student-dashboard/lessons" className="mt-4 flex h-9 w-full items-center justify-center gap-1 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                View full schedule <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Notifications + My Group Classes + Your Progress */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Notifications</h2>
                <Link href="/student-dashboard/notifications" className="text-xs font-semibold text-ensena-primary hover:underline">View all</Link>
              </div>
              {data.notifications.length === 0 ? (
                <p className="mt-4 text-sm text-ensena-muted">You&apos;re all caught up.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3.5">
                  {data.notifications.slice(0, 3).map((n) => (
                    <li key={n.id}>
                      <Link href={n.actionUrl ?? "/student-dashboard/notifications"} className="flex items-start gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-ink">
                          <Bell className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("truncate text-sm font-medium", n.unread ? "text-ensena-ink" : "text-ensena-muted")}>{n.category || "Update"}</p>
                            <span className="shrink-0 text-[11px] text-ensena-muted">{timeAgo(n.createdAtMs, nowMs)}</span>
                          </div>
                          <p className="truncate text-xs text-ensena-muted">{n.text}</p>
                        </div>
                        {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-primary" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">My Group Classes</h2>
                <Link href="/student-dashboard/group-classes" className="text-xs font-semibold text-ensena-primary hover:underline">View all</Link>
              </div>
              {myGroupClasses.length === 0 ? (
                <p className="mt-4 text-sm text-ensena-muted">
                  You&apos;re not enrolled in a group class yet.{" "}
                  <Link href="/student-dashboard/group-classes" className="font-semibold text-ensena-primary hover:underline">Explore classes</Link>
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {myGroupClasses.slice(0, 2).map((c) => {
                    const seatsPct = c.seatsTotal ? Math.round(((c.seatsFilled ?? 0) / c.seatsTotal) * 100) : 0;
                    const enter = isUpcoming(c, nowMs) && canEnter(c, nowMs);
                    return (
                      <div key={c.groupClassId} className="rounded-xl border border-ensena-border p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Users2 className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                            <p className="truncate text-xs text-ensena-muted">{c.personName}</p>
                          </div>
                        </div>
                        {c.seatsTotal ? (
                          <>
                            <p className="mt-2 text-xs text-ensena-muted">{c.seatsFilled ?? 0} / {c.seatsTotal} students</p>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ensena-border">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${seatsPct}%` }} />
                            </div>
                          </>
                        ) : null}
                        <div className="mt-2.5 flex gap-1.5">
                          <Link href={detailsHref(c.id)} className="flex h-8 flex-1 items-center justify-center rounded-full border border-ensena-primary text-[11px] font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                            View Class
                          </Link>
                          {c.classroomHref && (
                            <Link
                              href={c.classroomHref}
                              aria-disabled={!enter}
                              onClick={(e) => {
                                if (!enter) {
                                  e.preventDefault();
                                  toast.info(isUpcoming(c, nowMs) ? `The classroom opens shortly before ${relativeDay(c.startMs, nowMs).toLowerCase()} at ${formatTime(c.startMs)}.` : "This class has no upcoming session.");
                                }
                              }}
                              className={cn("flex h-8 flex-1 items-center justify-center gap-1 rounded-full border border-ensena-border text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft", !enter && "opacity-60")}
                            >
                              <Video className="size-3" /> Enter
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Progress</h2>
                <Link href="/student-dashboard/progress" className="text-xs font-semibold text-ensena-primary hover:underline">View progress</Link>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <TrendingUp className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-xl font-semibold text-ensena-ink">{progress.overall ?? 0}%</p>
                  <p className="text-xs text-ensena-muted">Overall Progress</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
                {progress.subjects.length === 0 ? (
                  <p className="text-xs text-ensena-muted">Book a lesson or add study tasks to start tracking progress by subject.</p>
                ) : (
                  progress.subjects.slice(0, 4).map((s) => (
                    <div key={s.subject} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-ensena-muted">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} /> <span className="truncate">{s.subject}</span>
                      </span>
                      <span className="font-medium text-ensena-ink">{s.pct}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <LessonConfirmations items={privateConfirmations} nowMs={nowMs} />
          <GroupClassSessions items={groupReports} nowMs={nowMs} />
          {privateConfirmations.length === 0 && groupReports.length === 0 && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
                <ShieldCheck className="size-4.5 text-ensena-primary" /> Lesson Confirmations
              </h2>
              <p className="mt-1 text-xs text-ensena-muted">When a tutor marks a lesson as completed, you&apos;ll confirm it here so payment can be released.</p>
              <p className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">Nothing waiting for you right now.</p>
            </div>
          )}
        </div>
      </div>

      {/* Study Tip of the Day */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600">
            <Lightbulb className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Study Tip of the Day</p>
            <p className="text-xs text-ensena-muted">{studyTips[tipIndex]}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setTipIndex((i) => (i + 1) % studyTips.length)} className="h-9 shrink-0 rounded-full border-indigo-200 bg-white px-4 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">
          View more tips
        </Button>
      </div>

      {todayTasks.length > 0 && (
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Study Plan</h2>
            <Link href={PLANNER_HREF} className="text-xs font-semibold text-ensena-primary hover:underline">Open Planner →</Link>
          </div>
          <p className="mt-1 text-sm text-ensena-muted">{todayDone} of {todayTasks.length} tasks completed</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-ensena-primary transition-all" style={{ width: `${todayPct}%` }} />
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {todayTasks.map((task) => (
              <li key={task.id}>
                <button type="button" disabled={task.id.startsWith("temp-")} onClick={() => toggle(task.id)} className="flex w-full items-center gap-2.5 text-left">
                  {task.done ? <CheckCircle2 className="size-4.5 shrink-0 fill-rose-100 text-rose-600" /> : <Circle className="size-4.5 shrink-0 text-ensena-muted" />}
                  <span className={cn("min-w-0 flex-1 truncate text-sm", task.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{task.label}</span>
                  <span className={cn("shrink-0 text-xs", task.done ? "text-ensena-muted" : "text-ensena-primary")}>{task.done ? "Completed" : "Due today"}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3">
            <TrendingUp className="size-4 shrink-0 text-rose-500" />
            <p className="text-xs font-medium text-rose-700">{todayDone === todayTasks.length ? "All done for today! 🎉" : "Keep going! You're on track."}</p>
          </div>
        </div>
      )}

      {/* Mobile only, between the study plan and recommendations (the
          mobile design's order). Desktop is unchanged. */}
      <div className="lg:hidden">
        <CounsellingCard sessions={data.sessions} nowMs={nowMs} />
      </div>

      <RecommendedTutors tutors={data.recommendedTutors} savedIds={data.savedTutorIds} basis={[me.level, me.course].filter(Boolean).join(" · ")} subjects={me.subjects} />

      <div className="mt-6">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Find a Tutor", subtitle: "1-on-1 private lessons", icon: Search, href: "/student-dashboard/find-a-tutor" },
            { label: "Explore Group Classes", subtitle: "Learn with other students", icon: Users2, href: "/student-dashboard/group-classes" },
            { label: "Study Planner", subtitle: "Plan and track your study", icon: ClipboardList, href: PLANNER_HREF },
            { label: "Speak to a Counsellor", subtitle: "Get free guidance", icon: MessageCircle, href: "/student-dashboard/counselling" },
          ].map((action) => (
            <Link key={action.label} href={action.href} className="flex flex-col gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-4 transition-colors hover:border-ensena-primary/40 hover:bg-ensena-primary/5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                <action.icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold text-ensena-ink">{action.label}</span>
              <span className="text-xs text-ensena-muted">{action.subtitle}</span>
            </Link>
          ))}
        </div>
      </div>

      {data.groupClassSuggestions.length > 0 && (
        <div className="mt-6">
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
        </div>
      )}
    </div>
  );
}

// The student's next counselling session (or, once they've had one, a
// way back in). Hidden for students who've never booked counselling.
function CounsellingCard({ sessions, nowMs }: { sessions: LearningSession[]; nowMs: number }) {
  const counselling = sessions.filter((s) => s.kind === "counselling");
  const next = counselling.filter((s) => isUpcoming(s, nowMs)).sort((a, b) => a.startMs - b.startMs)[0];
  const lastPast = counselling.filter((s) => s.status === "completed" || (s.status === "scheduled" && s.endMs <= nowMs)).sort((a, b) => b.startMs - a.startMs)[0];
  if (!next && !lastPast) return null;

  if (!next) {
    return (
      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Session completed</p>
        <p className="text-sm font-medium text-ensena-ink">{lastPast!.personName} · {formatShortDate(lastPast!.startMs)}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button nativeButton={false} render={<Link href={`/student-dashboard/lessons?view=${lastPast!.id}`} />} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            View Counselling →
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/student-dashboard/counselling" />} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
            Book Another Session
          </Button>
        </div>
      </div>
    );
  }

  const entryState = getClassEntryState({ startMs: next.startMs, endMs: next.endMs, role: "student", nowMs });
  const enterable = canEnterClassroom(entryState);
  const live = next.startMs <= nowMs;
  const startingSoon = !live && entryState === "entry-available" && next.startMs - nowMs <= 15 * 60_000;
  const hint = entryState === "too-early" ? entryOpensHint(next.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs, "Session") : entryState === "ended" ? "This session has ended" : undefined;
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, month: "short", day: "numeric", year: "numeric" }).format(next.startMs);

  return (
    <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling</h2>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Your next session</p>
      <div className="mt-2 flex items-center gap-3">
        <PersonAvatar name={next.personName} image={next.personImage} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ensena-ink">{next.personName}</p>
          <p className="truncate text-xs text-ensena-muted">Ensena Academic Counsellor</p>
        </div>
        {startingSoon ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <span className="size-1.5 animate-pulse rounded-full bg-rose-600" /> Starting soon
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-current" /> {live ? "In Progress" : "Confirmed"}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-ensena-ink">{dateLabel}</p>
      <p className="flex items-center gap-1.5 text-xs text-ensena-muted">
        <Clock className="size-3.5" /> {formatTime(next.startMs)} – {formatTime(next.endMs)} · Video Call
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          disabled={!enterable || !next.classroomHref}
          {...(enterable && next.classroomHref ? { nativeButton: false, render: <Link href={next.classroomHref} /> } : {})}
          className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
        >
          <Video className="size-4" /> Enter Session
        </Button>
      </div>
      {!enterable && hint && <p className="mt-2 text-xs font-medium text-ensena-primary">{hint}</p>}
      <Link href={`/student-dashboard/lessons?view=${next.id}`} className="mt-2.5 inline-flex text-xs font-semibold text-ensena-primary hover:underline">
        View Counselling Details →
      </Link>
    </div>
  );
}

function RecommendedTutors({ tutors, savedIds, basis, subjects }: { tutors: RecommendedTutor[]; savedIds: string[]; basis: string; subjects: string[] }) {
  const subjectsLabel = subjects.slice(0, 2).join(", ");
  return (
    <div className="mt-6">
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
    </div>
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
  const [, startTransition] = useTransition();
  const report = useReportIssue();

  if (items.length === 0) return null;

  function release(item: CompletedLesson) {
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

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Lesson Confirmations
      </h2>
      <p className="text-xs text-ensena-muted">Confirm your recent lessons so payment can be released to your tutor.</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((l) => {
          const msRemaining = (l.autoReleaseAtMs ?? 0) - nowMs;
          const reminder = l.confirmationStatus === "Pending" ? reminderStageFor((nowMs - l.completedAtMs) / 3_600_000) : null;
          const disputed = l.confirmationStatus === "Disputed" || l.escrowStatus === "Frozen";
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ensena-ink">{l.subject}</p>
                  <p className="truncate text-xs text-ensena-muted">
                    {l.tutorName}
                    {l.amount ? ` · ${formatNaira(l.amount)}` : ""}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", disputed ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>{disputed ? "Under Review" : "Waiting Confirmation"}</span>
              </div>

              {l.confirmationStatus === "Pending" && !disputed && (
                <>
                  {msRemaining > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                      <Clock className="size-3.5" /> Auto-releases in {formatCountdown(msRemaining)}
                    </p>
                  )}
                  {reminder && (
                    <p className="mt-1.5 rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">
                      <span className="font-semibold">{reminder.title}:</span> {reminder.text}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <Button onClick={() => release(l)} loading={pendingId === l.id} className="h-8 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">
                      Release Payment
                    </Button>
                    <Button variant="outline" onClick={() => report.open(l)} className="h-8 rounded-full border-ensena-border text-xs font-medium">
                      Report an Issue
                    </Button>
                  </div>
                </>
              )}

              {disputed && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertTriangle className="size-3.5" /> Under review by Ensena support. We&apos;ll update you soon.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {report.modal}
    </div>
  );
}

function GroupClassSessions({ items, nowMs }: { items: CompletedLesson[]; nowMs: number }) {
  const report = useReportIssue();
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Group Class Sessions
      </h2>
      <p className="text-xs text-ensena-muted">If everything was fine, you don&apos;t need to do anything. No action required unless something went wrong.</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((l) => {
          const msRemaining = (l.autoReleaseAtMs ?? 0) - nowMs;
          const canReport = l.confirmationStatus === "Pending" && msRemaining > 0;
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ensena-ink">{l.subject}</p>
                  <p className="truncate text-xs text-ensena-muted">
                    {l.tutorName}
                    {l.amount ? ` · ${formatNaira(l.amount)}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> Session Completed
                </span>
              </div>
              {l.attended !== null && <p className="mt-2 text-xs text-ensena-muted">{l.attended ? "You attended this session." : "You did not attend this session."}</p>}
              {canReport && (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                    <Clock className="size-3.5" /> You can report a problem within {formatCountdown(msRemaining)}
                  </p>
                  <Button variant="outline" onClick={() => report.open(l)} className="mt-2 h-8 w-full rounded-full border-ensena-border text-xs font-medium">
                    Report a Problem
                  </Button>
                </>
              )}
              {l.confirmationStatus === "Disputed" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertTriangle className="size-3.5" /> Your report has been submitted and is being reviewed.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {report.modal}
    </div>
  );
}
