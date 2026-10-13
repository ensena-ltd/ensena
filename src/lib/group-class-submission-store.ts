// Real, persisted group-class submissions — the one shared record that
// connects a tutor's "Create Group Class" form to admin's approval queue,
// the public /group-classes listing, and the tutor's own "My Group Classes"
// list. See adapters below: every legacy shape (MyGroupClass, GroupClassRow,
// GroupClassListing) is derived from the same GroupClassSubmission.id — never
// re-hashed via buildBookingReference, which is seed-only (see
// booking-reference.ts's own doc comment).
//
// This store intentionally seeds empty: it only ever holds classes created
// through the real flow going forward. The three legacy seed datasets
// (admin's initialGroupClasses, tutor dashboard's initialMyGroupClasses, the
// public groupClassListings) are untouched, disconnected demo data — not
// migrated into this store.
//
// The tutor's schedule is captured as real structured data (start date, real
// weekday names, a real start time, a real duration, and a real length in
// weeks or a custom end date) — never a free-text "type it correctly or the
// pricing silently breaks" field. Every downstream date/session/pricing
// calculation is derived from these structured fields via
// buildGroupSessionSchedule (group-class-schedule.ts), the same real
// day-walking engine a student's own enrolled schedule already uses — never
// a second, parallel date-math implementation.
import { cancelBooking } from "@/lib/booking-lifecycle-store";
import { buildGroupSessionSchedule } from "@/lib/group-class-schedule";
import { extraSeatsFilled, getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { findTutorConflict, formatMinutesToClockTime, parseTimeToMinutes } from "@/lib/tutor-availability";
import {
  buildPricing,
  gradeLevelFor,
  groupClassListings,
  type Cohort,
  type DifficultyLevel,
  type GroupClassListing,
} from "@/lib/group-classes-data";
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { initialAdminTutors } from "@/lib/admin-data";
import type { GroupClassStatus } from "@/lib/admin-group-classes-data";
import type {
  GroupClassRow,
  RosterStudent,
  WaitlistEntry,
  ClassSession,
} from "@/lib/admin-group-classes-data";
import type { EnrolledStudent, MyGroupClass, MyGroupClassCohort } from "@/lib/tutor-dashboard-data";
import { slugify } from "@/lib/tutors";

export type EnrollmentDeadlineType = "atStart" | "1dayBefore" | "3daysBefore" | "1weekBefore" | "custom";

export interface EnrollmentDeadline {
  type: EnrollmentDeadlineType;
  customDateISO?: string;
}

export const DURATION_MINUTES_OPTIONS = [30, 45, 60, 90, 120] as const;
export type SessionDurationMinutes = (typeof DURATION_MINUTES_OPTIONS)[number];

export const LENGTH_WEEKS_OPTIONS = [1, 2, 3, 4, 6, 8, 12] as const;

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface GroupClassSubmission {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  academicLevel: string;
  // The precise class/grade this class targets (e.g. "SS2", "JSS3",
  // "200 Level") — see class-grade-taxonomy.ts. Optional so a submission
  // created before this field existed still type-checks; every real
  // consumer falls back to a coarse guess (gradeLevelFor) when absent.
  classGrade?: string;
  topic?: string;
  audience?: string;
  prerequisites?: string;
  minStudents: number;
  maxStudents: number;
  pricePerSession: number;
  // Structured schedule — real data, not a free-text field a tutor could
  // mistype into silently-wrong pricing (see the pre-existing scheduleDays/
  // scheduleTime bug this replaces).
  startDateISO: string;
  days: string[]; // real weekday names, e.g. ["Tuesday", "Thursday"]
  startTime: string; // "5:00 PM"
  durationMinutes: SessionDurationMinutes;
  lengthWeeks: number | null; // null exactly when customEndDateISO is used instead
  customEndDateISO?: string;
  excludedDatesISO?: string[];
  enrollmentDeadline: EnrollmentDeadline;
  tutorName: string;
  tutorId: string;
  tutorImage: string;
  status: GroupClassStatus;
  submittedAt: string;
  rejectionReason?: string;
  changeRequestNote?: string;
  changeRequestFields?: string[];
  currentCohort?: MyGroupClassCohort;
  activityLog: { time: string; action: string }[];
  adminNotes: string[];
}

const SUBMISSIONS_KEY = "ensena_group_class_submissions";
export const GROUP_CLASS_SUBMISSIONS_EVENT = "ensena:group-class-submissions-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readRaw = makeCachedReader<GroupClassSubmission[]>(SUBMISSIONS_KEY, []);

function writeJson(value: GroupClassSubmission[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(GROUP_CLASS_SUBMISSIONS_EVENT));
}

export function getGroupClassSubmissions(): GroupClassSubmission[] {
  return readRaw();
}

function updateSubmission(id: string, patch: Partial<GroupClassSubmission>): void {
  writeJson(readRaw().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const taken = new Set([
    ...groupClassListings.map((c) => c.slug),
    ...readRaw().map((s) => s.slug),
  ]);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

// Matches by display name against admin's own tutor roster (initialAdminTutors)
// — the same "match disconnected demo datasets by name" convention already
// used elsewhere (e.g. marketplaceProfileFor in admin-group-class-review-client.tsx).
// Falls back to a slugified name for a tutor admin doesn't otherwise know
// about, so this never throws.
function resolveTutorId(tutorName: string): string {
  return initialAdminTutors.find((t) => t.name === tutorName)?.id ?? slugify(tutorName);
}

const WEEKDAY_ABBREV: Record<string, string> = {
  Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

// Calendar order (Sun–Sat), not selection order — so "Thu, Tue" picked in
// that click order still displays as "Tue, Thu" everywhere.
export function daysToAbbrevString(days: string[]): string {
  return WEEKDAY_NAMES.filter((d) => days.includes(d)).map((d) => WEEKDAY_ABBREV[d]).join(", ");
}

export function timeRangeLabel(startTime: string, durationMinutes: number): string {
  const startMins = parseTimeToMinutes(startTime);
  if (startMins === null) return startTime;
  return `${formatMinutesToClockTime(startMins)} – ${formatMinutesToClockTime(startMins + durationMinutes)}`;
}

// The one real schedule-generation entry point both the create-form's live
// preview and approveSubmission's cohort computation call — reusing
// buildGroupSessionSchedule (the same engine a student's real enrolled
// schedule is built from) rather than a second date-math implementation.
// A custom end date is handled by generating enough weeks to safely cover
// it, then truncating — the length-in-weeks case needs no truncation since
// the engine already stops exactly at that many weeks.
export function generateSessionDates(input: {
  startDateISO: string;
  days: string[];
  lengthWeeks: number | null;
  customEndDateISO?: string;
  excludedDatesISO?: string[];
}): string[] {
  if (input.days.length === 0) return [];
  const daysAbbrev = daysToAbbrevString(input.days);
  let weeks = input.lengthWeeks;
  if (weeks == null) {
    if (!input.customEndDateISO) return [];
    const [sy, sm, sd] = input.startDateISO.split("-").map(Number);
    const [ey, em, ed] = input.customEndDateISO.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 86_400_000)) + 1);
  }
  // todayISO fixed before the start date — only ever used by the engine to
  // classify status (Completed/Live/Upcoming), which this helper discards,
  // so any pre-start placeholder is safe here.
  const sessions = buildGroupSessionSchedule(daysAbbrev, input.startDateISO, weeks, "1900-01-01");
  const excluded = new Set(input.excludedDatesISO ?? []);
  const dates = sessions.map((s) => s.dateISO).filter((d) => !excluded.has(d));
  const capped = input.customEndDateISO ? dates.filter((d) => d <= input.customEndDateISO!) : dates;
  return capped.sort();
}

export async function submitGroupClass(input: {
  title: string;
  description: string;
  subject: string;
  academicLevel: string;
  classGrade?: string;
  topic?: string;
  audience?: string;
  prerequisites?: string;
  minStudents: number;
  maxStudents: number;
  pricePerSession: number;
  startDateISO: string;
  days: string[];
  startTime: string;
  durationMinutes: SessionDurationMinutes;
  lengthWeeks: number | null;
  customEndDateISO?: string;
  excludedDatesISO?: string[];
  enrollmentDeadline: EnrollmentDeadline;
  tutorName: string;
  tutorImage: string;
}): Promise<GroupClassSubmission> {
  const exists = (candidate: string) => readRaw().some((s) => s.id === candidate);
  const id = await generateUniqueReferenceCode("class", exists);
  const created: GroupClassSubmission = {
    ...input,
    tutorId: resolveTutorId(input.tutorName),
    id,
    slug: uniqueSlug(input.title),
    status: "Pending Review",
    submittedAt: "Just now",
    activityLog: [{ time: "Just now", action: "Submitted for review" }],
    adminNotes: [],
  };
  writeJson([...readRaw(), created]);
  return created;
}

// A fresh approval computes the real cohort from the tutor's actual
// structured schedule — start date, real weekday selection, real length —
// via the shared generateSessionDates helper, rather than guessing an
// 8-week cohort off an arbitrarily-picked weekday (the bug this replaces).
// The cohort's endDate is the LAST REAL GENERATED SESSION's date, so it can
// never drift from what the tutor/students actually see session-by-session.
function computeCohort(submission: GroupClassSubmission): MyGroupClassCohort {
  const sessionDates = generateSessionDates(submission);
  const endDateISO = sessionDates.length > 0 ? sessionDates[sessionDates.length - 1] : submission.startDateISO;
  return {
    startDate: submission.startDateISO,
    endDate: endDateISO,
    seatsFilled: 0,
    seatsTotal: submission.maxStudents,
  };
}

// Approval is the moment a tutor-submitted schedule actually becomes a real
// commitment on their calendar — this is where the conflict check belongs,
// not at submission (a tutor can submit several proposals; only one
// admin-approved schedule per slot should ever be allowed to stand). Checks
// every real generated session date/time against the tutor's existing
// private lessons, Discovery Sessions, and other already-approved group
// classes — the same findTutorConflict choke point the student booking
// flows go through — and refuses to publish a class that would double-book
// the tutor rather than silently letting the conflict stand.
export function approveSubmission(id: string): { ok: true } | { ok: false; reason: string } {
  const submission = readRaw().find((s) => s.id === id);
  if (!submission) return { ok: false, reason: "This submission could not be found." };
  const start = parseTimeToMinutes(submission.startTime);
  if (start !== null) {
    const sessionDates = generateSessionDates(submission);
    const end = start + submission.durationMinutes;
    const conflictDate = sessionDates.find((dateISO) => findTutorConflict(submission.tutorName, dateISO, start, end));
    if (conflictDate) {
      return {
        ok: false,
        reason: `${submission.tutorName} already has another class or lesson at that time on ${conflictDate}. Ask the tutor to adjust the schedule before approving.`,
      };
    }
  }
  updateSubmission(id, {
    status: "Upcoming",
    rejectionReason: undefined,
    changeRequestNote: undefined,
    changeRequestFields: undefined,
    currentCohort: computeCohort(submission),
    activityLog: [...submission.activityLog, { time: "Just now", action: "Class approved and published" }],
  });
  return { ok: true };
}

export function rejectSubmission(id: string, reason: string, note?: string): void {
  const submission = readRaw().find((s) => s.id === id);
  if (!submission) return;
  updateSubmission(id, {
    status: "Rejected",
    rejectionReason: note || reason,
    activityLog: [...submission.activityLog, { time: "Just now", action: `Rejected: ${reason}` }],
  });
}

export function requestSubmissionChanges(id: string, note: string, fields: string[]): void {
  const submission = readRaw().find((s) => s.id === id);
  if (!submission) return;
  updateSubmission(id, {
    status: "Changes Requested",
    changeRequestNote: note,
    changeRequestFields: fields,
    activityLog: [...submission.activityLog, { time: "Just now", action: "Requested changes from tutor" }],
  });
}

export function addSubmissionNote(id: string, note: string): void {
  const submission = readRaw().find((s) => s.id === id);
  if (!submission) return;
  updateSubmission(id, { adminNotes: [note, ...submission.adminNotes] });
}

// Suspending a whole class cascades to every real, active enrollment exactly
// the way a student's own single-enrollment cancellation would — same 100%
// admin-cancellation refund policy, notification, email, and audit trail
// (cancelBooking) — rather than only flipping this submission's own status
// and leaving enrolled students' payments/notifications untouched. Real
// enrollments are keyed by slug (cohortIndex is always 0 for a tutor-
// submitted class — see submissionToGroupClassListing's single-cohort
// array), so every active one for this slug belongs to this class.
export function cancelSubmission(id: string): void {
  const submission = readRaw().find((s) => s.id === id);
  if (!submission || submission.status === "Cancelled") return;

  const enrollments = getGroupClassEnrollments().filter(
    (e) => e.slug === submission.slug && e.cohortIndex === 0 && e.status !== "cancelled"
  );
  const cohort = submission.currentCohort;
  const sessionCount = generateSessionDates(submission).length;
  const fullAmount = submission.pricePerSession * Math.max(sessionCount, 1);
  const startMs = cohort ? new Date(`${cohort.startDate} ${submission.startTime}`).getTime() : Date.now();

  for (const enrollment of enrollments) {
    cancelBooking({
      bookingId: enrollment.id,
      kind: "Group",
      cancelledBy: "Admin",
      cancelledByName: "Enseña",
      otherPartyName: enrollment.studentName,
      subject: submission.title,
      reason: "Other",
      notes: "This class was suspended by an Enseña admin.",
      originalStart: cohort?.startDate ?? submission.startDateISO,
      originalEnd: submission.startTime,
      originalStartMs: Number.isNaN(startMs) ? Date.now() : startMs,
      originalAmount: fullAmount,
      studentDetailUrl: `/student-dashboard/group-classes/${enrollment.id}`,
      tutorDetailUrl: `/tutor-dashboard/group-classes/${submission.slug}`,
    });
  }

  updateSubmission(id, {
    status: "Cancelled",
    activityLog: [
      ...submission.activityLog,
      {
        time: "Just now",
        action:
          enrollments.length > 0
            ? `Class suspended: ${enrollments.length} enrolled student${enrollments.length === 1 ? "" : "s"} refunded and notified`
            : "Class suspended",
      },
    ],
  });
}

export function subscribeGroupClassSubmissions(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(GROUP_CLASS_SUBMISSIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(GROUP_CLASS_SUBMISSIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// ---------------------------------------------------------------------------
// Adapters — map one real GroupClassSubmission into each legacy surface's
// shape, always reusing submission.id directly (never re-hashed).

const ACCENT_PALETTE = [
  { ring: "#6C63FF", badge: "#EEF2FF" },
  { ring: "#1FA971", badge: "#E9FBF1" },
  { ring: "#E58A2A", badge: "#FFF3E0" },
  { ring: "#2F9BE0", badge: "#E9F5FF" },
  { ring: "#9B6BD6", badge: "#FDEAFB" },
];

function accentFor(id: string): { ring: string; badge: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function difficultyFor(academicLevel: string): DifficultyLevel {
  if (academicLevel === "Nursery" || academicLevel === "Primary") return "Beginner";
  if (academicLevel === "Secondary") return "Intermediate";
  return "Advanced";
}

// admin's GroupClassStatus and the tutor dashboard's MyGroupClass["status"]
// are two differently-named unions for the same lifecycle — map explicitly
// rather than casting, since their string values don't line up 1:1
// ("Pending Review" -> "Submitted", "Changes Requested" -> "Needs Changes", …).
function tutorStatusFor(status: GroupClassStatus): MyGroupClass["status"] {
  switch (status) {
    case "Pending Review":
      return "Submitted";
    case "Changes Requested":
      return "Needs Changes";
    case "Rejected":
    case "Cancelled":
    case "Archived":
      return "Rejected";
    case "Completed":
      return "Completed";
    case "Live":
    case "Upcoming":
    default:
      return "Live";
  }
}

export function submissionToMyGroupClass(s: GroupClassSubmission): MyGroupClass {
  const accent = accentFor(s.id);
  // currentCohort.seatsFilled is only ever seeded at 0 by computeCohort and
  // never mutated afterward — real enrollments live in
  // group-class-enrollment-store.ts instead (cohortIndex is always 0 for a
  // tutor-submitted class), so that store is the only real source for how
  // many students are actually enrolled right now.
  const seatsFilled = extraSeatsFilled(s.slug, 0);
  return {
    id: s.id,
    title: s.title,
    subject: s.subject,
    level: s.academicLevel,
    classGrade: s.classGrade,
    color: accent.ring,
    status: tutorStatusFor(s.status),
    seatsTotal: s.maxStudents,
    seatsFilled,
    minStudents: s.minStudents,
    price: s.pricePerSession,
    revenue: 0,
    attendanceRate: 0,
    schedule: `${daysToAbbrevString(s.days)} · ${timeRangeLabel(s.startTime, s.durationMinutes)}`,
    mode: "Online",
    students: [] as EnrolledStudent[],
    submittedDate: s.submittedAt,
    reviewerNotes: s.changeRequestNote ? [s.changeRequestNote] : undefined,
    currentCohort: s.currentCohort ? { ...s.currentCohort, seatsFilled } : s.currentCohort,
    nextCohort: null,
    durationMinutes: s.durationMinutes,
    language: "English",
    classLink: undefined,
    createdDate: s.submittedAt,
    lastUpdatedDate: s.submittedAt,
    description: s.description,
  };
}

export function submissionToGroupClassRow(s: GroupClassSubmission): GroupClassRow {
  const sessionDates = generateSessionDates(s);
  return {
    id: s.id,
    classCode: s.id,
    title: s.title,
    bannerLabel: s.subject,
    bannerTint: accentFor(s.id).badge,
    tutor: s.tutorName,
    tutorId: s.tutorId,
    tutorImage: s.tutorImage,
    tutorRating: 0,
    subject: s.subject,
    academicLevel: s.academicLevel,
    classGrade: s.classGrade,
    mode: "Online",
    language: "English",
    scheduleDays: daysToAbbrevString(s.days),
    scheduleTime: timeRangeLabel(s.startTime, s.durationMinutes),
    timezone: "WAT",
    weeks: s.lengthWeeks ?? Math.max(1, Math.round(sessionDates.length / Math.max(1, s.days.length))),
    sessionsTotal: sessionDates.length,
    sessionsCompleted: 0,
    sessionDurationMins: s.durationMinutes,
    pricePerSession: s.pricePerSession,
    maxStudents: s.maxStudents,
    minStudents: s.minStudents,
    studentsEnrolled: extraSeatsFilled(s.slug, 0),
    price: s.pricePerSession,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    status: s.status,
    createdDate: s.submittedAt,
    startDate: s.currentCohort?.startDate ?? s.startDateISO,
    endDate: s.currentCohort?.endDate ?? sessionDates[sessionDates.length - 1] ?? s.startDateISO,
    weeklyHomework: false,
    certificateOnCompletion: false,
    meetingLink: "",
    description: s.description,
    learningOutcomes: [],
    curriculum: [],
    homeworkPlan: "",
    requirements: [],
    submittedAt: s.submittedAt,
    rejectionReason: s.rejectionReason,
    changeRequestNote: s.changeRequestNote,
    changeRequestFields: s.changeRequestFields,
    students: [] as RosterStudent[],
    waitlist: [] as WaitlistEntry[],
    sessions: [] as ClassSession[],
    attendance: { avgAttendancePct: 0, late: 0, absent: 0, cameraUsagePct: 0, participationScore: 0 },
    homeworkStats: { assignmentsCount: 0, submissionPct: 0, avgScore: 0, lateSubmissions: 0 },
    classroom: { recordingAvailable: false, whiteboardActive: false, chatMessages: 0, pollsCount: 0, connectionQuality: "Good" },
    reviews: { breakdown: [0, 0, 0, 0, 0], comments: [] },
    escrow: { totalHeld: 0, released: 0, perSessionAmount: s.pricePerSession, frozen: 0, log: [] },
    aiInsights: [],
    activityLog: s.activityLog,
    certificatesIssued: 0,
    adminNotes: s.adminNotes,
    promoted: false,
    promotionChannels: { homepage: false, studentDashboard: false, discovery: false, email: false, push: false },
  };
}

export function submissionToGroupClassListing(s: GroupClassSubmission): GroupClassListing | null {
  if (!s.currentCohort) return null;
  const accent = accentFor(s.id);
  // Real day count straight from the structured field — no more sniffing a
  // display string for a dash (the bug that made every submitted class
  // silently price as if it ran 5x/week).
  const sessionsPerWeek = s.days.length;
  const durationWeeks = s.lengthWeeks ?? Math.max(
    1,
    Math.round((new Date(s.currentCohort.endDate).getTime() - new Date(s.currentCohort.startDate).getTime()) / (7 * 86_400_000)) + 1
  );
  const daysLabel = daysToAbbrevString(s.days);
  const timeLabel = timeRangeLabel(s.startTime, s.durationMinutes);
  const cohort: Cohort = {
    startDate: s.currentCohort.startDate,
    days: daysLabel,
    time: timeLabel,
    durationWeeks,
    seatsTotal: s.currentCohort.seatsTotal,
    seatsFilled: s.currentCohort.seatsFilled,
  };
  return {
    slug: s.slug,
    title: s.title,
    description: s.description,
    levelBadge: s.academicLevel,
    // Group classes don't yet collect a services picker at creation time —
    // every tutor-created class is, by definition, a Tutoring session; a
    // tutor can broaden this later the same way TutorListing.supportTypes
    // is edited once a real per-class services step exists.
    supportTypes: ["tutoring"],
    // A real, tutor-selected class/grade beats the coarse gradeLevelFor()
    // guess (which just picks one representative grade per broad bucket) —
    // only legacy submissions predating this field fall back to the guess.
    gradeLevel: s.classGrade ?? gradeLevelFor(s.academicLevel),
    subject: s.subject,
    days: daysLabel,
    time: timeLabel,
    price: s.pricePerSession,
    rating: 0,
    reviews: 0,
    enrolled: s.currentCohort.seatsFilled,
    maxSeats: s.maxStudents,
    mode: "Online",
    image: s.tutorImage,
    ringColor: accent.ring,
    badgeColor: accent.badge,
    tutorName: s.tutorName,
    language: "English",
    difficulty: difficultyFor(s.academicLevel),
    completionRate: 0,
    learningOutcomes: [],
    outcomeSentence: `You'll learn directly from ${s.tutorName.split(" ")[0]} in a small, interactive group.`,
    cohorts: [cohort],
    pricing: buildPricing(s.pricePerSession, sessionsPerWeek),
  };
}
