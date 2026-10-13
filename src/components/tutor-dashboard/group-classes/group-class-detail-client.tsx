"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Globe,
  Hash,
  Languages,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Target,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { buildBookingReference } from "@/lib/booking-reference";
import { useTodayISO } from "@/hooks/use-today-iso";
import { useReviews } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { computeWeekNumber } from "@/lib/schedule-week";
import { submitReview } from "@/lib/reviews-store";
import {
  buildGroupClassCohorts,
  buildGroupClassSessions,
  buildSessionAttendance,
  dashboardTutor,
  findStudentIdByName,
  groupClassStatusStyles,
  studentAttendancePct,
  type EnrolledStudent,
  type GroupClassSessionInstance,
  type MyGroupClass,
  type MyGroupClassCohort,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "Students", "Sessions", "Attendance", "Settings"] as const;
type Tab = (typeof tabs)[number];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function parseISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthDay(dateISO: string): string {
  return parseISO(dateISO).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSessionDayLabel(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return `Today · ${monthDay(dateISO)}`;
  const weekday = parseISO(dateISO).toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} · ${monthDay(dateISO)}`;
}

function formatDateRange(cohort: MyGroupClassCohort): string {
  const start = parseISO(cohort.startDate);
  const end = parseISO(cohort.endDate);
  const weeks = Math.round((end.getTime() - start.getTime()) / (7 * 86_400_000));
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel} (${weeks} weeks)`;
}

function InfoRow({ icon: Icon, label, value, isLink }: { icon: typeof Calendar; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
      <div className="min-w-0">
        <p className="text-xs text-ensena-muted">{label}</p>
        {isLink ? (
          <a href={value} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-ensena-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-ensena-ink">{value}</p>
        )}
      </div>
    </div>
  );
}

