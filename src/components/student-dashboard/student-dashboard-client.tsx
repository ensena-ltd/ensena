"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Atom,
  Bell,
  BookOpen,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  GraduationCap,
  Heart,
  LogOut,
  MessageCircle,
  Search,
  Star,
  TrendingUp,
  Users2,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { BirthdayCelebration } from "@/components/shared/birthday/birthday-celebration";
import { GuardianDetailsCard } from "@/components/student-dashboard/guardian-details-card";
import { ImportantUpdatesBanner } from "@/components/student-dashboard/important-updates-banner";
import { MilestoneBanner } from "@/components/shared/milestone-banner";
import { CounsellingDashboardCard } from "@/components/student-dashboard/counselling/counselling-dashboard-card";
import { EscrowConfirmationPanel } from "@/components/student-dashboard/lessons/escrow-confirmation-panel";
import { GroupSessionReportPanel } from "@/components/student-dashboard/lessons/group-session-report-panel";
import { PendingReviewsBanner } from "@/components/student-dashboard/lessons/pending-reviews-banner";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { useStudentNotifications } from "@/hooks/use-student-notifications";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { useNowMs } from "@/hooks/use-now-ms";
import { hasCounsellingRecords } from "@/lib/admin-counselling-data";
import { isValidBookingReference } from "@/lib/booking-reference";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { isNotYetOver } from "@/lib/class-list-helpers";
import { getPlatformTodayParts, platformWallTimeToMs } from "@/lib/platform-time";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { hasSessionAccess } from "@/lib/payment-plans-store";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import { studentMilestoneExamples } from "@/lib/milestones-data";
import { privateLessonToStudentLesson } from "@/lib/student-booking-adapters";
import {
  buildStudentAccountMenuItems,
  dashboardStudent,
  getGroupSessionTimeRange,
  getPrivateLessonTimeRange,
  notificationCategoryHref,
  studentGroupClasses,
  studentLessons,
  studentOverallProgress,
  studentStudyTasks,
  studentProfileDetail,
  type StudentGroupClass,
  type StudentLesson,
} from "@/lib/student-dashboard-data";
import { tutorListings, type TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

function RecommendedTutorCard({ tutor: t }: { tutor: TutorListing }) {
  const [saved, toggleSaved] = useSavedTutor(t.slug);
  const rating = useTutorRating(t.name, t.rating, t.reviews);
  return (
    <div className="relative w-48 shrink-0 overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface sm:w-auto">
      <div className="relative aspect-[4/3] w-full">
        <Image src={t.image} alt={t.name} fill sizes="(min-width: 640px) 25vw, 192px" className="object-cover" />
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save tutor"}
          onClick={toggleSaved}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90"
        >
          <Heart className={cn("size-3.5", saved ? "fill-rose-500 text-rose-500" : "text-ensena-muted")} />
        </button>
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-ensena-ink">{t.name}</p>
        <p className="text-xs text-ensena-muted">{t.subject} · {studentProfileDetail.academicLevel}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews})
        </p>
        <p className="text-sm font-semibold text-ensena-ink">{formatNaira(t.price)}/hr</p>
        <Button variant="outline" nativeButton={false} render={<Link href={`/find-teachers/${t.slug}`} />} className="mt-2.5 h-8 w-full rounded-full border-ensena-border text-xs font-medium">
          View Tutor
        </Button>
      </div>
    </div>
  );
}

const RECOMMENDED_SUBJECT = "Mathematics";

// tutors.ts tags Mathematics tutors with the coarser "WAEC / NECO" exam
// track rather than the student's own "WAEC" academicLevel string.
const EXAM_TRACK_LEVEL = "WAEC / NECO";

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  Mathematics: Calculator,
  Physics: Atom,
  Chemistry: Atom,
  Biology: Atom,
  English: BookOpen,
  "English Language": BookOpen,
  French: BookOpen,
};

function subjectIcon(subject: string) {
  return SUBJECT_ICONS[subject] ?? GraduationCap;
}

