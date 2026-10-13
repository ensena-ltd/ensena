// "Speak to a Counsellor" — Benny is Enseña's academic counsellor. The
// booking page is a short intake + real-availability scheduler, not a
// marketing landing page: a student who clicked through already has intent.
import { initialAppointments, initialCounsellorSessionSettings } from "@/lib/admin-counselling-center-data";
import { getAvailability, getBlockedDates, getSessionSettings, getSpecialDates } from "@/lib/counsellor-availability-store";
import { subjectOptions } from "@/lib/tutors";

// One central counsellor profile (Admin -> Counselling -> Counsellor
// Settings edits this) — every place Benny appears (booking page, student
// counselling section, admin dashboard, virtual counselling room) reads
// from here rather than keeping its own copy.
export const counsellor = {
  name: "Benny",
  role: "Academic Counsellor",
  organization: "Enseña",
  // A dedicated file, not the shared "/teacher-1.jpg.png" placeholder — that
  // path is reused as a generic stock photo by 30+ unrelated tutor/user
  // records across the app, so pointing Benny at his OWN real portrait here
  // (rather than overwriting the shared file) updates every place Benny
  // appears without touching any of those unrelated photos.
  image: "/counsellor-benny.jpeg",
  bio: "Provides free academic guidance and support for students across all academic levels.",
  supportAreas: ["Academic Guidance", "Exam Preparation", "Study Planning", "Tutor / Group Class Guidance", "Subject Difficulty Support"],
  academicLevelsSupported: ["Senior Secondary (SSS)", "University / Tertiary"],
  allLevels: true,
};

export const academicLevelSupportOptions = ["Junior Secondary (JSS)", "Senior Secondary (SSS)", "University / Tertiary", "Postgraduate"];

export const supportAreaOptions = [
  "Academic Guidance",
  "Exam Preparation",
  "Study Planning",
  "Tutor / Group Class Guidance",
  "Subject Difficulty Support",
  "Career Guidance",
  "Motivation & Study Habits",
];

export const counsellorTimezone = "West Africa Time (WAT)";

export const helpTopicOptions = [
  "I'm struggling with a subject",
  "Exam preparation",
  "Choosing subjects or courses",
  "Finding a tutor",
  "Study planning",
  "I'm not sure what I need",
  "Other",
];

export const academicLevelOptions = [
  "Basic 1–6",
  "JSS1–JSS3",
  "SSS1–SSS3",
  "100 Level+",
  "Postgraduate",
  "Other",
];

export const counsellingSubjectOptions = subjectOptions;

export const examGoalOptions = [
  "WAEC",
  "NECO",
  "JAMB",
  "Post-UTME",
  "School examination",
  "University coursework",
  "No specific exam",
  "Other",
];

export const supportTypeOptions = [
  "Understand my options",
  "Create a study plan",
  "Find the right tutor/class",
  "Prepare for an exam",
  "Talk through a challenge",
  "Not sure yet",
];

export interface CounsellorIntake {
  helpTopics: string[];
  details: string;
  academicLevel: string | null;
  subject: string | null;
  examGoal: string | null;
  goalText: string;
  supportTypes: string[];
}

export function createDefaultIntake(): CounsellorIntake {
  return {
    helpTopics: [],
    details: "",
    academicLevel: null,
    subject: null,
    examGoal: null,
    goalText: "",
    supportTypes: [],
  };
}

export function isIntakeComplete(intake: CounsellorIntake): boolean {
  return (
    intake.helpTopics.length > 0 &&
    intake.details.trim().length > 0 &&
    !!intake.academicLevel &&
    !!intake.subject
  );
}

// A short, human-readable summary of what the student told Benny — shown on
// the confirmation screen so they can see Enseña understood them.
export function buildIntakeSummary(intake: CounsellorIntake): string {
  if (intake.details.trim()) return intake.details.trim();
  if (intake.helpTopics.length > 0) return intake.helpTopics.join(", ");
  return "I'd like to speak with Benny about my education.";
}

export const SESSION_DURATION_MINUTES = initialCounsellorSessionSettings.durationMinutes;
export const SESSION_LENGTH_LABEL = `${SESSION_DURATION_MINUTES} minutes`;

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Local-date-based (not toISOString, which is UTC and can land on the
// adjacent calendar day) — this must match the local getDate()/getDay()
// used everywhere else here, since it's used as the join key between the
// calendar grid, the availability lookup, and the display labels.
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeToMinutes(time: string): number {
  const [clock, meridiem] = time.split(" ");
  const [hourStr, minuteStr] = clock.split(":");
  let hour = parseInt(hourStr, 10) % 12;
  if (meridiem === "PM") hour += 12;
  return hour * 60 + parseInt(minuteStr, 10);
}

function minutesToTime(totalMinutes: number): string {
  let hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${meridiem}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatFullDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateNoYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export interface DaySlots {
  date: string;
  weekdayShort: string;
  dayNumber: number;
  isPast: boolean;
  slots: string[];
}

// Derives open slots from Benny's real settings (Admin → Counselling →
// Counsellor Settings): weekly availability, one-off special availability
// overrides, blocked dates, session duration and minimum booking notice —
// minus anything already booked. There's no live calendar backend, so this
// is computed the same "no backend yet" way as the rest of the app (see
// booking-reference.ts): editing these settings updates the shared seed
// arrays that both the admin screen and this page read from.
export function getDaySlots(date: Date, today: Date): DaySlots {
  const iso = toISODate(date);
  const todayISO = toISODate(today);
  const isPast = iso < todayISO;
  const weekdayFull = WEEKDAY_FULL[date.getDay()];
  const sessionSettings = getSessionSettings();
  const special = getSpecialDates().find((s) => s.date === iso);
  const availability = getAvailability().find((a) => a.day === weekdayFull);
  const window = special ?? (availability?.enabled ? availability : null);

  const slots: string[] = [];
  if (!isPast && window) {
    const startMinutes = timeToMinutes(window.start);
    const endMinutes = timeToMinutes(window.end);
    const durationMinutes = sessionSettings.durationMinutes;
    const blocked = getBlockedDates().find((b) => b.date === iso);
    const bookedTimes = new Set(
      initialAppointments
        .filter((a) => a.dateISO === iso && a.status !== "Cancelled")
        .map((a) => a.time)
    );
    const noticeDeadline = new Date(today.getTime() + sessionSettings.minimumBookingNoticeHours * 60 * 60 * 1000);

    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += durationMinutes) {
      if (blocked) {
        if (blocked.allDay) continue;
        if (blocked.startTime && blocked.endTime) {
          const blockStart = timeToMinutes(blocked.startTime);
          const blockEnd = timeToMinutes(blocked.endTime);
          if (m < blockEnd && m + durationMinutes > blockStart) continue;
        }
      }
      const label = minutesToTime(m);
      if (bookedTimes.has(label)) continue;
      const slotDateTime = new Date(date);
      slotDateTime.setHours(Math.floor(m / 60), m % 60, 0, 0);
      if (slotDateTime < noticeDeadline) continue;
      slots.push(label);
      if (slots.length >= sessionSettings.maxSessionsPerDay) break;
    }
  }

  return { date: iso, weekdayShort: WEEKDAY_SHORT[date.getDay()], dayNumber: date.getDate(), isPast, slots };
}

export function getWeekSlots(weekStart: Date): DaySlots[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return getDaySlots(d, today);
  });
}
