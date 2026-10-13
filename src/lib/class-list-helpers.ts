import { classifyClassStatus } from "@/lib/class-status";
import { parsePlatformDateTime } from "@/lib/platform-time";
import { summarizeSchedule } from "@/lib/private-booking-schedule";
import { getPrivateLessonTimeRange, type StudentLesson } from "@/lib/student-dashboard-data";

// Shared by the Upcoming/Active/Completed "view all" pages, which pull from
// several differently-shaped data sources (StudentLesson, StudentGroupClass,
// DiscoverySession, LessonConfirmation) and need one consistent way to sort
// them by date and to show a lightweight "Starts today/tomorrow" hint.

// Delegates to the one platform-wide, Africa/Lagos-aware parser
// (platform-time.ts) — this used to build `new Date(y, m, d, h, min)`
// directly, which is silently interpreted in whatever timezone the code
// happens to run in rather than Enseña's fixed Africa/Lagos platform clock.
export function parseDateTimeMs(dateStr: string, timeStr?: string): number {
  return parsePlatformDateTime(dateStr, timeStr ?? "12:00 AM");
}

export function startsInLabel(dateStr: string): string | undefined {
  if (dateStr === "Today") return "Starts today";
  if (dateStr === "Tomorrow") return "Starts tomorrow";
  return undefined;
}

// A "2 sessions/week with the same tutor" private-lesson arrangement.
// Preferred path: a real, bookingId-linked programme (private-booking-
// schedule.ts) — sessionsPerWeek/days come from summarizeSchedule(), the
// same real schedule math the View Class page itself displays, so this
// never disagrees with it (previously this grouped by tutor+subject and
// mislabeled the TOTAL number of matched lessons as "sessions/week" — e.g.
// a 12-session monthly booking showed "12 sessions/week"). Legacy fallback:
// lessons with no real bookingId (older seed rows predating the recurring-
// schedule model) still fall back to the original tutor+subject heuristic.
export interface ActivePrivateArrangement {
  key: string;
  tutor: string;
  subject: string;
  tutorImage: string;
  sessionsPerWeek: number;
  days: string;
  time: string;
  nextLabel: string;
  nextLesson: StudentLesson;
}

// A lesson still counts toward "what's next" as long as its real scheduled
// end time hasn't passed yet — never based on its raw stored `status`
// string, which is never rewritten once real time moves past it (the exact
// bug that let a May 2024 seed lesson still marked "Upcoming" show up as
// today's "next lesson" in September 2026).
export function isNotYetOver(l: StudentLesson, nowMs: number): boolean {
  const status = classifyClassStatus({ isCancelled: l.status === "Cancelled", ...getPrivateLessonTimeRange(l), nowMs });
  return status === "Upcoming" || status === "Live";
}

function pickNext(group: StudentLesson[], nowMs: number): StudentLesson | null {
  return group.find((l) => isNotYetOver(l, nowMs)) ?? null;
}

export function buildActivePrivateArrangements(lessons: StudentLesson[], nowMs: number): ActivePrivateArrangement[] {
  const active = lessons.filter((l) => l.type === "Private" && l.status !== "Cancelled");

  const byBooking = new Map<string, StudentLesson[]>();
  const legacy: StudentLesson[] = [];
  for (const l of active) {
    if (l.bookingId) byBooking.set(l.bookingId, [...(byBooking.get(l.bookingId) ?? []), l]);
    else legacy.push(l);
  }

  const fromBookings: ActivePrivateArrangement[] = [...byBooking.entries()]
    .filter(([, group]) => group.length >= 2)
    .flatMap(([bookingId, group]) => {
      const next = pickNext(group, nowMs);
      // Every session in this programme has already ended — the whole
      // arrangement is over, so it has no place in an "Active Classes" list
      // (its individual sessions still exist, correctly, under Completed).
      if (!next) return [];
      const summary = summarizeSchedule(group);
      return [{
        key: bookingId,
        tutor: group[0].tutor,
        subject: group[0].subject,
        tutorImage: group[0].tutorImage,
        sessionsPerWeek: summary.sessionsPerWeek,
        days: summary.daysLabel,
        time: next.time,
        nextLabel: `${next.date} · ${next.time}`,
        nextLesson: next,
      }];
    });

  const legacyGroups = new Map<string, StudentLesson[]>();
  legacy.forEach((l) => {
    const key = `${l.tutor}|${l.subject}`;
    legacyGroups.set(key, [...(legacyGroups.get(key) ?? []), l]);
  });

  const fromLegacy: ActivePrivateArrangement[] = [...legacyGroups.entries()]
    .filter(([, group]) => group.length >= 2)
    .flatMap(([key, group]) => {
      const [tutor, subject] = key.split("|");
      const next = pickNext(group, nowMs);
      if (!next) return [];
      const dayNames = [...new Set(group.map((l) => {
        const d = new Date(l.date);
        return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { weekday: "long" });
      }).filter((d): d is string => Boolean(d)))];
      return [{
        key,
        tutor,
        subject,
        tutorImage: group[0].tutorImage,
        sessionsPerWeek: group.length,
        days: dayNames.length > 0 ? dayNames.join(" & ") : "Varies",
        time: next.time,
        nextLabel: `${next.date} · ${next.time}`,
        nextLesson: next,
      }];
    });

  return [...fromBookings, ...fromLegacy];
}