type ClassTheme = "violet" | "emerald" | "sky";
const THEME_CLASSES: Record<ClassTheme, { badge: string; iconBg: string; iconColor: string; pill: string; button: string }> = {
  violet: { badge: "bg-violet-100 text-violet-700", iconBg: "bg-violet-100", iconColor: "text-violet-600", pill: "bg-violet-100 text-violet-700", button: "border-violet-300 text-violet-700 hover:bg-violet-50" },
  emerald: { badge: "bg-emerald-100 text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", pill: "bg-emerald-100 text-emerald-700", button: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
  sky: { badge: "bg-sky-100 text-sky-700", iconBg: "bg-sky-100", iconColor: "text-sky-600", pill: "bg-sky-100 text-sky-700", button: "border-sky-300 text-sky-700 hover:bg-sky-50" },
};

// getGroupSessionTimeRange (student-dashboard-data.ts) returns real ms —
// this just adapts that into the Date-pair shape liveClassStatus/LiveCountdown
// below already expect, rather than duplicating the parsing itself.
function groupWindowAsDates(gc: StudentGroupClass): { start: Date; end: Date } | null {
  const range = getGroupSessionTimeRange(gc);
  return range ? { start: new Date(range.startMs), end: new Date(range.endMs) } : null;
}

function liveClassStatus(window: { start: Date; end: Date } | null, now: Date | null): { label: string; tone: "live" | "upcoming"; target: Date } | null {
  if (!window || !now) return null;
  const msUntilStart = window.start.getTime() - now.getTime();
  const msUntilEnd = window.end.getTime() - now.getTime();
  if (msUntilEnd <= 0) return null;
  if (msUntilStart <= 0) return { label: "Class is live now", tone: "live", target: window.start };
  return { label: "Upcoming", tone: "upcoming", target: window.start };
}

// Same parseable-date assumption relativeDayLabel already relies on
// ("Monday, Aug 24" / "Aug 28, 2026" both parse natively) — used for the
// Upcoming Classes row's compact date badge (month + day number).
function monthDayParts(dateStr: string): { month: string; day: string } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(), day: String(d.getDate()) };
}

// "Aug 25, 2026" parses natively; the private-lesson fallback's stale
// seed dates don't, so callers fall back to the literal string for those.
function relativeDayLabel(dateStr: string, now: Date | null): string {
  const target = new Date(dateStr);
  if (!now || Number.isNaN(target.getTime())) return dateStr;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) return target.toLocaleDateString("en-US", { weekday: "long" });
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface UpcomingCard {
  key: string;
  dayLabel: string;
  month: string;
  dayNum: string;
  title: string;
  tutor: string;
  typeLabel: string;
  timeLabel: string;
  seatsLabel?: string;
  href: string;
  theme: ClassTheme;
  icon: typeof Calculator;
}

interface TodayClassItem {
  key: string;
  icon: typeof Calculator;
  title: string;
  tutor: string;
  typeLabel: string;
  timeLabel: string;
  statusLabel: string;
  statusTone: "live" | "upcoming";
  classroomHref: string;
  detailsHref: string;
  canEnter: boolean;
  disabledHint?: ReactNode;
  startMs: number;
}

