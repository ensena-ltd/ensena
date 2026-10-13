import { PLATFORM_TIMEZONE, getPlatformTodayParts } from "@/lib/platform-time";
import type { LearningKind, LearningSession, StudyTaskRow } from "@/lib/student-learning-server";

// Shared display helpers for the live (Supabase-backed) student dashboard
// and My Classes pages. Every date/time is read in the platform timezone
// (Africa/Lagos), never the viewer's own — see platform-time.ts.

const dateFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, ...opts });

export const formatTime = (ms: number) => dateFmt({ hour: "numeric", minute: "2-digit" }).format(ms);
export const formatShortDate = (ms: number) => dateFmt({ month: "short", day: "numeric" }).format(ms);
export const formatLongDate = (ms: number) => dateFmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(ms);
export const formatTimeRange = (s: Pick<LearningSession, "startMs" | "endMs">) => `${formatTime(s.startMs)} – ${formatTime(s.endMs)}`;

export function monthDay(ms: number): { month: string; day: string } {
  return { month: dateFmt({ month: "short" }).format(ms).toUpperCase(), day: dateFmt({ day: "numeric" }).format(ms) };
}

/** YYYY-MM-DD of the platform calendar date `ms` falls on. */
export function platformISODate(ms: number): string {
  const { year, month, day } = getPlatformTodayParts(ms);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "Today" / "Tomorrow" / weekday within the week / "Oct 14". */
export function relativeDay(ms: number, nowMs: number): string {
  const diff = Math.round((Date.parse(platformISODate(ms)) - Date.parse(platformISODate(nowMs))) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return dateFmt({ weekday: "long" }).format(ms);
  return formatShortDate(ms);
}

export function greeting(nowMs: number): string {
  const hour = Number(dateFmt({ hour: "numeric", hourCycle: "h23" }).format(nowMs));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const kindLabel: Record<LearningKind, string> = {
  private: "Private Lesson",
  group: "Group Class",
  discovery: "Discovery Session",
  counselling: "Counselling",
};

export const kindBadge: Record<LearningKind, string> = {
  private: "bg-rose-50 text-rose-700",
  group: "bg-[#CBEFFF] text-[#1E7BA6]",
  discovery: "bg-violet-50 text-violet-700",
  counselling: "bg-amber-50 text-amber-700",
};

export const kindDot: Record<LearningKind, string> = {
  private: "bg-ensena-primary",
  group: "bg-[#2F9BE0]",
  discovery: "bg-violet-500",
  counselling: "bg-amber-500",
};

/** Still to come or happening right now (not cancelled). */
export function isUpcoming(s: LearningSession, nowMs: number): boolean {
  return s.status === "scheduled" && s.endMs > nowMs;
}

/** Scheduled sessions whose time has passed but nobody has marked done yet. */
export function isAwaitingCompletion(s: LearningSession, nowMs: number): boolean {
  return s.status === "scheduled" && s.endMs <= nowMs && !s.confirmationId && (s.kind === "private" || s.kind === "group");
}

/** A private lesson needs payment before the classroom opens; other kinds don't gate on it here. */
export function needsPayment(s: LearningSession): boolean {
  return s.kind === "private" && s.paymentStatus !== "paid";
}

export interface ActiveArrangement {
  key: string;
  kind: "private" | "group";
  title: string;
  personName: string;
  personImage: string | null;
  scheduleLine: string;
  extraLine: string | null;
  next: LearningSession;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// One row per ongoing arrangement: a group class enrollment, a private
// lesson series, or a one-off private lesson — each pointing at its next session.
export function buildActiveArrangements(sessions: LearningSession[], nowMs: number): ActiveArrangement[] {
  const groups = new Map<string, LearningSession[]>();
  for (const s of sessions) {
    if ((s.kind !== "private" && s.kind !== "group") || !isUpcoming(s, nowMs)) continue;
    const key = s.seriesId ?? s.id;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const next = list[0];
      const days = [...new Set(list.map((s) => WEEKDAYS[new Date(Date.parse(platformISODate(s.startMs))).getUTCDay()]))];
      const remaining = list.length;
      const scheduleLine =
        next.kind === "group"
          ? `${days.join(", ")} · ${formatTimeRange(next)}`
          : remaining > 1
            ? `${next.frequency === "monthly" ? "Monthly" : "Weekly"} · ${days.join(", ")} · ${formatTimeRange(next)}`
            : `One-off · ${formatTimeRange(next)}`;
      const extraLine =
        next.kind === "group" && next.seatsTotal
          ? `${next.seatsFilled ?? 0} / ${next.seatsTotal} students`
          : remaining > 1
            ? `${remaining} sessions left`
            : null;
      return { key, kind: next.kind as "private" | "group", title: next.title, personName: next.personName, personImage: next.personImage, scheduleLine, extraLine, next };
    })
    .sort((a, b) => a.next.startMs - b.next.startMs);
}

export function tasksDueOn(tasks: StudyTaskRow[], isoDate: string): StudyTaskRow[] {
  return tasks.filter((t) => t.dueDate === isoDate);
}

/** Tasks due after `fromISO` up to and including `toISO`. */
export function tasksDueBetween(tasks: StudyTaskRow[], fromISO: string, toISO: string): StudyTaskRow[] {
  return tasks.filter((t) => t.dueDate !== null && t.dueDate > fromISO && t.dueDate <= toISO);
}

export function addDaysISO(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Monday..Sunday ISO bounds of the platform week containing `iso`. */
export function weekBounds(iso: string): { start: string; end: string } {
  const dow = new Date(Date.parse(iso)).getUTCDay();
  const start = addDaysISO(iso, -((dow + 6) % 7));
  return { start, end: addDaysISO(start, 6) };
}
