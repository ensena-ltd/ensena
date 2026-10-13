// Maps real, store-backed bookings (PrivateLesson, GroupClassEnrollment) into
// the shapes the student dashboard's legacy seed-driven components already
// render (StudentLesson, StudentGroupClass) — so a student's real booking
// shows up, and can be managed/cancelled, on their own dashboard exactly like
// a seeded one, without rewriting every consumer's rendering logic.
import { classDurationMinutes } from "@/lib/group-classes-data";
import { getLiveGroupClassBySlug } from "@/lib/group-classes-live-data";
import { buildGroupSessionSchedule } from "@/lib/group-class-schedule";
import { formatClassDate } from "@/lib/class-date-format";
import type { GroupClassEnrollment } from "@/lib/group-class-enrollment-store";
import { formatNaira } from "@/lib/format";
import type { PrivateLesson, PrivateLessonStatus } from "@/lib/tutor-dashboard-data";
import type { StudentGroupClass, StudentLesson, StudentLessonStatus } from "@/lib/student-dashboard-data";
import { getTutorBySlug } from "@/lib/tutors";

function statusForStudentLesson(status: PrivateLessonStatus): StudentLessonStatus {
  if (status === "Pending") return "Upcoming";
  return status;
}

export function privateLessonToStudentLesson(lesson: PrivateLesson): StudentLesson {
  const tutor = getTutorBySlug(lesson.tutorSlug);
  return {
    id: lesson.id,
    subject: lesson.subject,
    tutor: tutor?.name ?? lesson.tutorSlug,
    tutorImage: tutor?.image ?? "/teacher-1.jpg.png",
    date: lesson.date,
    time: lesson.time,
    duration: lesson.duration,
    type: "Private",
    mode: lesson.mode === "Hybrid" ? "Physical" : lesson.mode,
    status: statusForStudentLesson(lesson.status),
    notes: lesson.notes,
    materials: lesson.materials,
    payment: lesson.price,
    bookingId: lesson.bookingId,
    sessionNumber: lesson.sessionNumber,
    totalSessions: lesson.totalSessions,
    weekNumber: lesson.weekNumber,
    frequency: lesson.frequency,
  };
}

function cohortEndDate(startDate: string, durationWeeks: number): string {
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationWeeks * 7);
  return end.toISOString().slice(0, 10);
}

// `todayISO` is threaded in from the caller (useTodayISO()) rather than
// computed here, so this stays a plain, SSR-safe function — the exact same
// reasoning as buildGroupClassSessions on the tutor side.
export function enrollmentToStudentGroupClass(enrollment: GroupClassEnrollment, todayISO: string): StudentGroupClass | null {
  const listing = getLiveGroupClassBySlug(enrollment.slug);
  const cohort = listing?.cohorts[enrollment.cohortIndex];
  if (!listing || !cohort) return null;
  const durationMins = classDurationMinutes(cohort.time);
  const sessions = buildGroupSessionSchedule(cohort.days, cohort.startDate, cohort.durationWeeks, todayISO);
  // The real next occurrence — never just the recurrence rule's day list —
  // computed from the same real, per-instance schedule already built above,
  // not a separately-derived guess. Falls back to the last session if every
  // one has already happened, rather than showing nothing.
  const nextSession = sessions.find((s) => s.status !== "Completed") ?? sessions.at(-1);
  const nextSessionDateLabel = nextSession ? formatClassDate(new Date(`${nextSession.dateISO}T00:00:00`)) : cohort.startDate;
  const startTimeLabel = cohort.time.split("–")[0].trim();
  return {
    id: enrollment.id,
    title: listing.title,
    tutor: listing.tutorName,
    tutorImage: listing.image,
    tutorRating: listing.rating,
    color: listing.ringColor,
    schedule: `${cohort.days} · ${cohort.time}`,
    seatsFilled: cohort.seatsFilled,
    seatsTotal: cohort.seatsTotal,
    nextClass: `${nextSessionDateLabel} · ${startTimeLabel}`,
    attendancePct: 0,
    subject: listing.subject,
    academicLevel: listing.levelBadge,
    mode: listing.mode,
    durationMins,
    nextSessionDate: nextSessionDateLabel,
    nextSessionStartsToday: nextSession?.dateISO === todayISO,
    cohortStart: cohort.startDate,
    cohortEnd: cohortEndDate(cohort.startDate, cohort.durationWeeks),
    pricePerSession: listing.price,
    description: listing.description,
    tags: [],
    sessions: sessions.map((s) => ({ date: s.dateISO, status: s.status, sessionNumber: s.sessionNumber, weekNumber: s.weekNumber })),
    status: enrollment.status === "cancelled" ? "Cancelled" : "Active",
  };
}

export function enrollmentToStudentLesson(enrollment: GroupClassEnrollment): StudentLesson | null {
  const listing = getLiveGroupClassBySlug(enrollment.slug);
  const cohort = listing?.cohorts[enrollment.cohortIndex];
  if (!listing || !cohort) return null;
  const durationMins = classDurationMinutes(cohort.time);
  return {
    id: enrollment.id,
    subject: listing.subject,
    tutor: listing.tutorName,
    tutorImage: listing.image,
    date: cohort.startDate,
    time: cohort.time,
    duration: durationMins > 0 ? `${durationMins} mins` : cohort.time,
    type: "Group",
    mode: listing.mode === "In-person" ? "Physical" : "Online",
    status: enrollment.status === "cancelled" ? "Cancelled" : "Upcoming",
    payment: formatNaira(listing.price),
  };
}