export function StudentDashboardClient() {
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());
  const [taskDoneOverrides, setTaskDoneOverrides] = useState<Record<string, boolean>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const nowMs = useNowMs();
  const now = nowMs ? new Date(nowMs) : null;
  const accountMenuItems = buildStudentAccountMenuItems(hasCounsellingRecords(dashboardStudent.name));

  function dismissMilestone(id: string) {
    setDismissedMilestones((prev) => new Set(prev).add(id));
  }

  function toggleTask(id: string) {
    const task = studentStudyTasks.find((t) => t.id === id);
    if (!task) return;
    const next = !(taskDoneOverrides[id] ?? task.done);
    task.done = next;
    setTaskDoneOverrides((prev) => ({ ...prev, [id]: next }));
  }

  const { notifications: studentNotifications } = useStudentNotifications();
  const visibleMilestone = studentMilestoneExamples.find((m) => !dismissedMilestones.has(m.id));
  const unreadNotifications = studentNotifications.filter((n) => n.unread).length;

  const me = useStudentIdentity();
  const firstName = me.firstName;

  // Real, store-backed private lessons (a booking made through the actual
  // find-a-tutor flow) merged ahead of the static seed rows — the same
  // precedent my-lessons-client.tsx already established, so a student's own
  // real booking shows up here too instead of only on the Lessons page.
  const realPrivateLessons = usePrivateLessons()
    .filter((l) => l.student === dashboardStudent.name && isValidBookingReference(l.id))
    .map(privateLessonToStudentLesson);
  const allPrivateLessons: StudentLesson[] = [...realPrivateLessons, ...studentLessons];

  const { lessons: allConfirmations } = useLessonConfirmations();
  const hasConfirmationActivity = allConfirmations.some((l) => l.student === dashboardStudent.name);

  // Real time-derived check (isNotYetOver) — never the raw stored `status`
  // field alone, which is never rewritten once real time moves past it.
  const upcomingLesson = allPrivateLessons.find((l) => l.status !== "Cancelled" && isNotYetOver(l, nowMs)) ?? null;
  const todaysGroupClass = studentGroupClasses.find((c) => c.nextSessionStartsToday);

  // A group class's "starts today" flag is fixed seed data; the real
  // schedule window is computed live. If the window has already passed
  // (this demo has been open a while), fall back to the private lesson
  // instead of hero-ing a class that's actually over.
  const groupWindow = todaysGroupClass ? groupWindowAsDates(todaysGroupClass) : null;
  const groupStillValidToday = !now || !groupWindow || groupWindow.end.getTime() > now.getTime();
  const groupHappensToday = Boolean(todaysGroupClass) && groupStillValidToday;

  const hasAnyEngagement = Boolean(upcomingLesson) || studentGroupClasses.length > 0 || hasConfirmationActivity;

  // Today's Classes: real classes whose actual start time falls within
  // today's calendar day — not just "whichever is chronologically next"
  // (which could be days away). Only ever non-empty when a class genuinely
  // occupies today, matching the "no classes today" empty state honestly.
  // Today's calendar date in Africa/Lagos — never the local machine's own
  // "today" (see platform-time.ts). A server/browser in a different
  // timezone could otherwise disagree with Lagos about what day it is,
  // especially near midnight.
  const todayParts = getPlatformTodayParts(nowMs);
  const startOfTodayMs = platformWallTimeToMs(todayParts.year, todayParts.month, todayParts.day, 0, 0);
  function isTodayMs(ms: number): boolean {
    return ms >= startOfTodayMs && ms < startOfTodayMs + 86_400_000;
  }
  const todaysPrivateLesson =
    allPrivateLessons.find((l) => l.status !== "Cancelled" && isNotYetOver(l, nowMs) && isTodayMs(getPrivateLessonTimeRange(l).startMs)) ?? null;

  const todaysClasses: TodayClassItem[] = [];
  if (groupHappensToday && todaysGroupClass && groupWindow) {
    const status = liveClassStatus(groupWindow, now);
    const entryState = getClassEntryState({ startMs: groupWindow.start.getTime(), endMs: groupWindow.end.getTime(), role: "student", nowMs });
    const canEnter = canEnterClassroom(entryState);
    const disabledHint =
      entryState === "too-early"
        ? entryOpensHint(groupWindow.start.getTime() - STUDENT_ENTRY_WINDOW_MS, nowMs)
        : entryState === "ended"
          ? "This class has ended"
          : undefined;
    todaysClasses.push({
      key: `today-group-${todaysGroupClass.id}`,
      icon: subjectIcon(todaysGroupClass.subject),
      title: todaysGroupClass.title,
      tutor: todaysGroupClass.tutor,
      typeLabel: `Group Class · ${todaysGroupClass.mode} · ${todaysGroupClass.seatsFilled}/${todaysGroupClass.seatsTotal} students`,
      timeLabel: todaysGroupClass.schedule.split("· ")[1] ?? todaysGroupClass.nextClass,
      statusLabel: status?.tone === "live" ? "In progress" : "Upcoming",
      statusTone: status?.tone === "live" ? "live" : "upcoming",
      classroomHref: `/student-dashboard/classroom/group/${todaysGroupClass.id}`,
      detailsHref: `/student-dashboard/group-classes/${todaysGroupClass.id}`,
      canEnter,
      disabledHint,
      startMs: groupWindow.start.getTime(),
    });
  }
  if (todaysPrivateLesson) {
    const range = getPrivateLessonTimeRange(todaysPrivateLesson);
    const entryState = getClassEntryState({ ...range, role: "student", nowMs });
    const paid = hasSessionAccess(todaysPrivateLesson.bookingId ?? todaysPrivateLesson.id, todaysPrivateLesson.id, dashboardStudent.name);
    const canEnter = canEnterClassroom(entryState) && paid;
    const disabledHint = !paid
      ? "Payment required to join this session"
      : entryState === "too-early"
        ? entryOpensHint(range.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs)
        : entryState === "ended"
          ? "This class has ended"
          : undefined;
    todaysClasses.push({
      key: `today-private-${todaysPrivateLesson.id}`,
      icon: subjectIcon(todaysPrivateLesson.subject),
      title: todaysPrivateLesson.subject,
      tutor: todaysPrivateLesson.tutor,
      typeLabel: `Private · ${todaysPrivateLesson.mode}`,
      timeLabel: todaysPrivateLesson.time,
      statusLabel: entryState === "live" ? "In progress" : "Upcoming",
      statusTone: entryState === "live" ? "live" : "upcoming",
      classroomHref: `/student-dashboard/classroom/private/${todaysPrivateLesson.id}`,
      detailsHref: `/student-dashboard/lessons/class/${todaysPrivateLesson.id}`,
      canEnter,
      disabledHint,
      startMs: range.startMs,
    });
  }
  todaysClasses.sort((a, b) => a.startMs - b.startMs);

  const todayTasks = studentStudyTasks
    .filter((t) => t.dayOffset === 0)
    .map((t) => ({ ...t, done: taskDoneOverrides[t.id] ?? t.done }));
  const todayTasksCompleted = todayTasks.filter((t) => t.done).length;
  const todayTasksPct = todayTasks.length > 0 ? Math.round((todayTasksCompleted / todayTasks.length) * 100) : 0;

  const activePrivateClasses = allPrivateLessons.filter((l) => l.status !== "Cancelled" && isNotYetOver(l, nowMs)).length;
  const weeklyProgressPct = Math.round(
    studentOverallProgress.subjects.reduce((sum, s) => sum + s.pct, 0) / studentOverallProgress.subjects.length
  );

  const recommendedTutors = tutorListings
    .filter((t) => t.subject === RECOMMENDED_SUBJECT && t.levels.includes(EXAM_TRACK_LEVEL))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const enrolledTitles = new Set(studentGroupClasses.map((c) => c.title));
  const groupClassesForLevel = groupClassListings
    .filter((g) => g.gradeLevel === me.level && !enrolledTitles.has(g.title))
    .slice(0, 2);

  // Upcoming Classes: each enrolled group class's next session after
  // whichever one is already shown in Today's Classes (if any), plus the
  // private lesson when it isn't already shown there either. Real data
  // only — no fabricated discovery-session slot for a persona that has none.
  const upcomingClasses: UpcomingCard[] = [];
  for (const gc of studentGroupClasses) {
    const upcoming = gc.sessions.filter((s) => s.status === "Upcoming");
    const session = groupHappensToday && gc.id === todaysGroupClass?.id ? upcoming[1] : upcoming[0];
    if (!session) continue;
    const gcDateParts = monthDayParts(session.date);
    upcomingClasses.push({
      key: `gc-${gc.id}-${session.date}`,
      dayLabel: relativeDayLabel(session.date, now),
      month: gcDateParts?.month ?? "",
      dayNum: gcDateParts?.day ?? "—",
      title: gc.title,
      tutor: gc.tutor,
      typeLabel: `Group Class · ${gc.academicLevel}`,
      timeLabel: gc.schedule.split("· ")[1] ?? gc.schedule,
      seatsLabel: `${gc.seatsFilled}/${gc.seatsTotal} students`,
      href: `/student-dashboard/group-classes/${gc.id}`,
      theme: "emerald",
      icon: subjectIcon(gc.subject),
    });
  }
  if (upcomingLesson && upcomingLesson.id !== todaysPrivateLesson?.id) {
    const plDateParts = monthDayParts(upcomingLesson.date);
    upcomingClasses.push({
      key: `pl-${upcomingLesson.id}`,
      dayLabel: relativeDayLabel(upcomingLesson.date, now),
      month: plDateParts?.month ?? "",
      dayNum: plDateParts?.day ?? "—",
      title: upcomingLesson.subject,
      tutor: upcomingLesson.tutor,
      typeLabel: "Private Lesson",
      timeLabel: `${upcomingLesson.time}`,
      href: `/student-dashboard/lessons/class/${upcomingLesson.id}`,
      theme: "violet",
      icon: subjectIcon(upcomingLesson.subject),
    });
  }

  const quickStats = [
    {
      label: "Active Classes",
      value: String(activePrivateClasses),
      linkLabel: "View my classes",
      href: "/student-dashboard/lessons",
      icon: GraduationCap,
    },
    {
      label: "Upcoming Classes",
      value: String(upcomingClasses.length),
      linkLabel: "View schedule",
      href: "/student-dashboard/lessons?tab=Upcoming",
      icon: CalendarCheck,
    },
    {
      label: "Study Tasks",
      value: `${todayTasksCompleted}/${todayTasks.length}`,
      linkLabel: "Open planner",
      href: "/student-dashboard/lessons?tab=Study%20Planner",
      icon: ClipboardList,
    },
    {
      label: "Weekly Progress",
      value: `${weeklyProgressPct}%`,
      linkLabel: "View progress",
      href: "/student-dashboard/progress",
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      {/* Desktop-only header row: search already sits inline below, this adds notifications + profile quick-access alongside the greeting (sidebar's own Account section is untouched) */}
      <div className="mt-6 hidden items-start justify-between gap-4 lg:flex">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Good afternoon, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your learning today.</p>
        </div>
        <form action="/student-dashboard/find-a-tutor" className="flex h-12 w-full max-w-md items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm">
          <input
            name="q"
            placeholder="What do you want to learn?"
            aria-label="What do you want to learn?"
            className="h-full flex-1 border-0 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted"
          />
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
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                  {unreadNotifications}
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
                <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                  {studentNotifications.slice(0, 5).map((n) => {
                    const href = notificationCategoryHref[n.category] ?? "/student-dashboard/notifications";
                    return (
                      <li key={n.id}>
                        <Link href={href} onClick={() => setNotifOpen(false)} className="block rounded-xl px-2.5 py-2 text-xs hover:bg-ensena-bg-soft">
                          <p className={cn("font-medium", n.unread ? "text-ensena-ink" : "text-ensena-muted")}>{n.text}</p>
                          <p className="mt-0.5 text-ensena-muted">{n.time}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
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
              <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
                <Image src={me.image} alt={me.name} fill sizes="36px" className="object-cover" />
              </span>
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

      {/* Mobile header (search below the birthday/milestone banners, matches the mobile mockup order) */}
      <div className="mt-6 lg:hidden">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Good afternoon, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ensena-muted">Here&apos;s what&apos;s happening with your learning today.</p>
      </div>

      <BirthdayCelebration firstName={firstName} role="student" dob={me.dob} />
      <ImportantUpdatesBanner />
      <GuardianDetailsCard className="mt-6" />

      {visibleMilestone && (
        <div className="mt-6">
          <MilestoneBanner icon={visibleMilestone.icon} message={visibleMilestone.message} onDismiss={() => dismissMilestone(visibleMilestone.id)} />
        </div>
      )}

      <div className="mt-6">
        <PendingReviewsBanner />
      </div>

      <form action="/student-dashboard/find-a-tutor" className="mt-6 flex max-w-xl items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm lg:hidden">
        <Search className="size-4.5 shrink-0 text-ensena-muted" />
        <input
          name="q"
          placeholder="What do you want to learn?"
          aria-label="What do you want to learn?"
          className="h-12 flex-1 border-0 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted"
        />
      </form>

      {!hasAnyEngagement ? (
        <>
          {/* New student: welcome + start-learning CTAs, no fabricated activity/progress */}
          <div className="mt-6 rounded-3xl border border-ensena-primary/20 bg-ensena-primary/5 p-6 sm:p-8">
            <h2 className="font-heading text-xl font-semibold text-ensena-ink">Welcome to Ensena, {firstName} 👋</h2>
            <p className="mt-1.5 text-sm text-ensena-muted">Let&apos;s find the right tutor or class for you.</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button nativeButton={false} render={<Link href="/student-dashboard/find-a-tutor" />} className="h-11 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
                Find a Tutor
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/student-dashboard/group-classes" />}
                className="h-11 rounded-full border-ensena-border bg-ensena-surface px-5 text-sm font-medium"
              >
                Explore Group Classes
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h3 className="font-heading text-sm font-semibold text-ensena-ink">Your Learning</h3>
              <p className="mt-1.5 text-sm text-ensena-muted">You haven&apos;t started a class yet. Book your first lesson and your learning activity will appear here.</p>
              <Link href="/student-dashboard/find-a-tutor" className="mt-3 inline-flex text-xs font-semibold text-ensena-primary hover:underline">
                Find your first tutor →
              </Link>
            </div>
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h3 className="font-heading text-sm font-semibold text-ensena-ink">Study Planner</h3>
              <p className="mt-1.5 text-sm text-ensena-muted">Plan your learning once you start. Your study tasks will appear here.</p>
              <Link href="/student-dashboard/lessons?tab=Study%20Planner" className="mt-3 inline-flex text-xs font-semibold text-ensena-primary hover:underline">
                Open Study Planner →
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Quick stats — kept deliberately restrained (white cards, neutral
              icon badge, Enseña red only on the action link) rather than the
              tutor dashboard's colored stat cards, per the student-specific
              "not highly colorful" direction. */}
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

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            {/* Today's Classes */}
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-start-1 xl:row-start-1">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Classes</h2>
                <Link href="/student-dashboard/lessons" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View full schedule <ChevronRight className="size-3" />
                </Link>
              </div>
              {todaysClasses.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-1.5 py-8 text-center">
                  <p className="text-sm font-semibold text-ensena-ink">No classes today 🎉</p>
                  <p className="text-xs text-ensena-muted">You have some time to keep learning.</p>
                  <Link href="/student-dashboard/lessons?tab=Study%20Planner" className="mt-2 text-xs font-semibold text-ensena-primary hover:underline">
                    Continue with Study Planner →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                  {todaysClasses.map((c, i) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.key} className={cn("flex flex-wrap items-center gap-3 py-3.5", i === 0 && "pt-0")}>
                        <div className="w-16 shrink-0 text-sm font-semibold text-ensena-ink">{c.timeLabel}</div>
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                          <p className="truncate text-xs text-ensena-muted">with {c.tutor} · {c.typeLabel}</p>
                          {c.disabledHint && <p className="mt-0.5 text-xs font-medium text-ensena-primary">{c.disabledHint}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                              c.statusTone === "live" ? "bg-rose-100 text-rose-700" : "bg-ensena-bg-soft text-ensena-muted"
                            )}
                          >
                            {c.statusTone === "live" && <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />}
                            {c.statusLabel}
                          </span>
                          <Button
                            disabled={!c.canEnter}
                            nativeButton={false}
                            render={<Link href={c.classroomHref} />}
                            className="h-8 rounded-full border border-ensena-primary bg-white px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                          >
                            <Video className="size-3.5" /> Enter Classroom
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Study Plan — precedes Upcoming Classes/Group Class
                Sessions in source order so the mobile single-column stack
                matches the spec's priority order; xl:row-start-3 still
                places it correctly in the desktop grid regardless of
                source order. */}
            {todayTasks.length > 0 && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-start-1 xl:row-start-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Study Plan</h2>
                  <Link href="/student-dashboard/lessons?tab=Study%20Planner" className="text-xs font-semibold text-ensena-primary hover:underline">Open Planner →</Link>
                </div>
                <p className="mt-1 text-sm text-ensena-muted">{todayTasksCompleted} of {todayTasks.length} tasks completed</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-ensena-primary transition-all" style={{ width: `${todayTasksPct}%` }} />
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {todayTasks.map((task) => (
                    <li key={task.id}>
                      <button type="button" onClick={() => toggleTask(task.id)} className="flex w-full items-center gap-2.5 text-left">
                        {task.done ? (
                          <CheckCircle2 className="size-4.5 shrink-0 fill-rose-100 text-rose-600" />
                        ) : (
                          <Circle className="size-4.5 shrink-0 text-ensena-muted" />
                        )}
                        <span className={cn("min-w-0 flex-1 truncate text-sm", task.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{task.label}</span>
                        <span className={cn("shrink-0 text-xs", task.done ? "text-ensena-muted" : "text-ensena-primary")}>{task.done ? "Completed" : "Due today"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3">
                  <TrendingUp className="size-4 shrink-0 text-rose-500" />
                  <p className="text-xs font-medium text-rose-700">{todayTasksCompleted === todayTasks.length ? "All done for today! 🎉" : "Keep going! You're on track."}</p>
                </div>
              </div>
            )}

            {/* Lesson Confirmations */}
            <div className="xl:col-start-2 xl:row-start-1">
              <EscrowConfirmationPanel />
            </div>

            {/* Upcoming Classes — wide list rows (matching Today's Classes'
                own row treatment) rather than a horizontal-scroll strip of
                narrow cards, so the column's full width is actually used
                instead of leaving whitespace beside 2-3 visible tiles. */}
            {upcomingClasses.length > 0 && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-start-1 xl:row-start-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Classes</h2>
                  <Link href="/student-dashboard/lessons" className="text-xs font-semibold text-ensena-primary hover:underline">View all →</Link>
                </div>
                <div className="mt-4 flex flex-col divide-y divide-ensena-border">
                  {upcomingClasses.map((c, i) => {
                    const theme = THEME_CLASSES[c.theme];
                    const Icon = c.icon;
                    return (
                      <div key={c.key} className={cn("flex flex-wrap items-center gap-3 py-3.5 sm:flex-nowrap", i === 0 && "pt-0")}>
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-ensena-bg-soft py-1.5 text-ensena-ink">
                          <span className="text-[9px] font-semibold uppercase text-ensena-muted">{c.month || c.dayLabel}</span>
                          <span className="text-sm font-bold leading-none">{c.dayNum}</span>
                        </div>
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", theme.iconBg, theme.iconColor)}>
                          <Icon className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                          <p className="truncate text-xs text-ensena-muted">with {c.tutor} · {c.typeLabel}</p>
                          <p className="truncate text-xs text-ensena-muted">
                            {c.timeLabel} · Online{c.seatsLabel ? ` · ${c.seatsLabel}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={c.href} />}
                          className={cn("h-9 shrink-0 rounded-full bg-white px-4 text-xs font-semibold", theme.button)}
                        >
                          View Class
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group Class Sessions */}
            <div className="xl:col-start-2 xl:row-start-2">
              <GroupSessionReportPanel />
            </div>

            {/* Counselling — only appears once the student has real counselling records (an upcoming/in-progress session, or completed history) */}
            <div className="xl:col-start-2 xl:row-start-3">
              <CounsellingDashboardCard studentName={dashboardStudent.name} />
            </div>

            {/* Recommended for You */}
            {recommendedTutors.length > 0 && (
              <div className="xl:col-start-1 xl:row-start-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-ensena-ink">Recommended for You</h2>
                    <p className="text-xs text-ensena-muted">Based on your {[me.level, me.course].filter(Boolean).join(" · ")}{me.subjects.length > 0 ? ` + ${me.subjects.slice(0, 2).join(", ")}` : ""} profile</p>
                  </div>
                  <Link href="/student-dashboard/find-a-tutor" className="shrink-0 text-xs font-semibold text-ensena-primary hover:underline">View all tutors →</Link>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                  {recommendedTutors.map((t) => (
                    <RecommendedTutorCard key={t.slug} tutor={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="xl:col-start-1 xl:row-start-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Quick Actions</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Find a Tutor", subtitle: "1-on-1 private lessons", icon: Search, href: "/student-dashboard/find-a-tutor" },
                  { label: "Explore Group Classes", subtitle: "Learn with other students", icon: Users2, href: "/student-dashboard/group-classes" },
                  { label: "Study Planner", subtitle: "Plan and track your study", icon: ClipboardList, href: "/student-dashboard/lessons?tab=Study%20Planner" },
                  { label: "Speak to a Counsellor", subtitle: "Get free guidance", icon: MessageCircle, href: "/counsellor" },
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
            </div>

            {/* Group Classes for Your Level */}
            {groupClassesForLevel.length > 0 && (
              <div className="xl:col-start-1 xl:row-start-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold text-ensena-ink">Group Classes for {me.level}</h2>
                  <Link href="/student-dashboard/group-classes" className="text-xs font-semibold text-ensena-primary hover:underline">Explore Group Classes →</Link>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                  {groupClassesForLevel.map((g) => (
                    <div key={g.slug} className="w-64 shrink-0 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:w-auto">
                      <div className="flex items-center gap-2.5">
                        <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
                          <Image src={g.image} alt={g.tutorName} fill sizes="36px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{g.title}</p>
                          <p className="truncate text-xs text-ensena-muted">{g.tutorName}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-ensena-muted">{g.gradeLevel} · {g.subject}</p>
                      <p className="text-xs text-ensena-muted">{g.days} · {g.time}</p>
                      <p className="text-xs text-ensena-muted">{g.enrolled}/{g.maxSeats} students</p>
                      <p className="mt-1 text-sm font-semibold text-ensena-ink">{formatNaira(g.price)}/session</p>
                      <Button variant="outline" nativeButton={false} render={<Link href={`/group-classes/${g.slug}`} />} className="mt-2.5 h-9 w-full rounded-full border-ensena-border text-xs font-semibold">
                        View Class
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