export function GroupClassDetailClient({ groupClass: initialGroupClass }: { groupClass: MyGroupClass }) {
  const router = useRouter();
  const todayISO = useTodayISO();
  const searchParams = useSearchParams();
  // Right when the tutor ends a Group Class, classroom-shell.tsx lands them
  // here with ?reviewPrompt=1 — jump straight to the Students tab (where
  // each student gets their own individual "Review Student" action, see
  // below) instead of the default Overview, and surface a one-time banner
  // there. Reviews are per (class, tutor, student) — never one generic
  // review for the whole group — so this never auto-opens a single shared
  // modal the way the Private-lesson popup does.
  const reviewPromptActive = searchParams.get("reviewPrompt") === "1";
  const [groupClass, setGroupClass] = useState(initialGroupClass);
  const [tab, setTab] = useState<Tab>(() => (reviewPromptActive ? "Students" : "Overview"));
  const [reviewBannerDismissed, setReviewBannerDismissed] = useState(false);
  const [reviewingStudent, setReviewingStudent] = useState<EnrolledStudent | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const allReviews = useReviews();

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [endClassOpen, setEndClassOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const cohortData = useMemo(() => buildGroupClassCohorts(todayISO), [todayISO]);
  const cohorts = cohortData[groupClass.id];
  const current = cohorts?.currentCohort ?? null;
  const next = cohorts?.nextCohort ?? null;
  const currentFull = current ? current.seatsFilled >= current.seatsTotal : false;
  const currentPct = current ? Math.round((current.seatsFilled / current.seatsTotal) * 100) : 0;
  const nextPct = next ? Math.round((next.seatsFilled / next.seatsTotal) * 100) : 0;

  const roster: EnrolledStudent[] = current ? groupClass.students.slice(0, current.seatsFilled) : groupClass.students;

  const sessions = useMemo(
    () => (current ? buildGroupClassSessions(groupClass, current, todayISO) : []),
    [groupClass, current, todayISO]
  );
  const upcomingSessions = sessions.filter((s) => s.status !== "Completed");
  const completedSessions = sessions.filter((s) => s.status === "Completed");
  const sessionsByWeek = useMemo(() => {
    const map = new Map<number, typeof sessions>();
    if (!current) return map;
    for (const s of sessions) {
      const wk = computeWeekNumber(current.startDate, s.dateISO);
      map.set(wk, [...(map.get(wk) ?? []), s]);
    }
    return map;
  }, [sessions, current]);
  // "Review Student" only unlocks once the whole cohort's programme is
  // done — a materially stricter gate than "at least one session
  // completed", which the roster's attendance-% display still uses as-is.
  const allSessionsComplete = sessions.length > 0 && sessions.every((s) => s.status === "Completed");

  // One review per (this group class, tutor, that specific student) — see
  // reviews-store.ts's hasReviewed, whose dedup key is direction + bookingId
  // + reviewer + recipient specifically so the SAME bookingId (this class)
  // can carry a separate review per student rather than blocking after the
  // first one.
  function hasReviewedStudent(studentName: string): boolean {
    return allReviews.some(
      (r) => r.direction === "tutor-to-student" && r.bookingId === groupClass.id && r.reviewerName === dashboardTutor.name && r.recipientName === studentName
    );
  }
  const nextSession = upcomingSessions[0] ?? null;

  const avgAttendancePct =
    roster.length > 0 ? Math.round(roster.reduce((sum, _, i) => sum + studentAttendancePct(sessions, i), 0) / roster.length) : 0;
  const assignmentSlots = completedSessions.length * roster.length;
  const assignmentsSubmitted = Math.round(assignmentSlots * 0.86);

  const statusLabel = current ? (currentFull ? "Full" : "Active") : groupClass.status;
  const statusClass = current
    ? currentFull
      ? "bg-rose-100 text-rose-700"
      : "bg-emerald-100 text-emerald-700"
    : groupClassStatusStyles[groupClass.status];

  // Attendance tab: which session is being marked, and any edits the tutor
  // has made this session (defaults come from buildSessionAttendance's
  // deterministic pattern — the same one studentAttendancePct uses, so the
  // "Average attendance" figure and each row's default checkmark always
  // agree until the tutor actually overrides one).
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const defaultSessionId = useMemo(() => {
    const live = sessions.find((s) => s.status === "Live");
    if (live) return live.id;
    const lastCompleted = [...sessions].reverse().find((s) => s.status === "Completed");
    if (lastCompleted) return lastCompleted.id;
    return sessions[0]?.id ?? null;
  }, [sessions]);
  const activeSessionId = selectedSessionId ?? defaultSessionId;
  const attendanceSession: GroupClassSessionInstance | null = sessions.find((s) => s.id === activeSessionId) ?? null;
  const attendanceSessionIndex = attendanceSession ? sessions.findIndex((s) => s.id === attendanceSession.id) : -1;
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const baseMarks = attendanceSession && attendanceSessionIndex >= 0 ? buildSessionAttendance(attendanceSession, attendanceSessionIndex, roster) : {};
  const marks = attendanceSession ? (attendanceOverrides[attendanceSession.id] ?? baseMarks) : {};
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  function setMark(name: string, present: boolean) {
    if (!attendanceSession) return;
    setAttendanceOverrides((prev) => ({
      ...prev,
      [attendanceSession.id]: { ...(prev[attendanceSession.id] ?? baseMarks), [name]: present },
    }));
  }

  function markAllPresent() {
    if (!attendanceSession) return;
    setAttendanceOverrides((prev) => ({
      ...prev,
      [attendanceSession.id]: Object.fromEntries(roster.map((s) => [s.name, true])),
    }));
  }

  function saveAttendance() {
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 2000);
  }

  // Settings tab form state — local edits only (no backend), mirrored back
  // onto `groupClass` on Save so the rest of the page (header, info row,
  // sessions) reflects the change immediately.
  const [settingsTitle, setSettingsTitle] = useState(groupClass.title);
  const [settingsSubject, setSettingsSubject] = useState(groupClass.subject);
  const [settingsLevel, setSettingsLevel] = useState(groupClass.level);
  const [settingsDescription, setSettingsDescription] = useState(groupClass.description ?? "");
  const [settingsLanguage, setSettingsLanguage] = useState(groupClass.language ?? "English");
  const scheduleParts = groupClass.schedule.split("·").map((s) => s.trim());
  const [settingsDays, setSettingsDays] = useState(scheduleParts[0] ?? "");
  const [settingsTime, setSettingsTime] = useState(scheduleParts[1] ?? "");
  const [settingsDuration, setSettingsDuration] = useState(groupClass.durationMinutes ?? 60);
  const [settingsMaxStudents, setSettingsMaxStudents] = useState(groupClass.seatsTotal);
  const [settingsPrice, setSettingsPrice] = useState(groupClass.price);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const sessionsPerWeek = Math.max(1, settingsDays.split(",").filter((d) => d.trim()).length);
  const weeklyPrice = settingsPrice * sessionsPerWeek;
  const monthlyPrice = weeklyPrice * 4;

  function saveSettings() {
    setGroupClass((prev) => ({
      ...prev,
      title: settingsTitle,
      subject: settingsSubject,
      level: settingsLevel,
      description: settingsDescription,
      language: settingsLanguage,
      schedule: settingsTime ? `${settingsDays} · ${settingsTime}` : settingsDays,
      durationMinutes: settingsDuration,
      seatsTotal: settingsMaxStudents,
      price: settingsPrice,
    }));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  const backLink = (
    <Link href="/tutor-dashboard/private-lessons?tab=Group Classes" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
      ← Back to Group Classes
    </Link>
  );

  return (
    <div>
      <div className="lg:hidden">{backLink}</div>
      <TutorTopBar primaryAction={backLink} />

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink lg:mt-0">Manage Group Class</h1>
      <p className="mt-1 text-sm text-ensena-muted">View and manage all details of your group class.</p>

      {/* Header card */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${groupClass.color}1A`, color: groupClass.color }}>
              <Users className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">{groupClass.title}</h2>
              <p className="text-sm font-medium" style={{ color: groupClass.color }}>{groupClass.subject}</p>
              <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusClass)}>{statusLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href={`/tutor-dashboard/classroom/group/${groupClass.id}`} />}
              variant="outline"
              className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <Video className="size-3.5" /> Enter Classroom
            </Button>
            <div className="relative">
              <button
                type="button"
                aria-label="More options"
                onClick={() => setHeaderMenuOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <MoreHorizontal className="size-4" />
              </button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setHeaderMenuOpen(false); setTab("Settings"); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      <Pencil className="size-3.5" /> Edit Class
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHeaderMenuOpen(false); setEndClassOpen(true); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <XCircle className="size-3.5" /> End Class
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ensena-muted">
          <span className="flex items-center gap-1.5"><Globe className="size-3.5" /> Online Class</span>
          <span className="flex items-center gap-1.5"><Coins className="size-3.5" /> {formatNaira(groupClass.price)} / session</span>
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Max {current?.seatsTotal ?? groupClass.seatsTotal} students</span>
          {groupClass.durationMinutes && (
            <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> {groupClass.durationMinutes} mins / session</span>
          )}
          <span className="flex items-center gap-1.5 font-mono"><Hash className="size-3.5" /> {buildBookingReference("class", groupClass.id)}</span>
        </div>
      </div>

      {/* Tab strip */}
      <div className="mt-5 flex w-full max-w-full gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm lg:w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors",
              tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {t}{t === "Students" ? ` (${roster.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-5">
          {/* Cohorts — left column, row 1 */}
          <div className="lg:col-start-1 lg:row-start-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {current && (
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ensena-ink">Current Cohort</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", currentFull ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                      {currentFull ? "Full" : "In Progress"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ensena-ink">{formatDateRange(current)}</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">{current.seatsFilled} / {current.seatsTotal} students enrolled</p>
                  {roster.length > 0 && (
                    <div className="mt-2.5 flex items-center -space-x-1.5">
                      {roster.slice(0, 4).map((s) => (
                        <span key={s.name} className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-ensena-primary/10 text-[10px] font-semibold text-ensena-primary">
                          {initials(s.name)}
                        </span>
                      ))}
                      {roster.length > 4 && (
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-ensena-bg-soft text-[10px] font-semibold text-ensena-ink">
                          +{roster.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                      <div className={cn("h-full rounded-full", currentFull ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${currentPct}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-ensena-muted">{currentPct}% full</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("Students")}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    View Cohort Details
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ensena-ink">Next Cohort</p>
                  {next && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Open for Enrollment</span>}
                </div>
                {next ? (
                  <>
                    <p className="mt-2 text-sm text-ensena-ink">{formatDateRange(next)}</p>
                    <p className="mt-0.5 text-xs text-ensena-muted">{next.seatsFilled} / {next.seatsTotal} students enrolled</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${nextPct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-ensena-muted">{nextPct}% full</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("Students")}
                      className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      View Next Cohort
                    </button>
                  </>
                ) : (
                  <>
                    <span className="mt-2 inline-block rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-semibold text-ensena-muted">Not Scheduled</span>
                    <p className="mt-2 text-xs text-ensena-muted">No next cohort scheduled yet. Create the next cohort to keep your class running.</p>
                    <Link
                      href="/tutor-dashboard/private-lessons?tab=Group Classes"
                      className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/15"
                    >
                      <Plus className="size-3.5" /> Schedule Next Cohort
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions — right column, row 1 */}
          <div className="lg:col-start-2 lg:row-start-1">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="flex flex-col divide-y divide-ensena-border">
                <button type="button" onClick={() => setTab("Settings")} className="flex items-center justify-between gap-2 py-3 text-sm font-medium text-ensena-ink first:pt-0">
                  <span className="flex items-center gap-2"><Pencil className="size-4 text-ensena-primary" /> Edit Class</span>
                  <ChevronRight className="size-4 text-ensena-muted" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/tutor-dashboard/messages?class=${encodeURIComponent(groupClass.title)}`)}
                  className="flex items-center justify-between gap-2 py-3 text-sm font-medium text-ensena-ink"
                >
                  <span className="flex items-center gap-2"><MessageSquare className="size-4 text-ensena-primary" /> Message Students</span>
                  <ChevronRight className="size-4 text-ensena-muted" />
                </button>
                <div className="relative">
                  <button type="button" onClick={() => setActionsMenuOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 py-3 text-sm font-medium text-ensena-ink last:pb-0">
                    <span className="flex items-center gap-2"><MoreHorizontal className="size-4 text-ensena-primary" /> More Actions</span>
                    <ChevronRight className="size-4 text-ensena-muted" />
                  </button>
                  {actionsMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActionsMenuOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 top-full z-20 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { setActionsMenuOpen(false); setPauseOpen(true); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
                        >
                          Pause Class
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActionsMenuOpen(false); setDeleteOpen(true); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                        >
                          Delete Class
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Class Summary — right column, row 2 */}
          <div className="lg:col-start-2 lg:row-start-2">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Class Summary</h2>
                <Link href="/tutor-dashboard/homework" className="text-xs font-semibold text-ensena-primary hover:underline">View all</Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div><p className="text-xs text-ensena-muted">Total Students</p><p className="font-semibold text-ensena-ink">{current?.seatsTotal ?? groupClass.seatsTotal}</p></div>
                <div><p className="text-xs text-ensena-muted">Attendance (Avg.)</p><p className="font-semibold text-ensena-ink">{avgAttendancePct}%</p></div>
                <div><p className="text-xs text-ensena-muted">Enrolled</p><p className="font-semibold text-ensena-ink">{roster.length}</p></div>
                <div><p className="text-xs text-ensena-muted">Assignments Submitted</p><p className="font-semibold text-ensena-ink">{assignmentsSubmitted} / {assignmentSlots}</p></div>
                <div><p className="text-xs text-ensena-muted">Spots Left</p><p className="font-semibold text-ensena-ink">{Math.max(0, (current?.seatsTotal ?? groupClass.seatsTotal) - roster.length)}</p></div>
                <div><p className="text-xs text-ensena-muted">Upcoming Session</p><p className="font-semibold text-ensena-ink">{nextSession ? `${formatSessionDayLabel(nextSession.dateISO, todayISO)}, ${nextSession.startLabel}` : "Not scheduled"}</p></div>
              </div>
            </div>
          </div>

          {/* Upcoming Sessions — right column, row 3 */}
          <div className="lg:col-start-2 lg:row-start-3">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Upcoming Sessions</h2>
                <button type="button" onClick={() => setTab("Sessions")} className="text-xs font-semibold text-ensena-primary hover:underline">View all</button>
              </div>
              <div className="mt-3 flex flex-col divide-y divide-ensena-border">
                {upcomingSessions.length === 0 && <p className="py-3 text-sm text-ensena-muted">No upcoming sessions scheduled.</p>}
                {upcomingSessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.status === "Live" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
                      <Video className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ensena-ink">{formatSessionDayLabel(s.dateISO, todayISO)} · {s.startLabel} – {s.endLabel}</p>
                      <p className="truncate text-xs text-ensena-muted">Topic: {s.topic}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.status === "Live" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>{s.status}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setTab("Sessions")} className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                View Full Schedule
              </button>
            </div>
          </div>

          {/* Class Information — left column, row 2 */}
          <div className="lg:col-start-1 lg:row-start-2">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Class Information</h2>
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <InfoRow icon={Calendar} label="Days" value={groupClass.schedule.split("·")[0]?.trim() ?? "—"} />
                <InfoRow icon={Target} label="Class" value={groupClass.classGrade ?? "—"} />
                <InfoRow icon={Target} label="Educational Level" value={groupClass.level} />
                <InfoRow icon={Clock} label="Time" value={groupClass.schedule.split("·")[1]?.trim() ?? "—"} />
                <InfoRow icon={Link2} label="Class Link" value={groupClass.classLink ?? "—"} isLink={Boolean(groupClass.classLink)} />
                <InfoRow icon={Clock} label="Duration" value={groupClass.durationMinutes ? `${groupClass.durationMinutes} minutes per session` : "—"} />
                <InfoRow icon={Calendar} label="Created" value={groupClass.createdDate ?? "—"} />
                <InfoRow icon={Languages} label="Language" value={groupClass.language ?? "—"} />
                <InfoRow icon={RefreshCw} label="Last Updated" value={groupClass.lastUpdatedDate ?? "—"} />
              </div>
            </div>
          </div>

          {/* Edit Class Details — left column, row 3 */}
          <div className="lg:col-start-1 lg:row-start-3">
            <button
              type="button"
              onClick={() => setTab("Settings")}
              className="flex h-11 w-full items-center justify-center rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
            >
              Edit Class Details
            </button>
          </div>
        </div>
      )}

      {tab === "Students" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          {reviewPromptActive && !reviewBannerDismissed && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-ensena-primary/20 bg-ensena-primary/5 p-3.5">
              <p className="text-sm text-ensena-ink">Class ended. Leave a review for each student who attended below. You can also do this later.</p>
              <button type="button" aria-label="Dismiss" onClick={() => setReviewBannerDismissed(true)} className="shrink-0 rounded-full p-1 text-ensena-muted hover:bg-white">
                <X className="size-4" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Students Enrolled ({roster.length})</h2>
            <select disabled value="current" className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-xs text-ensena-ink disabled:opacity-70">
              <option value="current">Current Cohort</option>
            </select>
          </div>
          {roster.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">No students enrolled yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {roster.map((s, i) => {
                const studentId = findStudentIdByName(s.name);
                return (
                  <li key={s.name} className="flex flex-col gap-3 rounded-xl border border-ensena-border p-3 sm:flex-row sm:items-center">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(s.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ensena-ink">{s.name}</p>
                      <p className="text-xs text-ensena-muted">{groupClass.level} · {studentAttendancePct(sessions, i)}% attendance</p>
                      <p className="font-mono text-[11px] text-ensena-muted">{buildBookingReference("group", `${groupClass.id}-${s.name}`)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Active</span>
                      <span className="text-ensena-muted">{nextSession ? `Next: ${formatSessionDayLabel(nextSession.dateISO, todayISO)}` : "No upcoming session"}</span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {studentId && (
                        <Link href={`/tutor-dashboard/students/${studentId}`} className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                          View Student
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(s.name)}`)}
                        className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                      >
                        Message
                      </button>
                      {allSessionsComplete &&
                        (hasReviewedStudent(s.name) ? (
                          <span className="flex h-8 items-center gap-1 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="size-3.5" /> Reviewed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReviewingStudent(s)}
                            className="flex h-8 items-center gap-1 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
                          >
                            <Star className="size-3.5" /> Review Student
                          </button>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "Sessions" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Sessions</h2>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">No sessions scheduled for the current cohort.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-5">
              {[...sessionsByWeek.entries()].map(([week, weekSessions]) => {
                const weekComplete = weekSessions.every((s) => s.status === "Completed");
                return (
                  <div key={week}>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-ensena-primary">
                      Week {week}
                      {weekComplete && (
                        <span className="flex items-center gap-1 text-ensena-success">
                          <CheckCircle2 className="size-3.5" /> Complete
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-col divide-y divide-ensena-border">
                      {weekSessions.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.status === "Completed" ? "bg-ensena-bg-soft text-ensena-success" : s.status === "Live" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
                            {s.status === "Completed" ? <CheckCircle2 className="size-4" /> : <Video className="size-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ensena-ink">{formatSessionDayLabel(s.dateISO, todayISO)} · {s.startLabel} – {s.endLabel}</p>
                            <p className="text-xs text-ensena-muted">{s.topic} · {s.attendeeCount} students</p>
                          </div>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.status === "Live" ? "bg-emerald-100 text-emerald-700" : s.status === "Completed" ? "bg-ensena-success/10 text-ensena-success" : "bg-blue-100 text-blue-700")}>{s.status}</span>
                          {s.status === "Live" && (
                            <Button
                              nativeButton={false}
                              render={<Link href={`/tutor-dashboard/classroom/group/${groupClass.id}`} />}
                              className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-ensena-primary-hover"
                            >
                              <Video className="size-3.5" /> Enter Classroom
                            </Button>
                          )}
                          {s.status === "Completed" && (
                            <button
                              type="button"
                              onClick={() => { setSelectedSessionId(s.id); setTab("Attendance"); }}
                              className="flex h-8 items-center rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "Attendance" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Attendance</h2>
            {current && <p className="text-xs text-ensena-muted">Current Cohort: {formatDateRange(current)}</p>}
          </div>
          <select
            value={attendanceSession?.id ?? ""}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            disabled={sessions.length === 0}
            className="mt-3 h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-xs text-ensena-ink disabled:opacity-70"
          >
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{formatSessionDayLabel(s.dateISO, todayISO)} · {s.startLabel}</option>
            ))}
          </select>

          {attendanceSession ? (
            <>
              <ul className="mt-4 flex flex-col gap-2">
                {roster.map((s) => {
                  const present = marks[s.name] ?? true;
                  return (
                    <li key={s.name} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                      <span className="flex items-center gap-2.5 font-medium text-ensena-ink">
                        <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(s.name)}</span>
                        {s.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMark(s.name, !present)}
                        className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", present ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}
                      >
                        {present ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />} {present ? "Present" : "Absent"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={markAllPresent} className="h-9 flex-1 rounded-full border-ensena-border text-xs font-medium">Mark All Present</Button>
                <Button onClick={saveAttendance} className="h-9 flex-1 rounded-full bg-ensena-primary text-xs font-semibold text-white">
                  {attendanceSaved ? "Saved!" : "Save Attendance"}
                </Button>
              </div>
              <p className="mt-4 text-sm text-ensena-muted">Average attendance: <span className="font-semibold text-ensena-ink">{avgAttendancePct}%</span></p>
            </>
          ) : (
            <p className="mt-4 text-sm text-ensena-muted">No sessions to take attendance for yet.</p>
          )}
        </div>
      )}

      {tab === "Settings" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Class Information</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Class name</span>
                <input value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Subject</span>
                  <input value={settingsSubject} onChange={(e) => setSettingsSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Academic level</span>
                  <input value={settingsLevel} onChange={(e) => setSettingsLevel(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Description</span>
                <textarea value={settingsDescription} onChange={(e) => setSettingsDescription(e.target.value)} rows={3} className="rounded-lg border border-ensena-border px-3 py-2 text-sm" />
              </label>
              <label className="flex max-w-xs flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Language</span>
                <input value={settingsLanguage} onChange={(e) => setSettingsLanguage(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Schedule</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Days</span>
                <input value={settingsDays} onChange={(e) => setSettingsDays(e.target.value)} placeholder="e.g. Tue, Thu" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Time</span>
                <input value={settingsTime} onChange={(e) => setSettingsTime(e.target.value)} placeholder="e.g. 6:00 PM – 7:30 PM" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Duration (minutes)</span>
                <input type="number" min={15} step={15} value={settingsDuration} onChange={(e) => setSettingsDuration(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Time zone</span>
                <input value="WAT (UTC+1)" disabled className="h-10 rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Class Capacity</h2>
            <label className="mt-3 flex max-w-xs flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Maximum students</span>
              <input type="number" min={2} value={settingsMaxStudents} onChange={(e) => setSettingsMaxStudents(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Pricing</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Price per session (₦)</span>
                <input type="number" min={0} step={100} value={settingsPrice} onChange={(e) => setSettingsPrice(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <div>
                <span className="text-xs font-medium text-ensena-muted">Weekly price</span>
                <p className="mt-2.5 text-sm font-semibold text-ensena-ink">{formatNaira(weeklyPrice)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-ensena-muted">Monthly price</span>
                <p className="mt-2.5 text-sm font-semibold text-ensena-ink">{formatNaira(monthlyPrice)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Cohort</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-ensena-muted">Current cohort</dt><dd className="font-medium text-ensena-ink">{current ? formatDateRange(current) : "Not scheduled"}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Next cohort</dt><dd className="font-medium text-ensena-ink">{next ? formatDateRange(next) : "Not scheduled"}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Enrollment status</dt><dd className="font-medium text-ensena-ink">{currentFull ? "Full" : "Open for enrollment"}</dd></div>
            </dl>
          </div>

          <Button onClick={saveSettings} className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
            {settingsSaved ? "Saved!" : "Save Changes"}
          </Button>

          <div className="flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
            <button type="button" onClick={() => setPauseOpen(true)} className="text-left text-ensena-muted hover:text-ensena-ink">Pause Class</button>
            <button type="button" onClick={() => setDeleteOpen(true)} className="text-left text-rose-500 hover:text-rose-600">Delete Class</button>
          </div>
        </div>
      )}

      <Modal open={endClassOpen} onClose={() => setEndClassOpen(false)} title="End Class">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Ending this class marks it as completed and stops new bookings. Students keep access to past sessions.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEndClassOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={() => setEndClassOpen(false)} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">End Class</Button>
          </div>
        </div>
      </Modal>

      <Modal open={pauseOpen} onClose={() => setPauseOpen(false)} title="Pause Class">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Pausing this class hides it from new students and stops upcoming sessions until you resume it.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPauseOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={() => setPauseOpen(false)} className="h-10 flex-1 rounded-full bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600">Pause Class</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Class">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This permanently deletes {groupClass.title} and cannot be undone. Enrolled students will be notified.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button
              nativeButton={false}
              render={<Link href="/tutor-dashboard/private-lessons?tab=Group Classes" />}
              className="h-10 flex-1 items-center justify-center rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Delete Class
            </Button>
          </div>
        </div>
      </Modal>

      {reviewError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-lg">{reviewError}</div>
      )}
      <WriteReviewModal
        open={reviewingStudent !== null}
        onClose={() => setReviewingStudent(null)}
        recipientName={reviewingStudent?.name ?? ""}
        title={`Review ${reviewingStudent?.name ?? "Student"}`}
        onSubmit={(rating, comment) => {
          if (!reviewingStudent) return;
          const result = submitReview({
            direction: "tutor-to-student",
            reviewerName: dashboardTutor.name,
            reviewerImage: dashboardTutor.image,
            recipientName: reviewingStudent.name,
            bookingId: groupClass.id,
            bookingType: "Group",
            subject: groupClass.subject,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            setReviewError(result.userMessage);
            return;
          }
          setReviewError(null);
          setReviewingStudent(null);
        }}
      />
    </div>
  );
}
