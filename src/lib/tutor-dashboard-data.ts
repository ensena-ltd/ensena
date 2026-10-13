import type { MessageAttachment } from "@/lib/message-attachment-types";
import type { Offer } from "@/lib/offers-data";
import { getTutorBySlug } from "@/lib/tutors";
import { buildBookingReference } from "@/lib/booking-reference";
import { getAllDiscoverySessions } from "@/lib/discovery-sessions-store";

export interface DashboardTutor {
  name: string;
  slug: string;
  image: string;
  rating: number;
  reviews: number;
  dob: string;
  memberSince: string;
  subjectTitle: string;
  lessonsTaught: number;
  repeatStudentsPct: number;
  studentsTaught: number;
  cancellationRatePct: number;
}

// The tutor-dashboard "logged in as" persona is the same Tunde Adebayo
// tutor already in the public tutor roster, so his rating/reviews/join
// date/photo/performance numbers stay a single source of truth across the
// student-facing site and this dashboard rather than two different demo
// identities drifting apart.
const realTunde = getTutorBySlug("tunde-adebayo");

export const dashboardTutor: DashboardTutor = {
  name: realTunde?.name ?? "Tunde Adebayo",
  slug: realTunde?.slug ?? "tunde-adebayo",
  image: realTunde?.image ?? "/teacher-1.jpg.png",
  rating: realTunde?.rating ?? 4.9,
  reviews: realTunde?.reviews ?? 320,
  dob: "1994-07-26",
  memberSince: realTunde?.memberSince ?? "January 2021",
  subjectTitle: realTunde?.subjectTitle ?? "Mathematics Tutor",
  lessonsTaught: realTunde?.lessonsTaught ?? 512,
  repeatStudentsPct: realTunde?.repeatStudentsPct ?? 80,
  studentsTaught: Math.round((realTunde?.lessonsTaught ?? 512) / 3),
  cancellationRatePct: Math.max(1, Math.round((100 - (realTunde?.repeatStudentsPct ?? 80)) / 20)),
};

export interface QuickStat {
  label: string;
  value: string;
  trend: string;
}

export const quickStats: QuickStat[] = [
  { label: "Total Lessons", value: "1,254", trend: "↑ 12% this month" },
  { label: "Active Students", value: "84", trend: "↑ 8% this month" },
  { label: "Average Rating", value: "4.98", trend: "Excellent" },
  { label: "Total Earnings", value: "₦485,000", trend: "↑ 15% this month" },
  { label: "Available Balance", value: "₦84,500", trend: "Withdraw anytime" },
  { label: "Pending Payout", value: "₦15,000", trend: "Will be released soon" },
];

export type LessonType = "Private" | "Group";
export type LessonStatus = "Upcoming" | "Live Now";

export interface ScheduleItem {
  time: string;
  student: string;
  subject: string;
  type: LessonType;
  status: LessonStatus;
  enrolled?: string;
}

export const todaySchedule: ScheduleItem[] = [
  { time: "10:00 AM", student: "Sarah A.", subject: "Mathematics · WAEC", type: "Private", status: "Upcoming" },
  { time: "2:00 PM", student: "French Beginners", subject: "Group Class", type: "Group", status: "Live Now", enrolled: "8/10 students" },
  { time: "5:30 PM", student: "David O.", subject: "Physics · JAMB", type: "Private", status: "Upcoming" },
];

export interface CalendarEvent {
  day: number; // 0=Mon .. 6=Sun
  startHour: number;
  endHour: number;
  label: string;
  variant: "booked" | "live" | "pending";
}

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const calendarHours = [8, 10, 12, 14, 16, 18, 20];

export const calendarEvents: CalendarEvent[] = [
  { day: 0, startHour: 10, endHour: 11, label: "Math\nSarah A.", variant: "booked" },
  { day: 1, startHour: 8, endHour: 9.5, label: "Physics\nJames O.", variant: "pending" },
  { day: 2, startHour: 8, endHour: 9, label: "WAEC\nRevision", variant: "booked" },
  { day: 3, startHour: 14, endHour: 15, label: "French\nGroup Class", variant: "live" },
  { day: 4, startHour: 16, endHour: 17, label: "Biology\nDavid O.", variant: "booked" },
  { day: 4, startHour: 18, endHour: 19, label: "Math\nSarah A.", variant: "booked" },
  { day: 5, startHour: 16, endHour: 17, label: "Chemistry\nMary U.", variant: "pending" },
];

export interface BookingRequest {
  id: string;
  student: string;
  subject: string;
  examBoard: string;
  date: string;
  duration: string;
  price: string;
  message: string;
}

export const initialBookingRequests: BookingRequest[] = [
  {
    id: "req-1",
    student: "Daniel N.",
    subject: "Mathematics",
    examBoard: "JAMB",
    date: "May 24, 2024 · 6:00 PM",
    duration: "60 mins",
    price: "₦3,000",
    message: "I need help with calculus and derivatives.",
  },
  {
    id: "req-2",
    student: "Grace A.",
    subject: "English",
    examBoard: "WAEC",
    date: "May 25, 2024 · 10:00 AM",
    duration: "45 mins",
    price: "₦2,250",
    message: "Looking forward to improving my essay writing.",
  },
];

export interface DashboardMessage {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: boolean;
}

export const dashboardMessages: DashboardMessage[] = [
  { id: "m-1", name: "Sarah A.", preview: "Homework submitted for review", time: "10:30 AM", unread: true },
  { id: "m-2", name: "James O.", preview: "Can we reschedule tomorrow's lesson?", time: "9:15 AM", unread: true },
  { id: "m-3", name: "Mary U.", preview: "Please check the assignment.", time: "Yesterday", unread: false },
  { id: "m-4", name: "French Beginners Group", preview: "Reminder: Class at 2:00 PM today", time: "Yesterday", unread: false },
];

// Kept consistent with the real Earnings page's "This Month" net figure
// (earningsPageOverview.monthlyGross split at ENSENA_COMMISSION_PCT) so the
// dashboard home's quick-glance card never contradicts Earnings itself.
export const earningsOverview = {
  total: 126000,
  changePct: 15,
  sparkline: [58000, 72000, 66000, 88000, 96000, 91000, 108000, 101000, 116000, 110000, 121000, 126000],
  completedLessons: 113000,
  groupClasses: 10500,
  bonuses: 2500,
};

export interface EscrowItem {
  label: string;
  time: string;
  amount: string;
}

export const escrowTotal = 18000;
export const escrowItems: EscrowItem[] = [
  { label: "Physics Lesson with David O.", time: "Today, 5:30 PM", amount: "₦7,500" },
  { label: "French Group Class", time: "Tomorrow, 2:00 PM", amount: "₦6,000" },
  { label: "Chemistry with Mary U.", time: "Fri, May 24, 4:00 PM", amount: "₦4,500" },
];

export interface ProfileChecklistItem {
  label: string;
  done: boolean;
}

export const profileCompletionPct = 92;
export const profileChecklist: ProfileChecklistItem[] = [
  { label: "Photo", done: true },
  { label: "Qualifications", done: true },
  { label: "Verification", done: true },
  { label: "Introduction Video", done: false },
  { label: "Teaching Resources", done: false },
];

export const profileStatusChecklist = [
  { label: "Identity Verification", done: true },
  { label: "Profile Information", done: true },
  { label: "Qualifications", done: true },
  { label: "Teaching Experience", done: true },
  { label: "Profile Photo", done: true },
];

export const whatHappensNextSteps = [
  {
    title: "Complete Your Profile",
    description: "Add more details about yourself, your experience, teaching style and qualifications.",
  },
  {
    title: "Set Your Availability",
    description: "Choose the days and times you're available to teach.",
  },
  {
    title: "Set Your Pricing",
    description: "Choose your lesson rates for private tutoring and group classes.",
  },
  {
    title: "Create Your First Lesson",
    description: "Set up your lessons or group classes so students can book you.",
  },
  {
    title: "Get Booked and Teach",
    description: "Students will start booking you. You teach, they learn and you get paid securely.",
  },
];

export const successToolFeatures = [
  { title: "Smart Scheduling", description: "Manage your availability, bookings and classes with ease." },
  { title: "Student Communication", description: "Chat with students, share resources and stay connected." },
  { title: "Secure Payments", description: "Payments are held in escrow and released after completed lessons." },
  { title: "Performance Analytics", description: "Track your lessons, earnings, reviews and student progress." },
  { title: "Resources Library", description: "Upload materials, create assignments and share learning resources." },
];

// ---------------------------------------------------------------------------
// Full Calendar page
// ---------------------------------------------------------------------------

export type CalendarEventType = "private" | "group" | "discovery" | "blocked" | "pending" | "completed" | "cancelled";

export interface CalendarPageEvent {
  id: string;
  date: string; // ISO yyyy-mm-dd
  startHour: number;
  endHour: number;
  title: string;
  student: string;
  type: CalendarEventType;
  mode: "Online" | "Physical";
  seats?: string;
  allDay?: boolean;
  // Real underlying record this event was built from — every click-through
  // (details, Enter, three-dot menu) resolves against this, never the
  // calendar's own synthetic id, so there is exactly one source of truth
  // per event instead of a second calendar-only record.
  sourceType: "private" | "group" | "discovery" | "blocked";
  sourceId: string;
  status: string;
  bookingReference?: string;
  groupSlug?: string;
  reason?: string;
}

export const calendarTypeStyles: Record<CalendarEventType, { bg: string; text: string; dot: string }> = {
  private: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" },
  group: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-400" },
  discovery: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  blocked: { bg: "bg-ensena-ink/10", text: "text-ensena-ink", dot: "bg-ensena-ink" },
  pending: { bg: "border border-dashed border-ensena-border bg-ensena-bg-soft", text: "text-ensena-muted", dot: "bg-ensena-border" },
  completed: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-400" },
  cancelled: { bg: "bg-ensena-bg-soft line-through", text: "text-ensena-muted", dot: "bg-rose-400" },
};

export const calendarTypeLabels: Record<CalendarEventType, string> = {
  private: "Private Lesson",
  group: "Group Class",
  discovery: "Discovery Session",
  blocked: "Blocked Time",
  pending: "Pending Request",
  completed: "Completed",
  cancelled: "Cancelled",
};

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function toISO(date: Date): string {
  return iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function fromISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Same slug scheme group-classes-client.tsx already uses for
// /tutor-dashboard/group-classes/[slug] — exported here too so the
// calendar can link to the exact same route without a second copy drifting.
export function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parseDurationHours(duration: string): number {
  const match = duration.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) / 60 : 1;
}

// Most seed private/discovery records are pinned to a fixed "May 2024" demo
// era (see simulatedNowAnchor) so a live countdown can be demoed without
// literally waiting — but a handful of records added later carry a real,
// current-era date instead (e.g. "Aug 28, 2026"). Resolving a literal
// "<date> <time>" string onto the real calendar has to tell these apart:
// a current-era date is used exactly as written, while a legacy demo-era
// date is shifted by its day-offset from simulatedNowAnchor so it lands
// near the real "today" instead of vanishing ~2 years in the past.
function resolveEventMoment(dateStr: string, timeStr: string): { dateISO: string; hour: number } | null {
  const literal = new Date(`${dateStr} ${timeStr}`);
  if (Number.isNaN(literal.getTime())) return null;
  const hour = literal.getHours() + literal.getMinutes() / 60;
  if (literal.getFullYear() >= 2025) {
    return { dateISO: toISO(literal), hour };
  }
  const anchor = new Date(simulatedNowAnchor);
  anchor.setHours(0, 0, 0, 0);
  const literalDateOnly = new Date(literal);
  literalDateOnly.setHours(0, 0, 0, 0);
  const offsetDays = Math.round((literalDateOnly.getTime() - anchor.getTime()) / 86400000);
  return { dateISO: `__OFFSET__${offsetDays}`, hour };
}

// The demo dataset used to be pinned to a fixed May 2024 date, which meant
// the calendar went empty the moment CalendarClient jumped to the real
// "today" after mount. Every event below is built from the tutor's actual
// private lessons / group class sessions / discovery sessions — never a
// hand-authored recurring pattern — with legacy demo-era dates reanchored
// (by day-offset, see resolveEventMoment) relative to the real "today" so
// the calendar stays populated. "today" must come from the caller (via
// useTodayISO, a hydration-safe hook) rather than `new Date()` at module
// load, which would be evaluated once on the server and again on the
// client and drift apart the longer a dev server stays running, causing a
// hydration mismatch.
export function buildCalendarEvents(todayISO: string, lessons: PrivateLesson[] = initialPrivateLessons): CalendarPageEvent[] {
  const events: CalendarPageEvent[] = [];

  function applyOffset(dateISO: string): string {
    if (!dateISO.startsWith("__OFFSET__")) return dateISO;
    const offsetDays = Number(dateISO.slice("__OFFSET__".length));
    const real = fromISODate(todayISO);
    real.setDate(real.getDate() + offsetDays);
    return toISO(real);
  }

  // ---- Private lessons ----
  for (const lesson of lessons) {
    const moment = resolveEventMoment(lesson.date, lesson.time);
    if (!moment) continue;
    const durationHours = parseDurationHours(lesson.duration);
    const calType: CalendarEventType =
      lesson.status === "Cancelled" ? "cancelled" : lesson.status === "Completed" ? "completed" : lesson.status === "Pending" ? "pending" : "private";
    events.push({
      id: `private-${lesson.id}`,
      date: applyOffset(moment.dateISO),
      startHour: moment.hour,
      endHour: moment.hour + durationHours,
      title: lesson.subject,
      student: lesson.student,
      type: calType,
      mode: lesson.mode === "Hybrid" ? "Physical" : lesson.mode,
      sourceType: "private",
      sourceId: lesson.id,
      status: lesson.status,
      bookingReference: lesson.bookingReference,
    });
  }

  // ---- Group classes — real cohort sessions, same generator the Group
  // Classes page itself uses, so the calendar and that page never disagree
  // about when a session actually is. ----
  const cohorts = buildGroupClassCohorts(todayISO);
  for (const cls of initialMyGroupClasses) {
    const cohort = cohorts[cls.id]?.currentCohort;
    if (!cohort) continue;
    const sessions = buildGroupClassSessions(cls, cohort, todayISO);
    for (const session of sessions) {
      const start = parseTimeLabel(session.startLabel);
      const end = parseTimeLabel(session.endLabel);
      if (!start || !end) continue;
      events.push({
        id: `group-${session.id}`,
        date: session.dateISO,
        startHour: start.hour + start.minute / 60,
        endHour: end.hour + end.minute / 60,
        title: cls.title,
        student: "",
        type: "group",
        mode: cls.mode,
        seats: `${session.attendeeCount} / ${cohort.seatsTotal} students`,
        sourceType: "group",
        sourceId: cls.id,
        status: session.status,
        bookingReference: buildBookingReference("class", cls.id),
        groupSlug: slugifyTitle(cls.title),
      });
    }
  }

  // ---- Discovery sessions — this tutor's own, filtered from the shared
  // multi-tutor array. "Today"/"Tomorrow" are already real-relative labels;
  // everything else is a literal date resolved the same way private
  // lessons are. ----
  for (const d of getAllDiscoverySessions()) {
    if (d.tutor !== dashboardTutor.name) continue;
    let dateISO: string;
    let hour: number;
    if (d.date === "Today" || d.date === "Tomorrow") {
      const base = fromISODate(todayISO);
      if (d.date === "Tomorrow") base.setDate(base.getDate() + 1);
      const t = parseTimeLabel(d.time);
      if (!t) continue;
      dateISO = toISO(base);
      hour = t.hour + t.minute / 60;
    } else {
      const moment = resolveEventMoment(d.date, d.time);
      if (!moment) continue;
      dateISO = applyOffset(moment.dateISO);
      hour = moment.hour;
    }
    events.push({
      id: `discovery-${d.id}`,
      date: dateISO,
      startHour: hour,
      endHour: hour + d.durationMins / 60,
      title: "Discovery Session",
      student: d.student,
      type: "discovery",
      mode: "Online",
      sourceType: "discovery",
      sourceId: d.id,
      status: d.status,
      bookingReference: d.bookingReference,
    });
  }

  return events;
}

export const calendarDayHours = Array.from({ length: 15 }, (_, i) => i + 7); // 7am - 9pm

// SSR-safe placeholder "today" — identical on the server render and the
// client's first render, so there's no hydration mismatch. useTodayISO()
// (src/hooks/use-today-iso.ts) swaps this for the real date after mount.
export const calendarViewDate = "2026-01-05";

export interface WeeklyAvailabilityDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export const defaultWeeklyAvailability: WeeklyAvailabilityDay[] = [
  { day: "Monday", enabled: true, start: "10:00 AM", end: "8:00 PM" },
  { day: "Tuesday", enabled: true, start: "10:00 AM", end: "8:00 PM" },
  { day: "Wednesday", enabled: true, start: "10:00 AM", end: "8:00 PM" },
  { day: "Thursday", enabled: true, start: "10:00 AM", end: "8:00 PM" },
  { day: "Friday", enabled: true, start: "10:00 AM", end: "8:00 PM" },
  { day: "Saturday", enabled: true, start: "9:00 AM", end: "2:00 PM" },
  { day: "Sunday", enabled: false, start: "9:00 AM", end: "2:00 PM" },
];

// ---------------------------------------------------------------------------
// Private Lessons page
// ---------------------------------------------------------------------------

export type PrivateLessonStatus = "Upcoming" | "Pending" | "Completed" | "Cancelled";

export interface PrivateLesson {
  id: string;
  // The reference-code system's Booking ID (see booking-reference.ts) — for
  // seed rows this is the deterministic buildBookingReference(id); for a
  // lesson created at runtime via addPrivateLesson (private-lessons-store.ts)
  // it's the same generateUniqueReferenceCode value used as `id`.
  bookingReference: string;
  // Which tutor this lesson belongs to. Every seed row is implicitly the
  // single tutor-dashboard demo persona (dashboardTutor), backfilled below —
  // real bookings created at runtime tag whichever tutor was actually booked,
  // which is what makes a real per-tutor conflict check possible.
  tutorSlug: string;
  student: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  status: PrivateLessonStatus;
  mode: "Online" | "Physical" | "Hybrid";
  price: string;
  notes?: string;
  materials?: string[];
  // A multi-session booking (weekly/monthly) stamps every lesson it creates
  // with the same bookingId, shared by no other booking — absent on a
  // standalone one-time lesson and on every pre-existing seed row, both of
  // which keep behaving exactly as a single, ungrouped lesson (see
  // private-booking-schedule.ts). sessionNumber/weekNumber are 1-based and
  // assigned once, at creation time, from the same schedule the student saw
  // on the Review page before paying — never recomputed from dates later,
  // so a reschedule can't silently reshuffle a programme's numbering.
  bookingId?: string;
  sessionNumber?: number;
  totalSessions?: number;
  weekNumber?: number;
  // The payment/frequency plan actually chosen at booking time ("oneTime" |
  // "weekly" | "monthly", matching FrequencyKey) — genuinely new information
  // that can't be reliably re-derived from the session dates alone (a
  // Weekly and a Monthly booking can produce a similarly-shaped session
  // list; only this field says which one it actually was). Absent on any
  // lesson created before this field existed — treated as "unknown", never
  // guessed, by every reader (see private-booking-schedule.ts's
  // frequencyLabel()).
  frequency?: "oneTime" | "weekly" | "monthly";
  // The real moment this booking was actually MADE — distinct from `date`
  // (when the lesson itself is scheduled to happen). Absent on every seed
  // row (which predates this field); used by the conversion-funnel metric
  // (conversion-funnel.ts) to count real bookings within a real time period,
  // never approximated from the lesson's own scheduled date.
  createdAtMs?: number;
}

export const privateLessonStatusStyles: Record<PrivateLessonStatus, string> = {
  Upcoming: "bg-indigo-100 text-indigo-700",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

const rawPrivateLessons: Omit<PrivateLesson, "bookingReference" | "tutorSlug">[] = [
  { id: "pl-1", student: "Sarah A.", subject: "Mathematics", date: "May 22, 2024", time: "10:00 AM", duration: "60 mins", status: "Upcoming", mode: "Online", price: "₦3,000", materials: ["WAEC Mathematics — Algebra.pdf", "Practice Questions.pdf"] },
  { id: "pl-2", student: "David O.", subject: "Physics", date: "May 22, 2024", time: "5:30 PM", duration: "60 mins", status: "Upcoming", mode: "Physical", price: "₦3,500" },
  { id: "pl-3", student: "Daniel N.", subject: "Mathematics", date: "May 24, 2024", time: "6:00 PM", duration: "60 mins", status: "Pending", mode: "Online", price: "₦3,000" },
  { id: "pl-4", student: "Grace A.", subject: "English", date: "May 25, 2024", time: "10:00 AM", duration: "45 mins", status: "Pending", mode: "Online", price: "₦2,250" },
  { id: "pl-5", student: "James O.", subject: "Physics", date: "May 20, 2024", time: "8:00 AM", duration: "90 mins", status: "Completed", mode: "Online", price: "₦5,250", notes: "Covered electromagnetism basics. James needs more practice with Lenz's law before the next mock test." },
  { id: "pl-6", student: "Mary U.", subject: "Chemistry", date: "May 18, 2024", time: "4:00 PM", duration: "60 mins", status: "Completed", mode: "Online", price: "₦4,500", notes: "Reviewed organic chemistry naming conventions. Mary is well prepared for the upcoming JAMB mock." },
  { id: "pl-7", student: "Blessing K.", subject: "Biology", date: "May 15, 2024", time: "3:00 PM", duration: "60 mins", status: "Completed", mode: "Physical", price: "₦3,800" },
  { id: "pl-8", student: "Tunde F.", subject: "Mathematics", date: "May 14, 2024", time: "5:00 PM", duration: "45 mins", status: "Cancelled", mode: "Online", price: "₦2,250" },
  { id: "pl-9", student: "Chioma E.", subject: "English", date: "May 27, 2024", time: "10:00 AM", duration: "60 mins", status: "Upcoming", mode: "Online", price: "₦2,800" },
  { id: "pl-10", student: "Kunle A.", subject: "Physics", date: "May 12, 2024", time: "6:00 PM", duration: "60 mins", status: "Completed", mode: "Physical", price: "₦3,500" },
  { id: "pl-11", student: "Cynthia Ejie", subject: "Mathematics", date: "Aug 28, 2026", time: "4:00 PM", duration: "60 mins", status: "Upcoming", mode: "Online", price: "₦5,000", materials: ["WAEC Mathematics — Algebra.pdf"] },
];

// Every seed row is implicitly this dashboard's single tutor persona — see
// the PrivateLesson.tutorSlug doc comment above.
export const initialPrivateLessons: PrivateLesson[] = rawPrivateLessons.map((lesson) => ({
  ...lesson,
  tutorSlug: dashboardTutor.slug,
  bookingReference: buildBookingReference("private", lesson.id),
}));

// ---------------------------------------------------------------------------
// Group Classes page
// ---------------------------------------------------------------------------

export type GroupClassStatus = "Draft" | "Submitted" | "Approved" | "Needs Changes" | "Rejected" | "Live" | "Completed";

export type GroupClassPaymentPlan = "Per Session" | "Weekly" | "Monthly";
export type GroupClassPaymentStatus = "Paid" | "Pending";

export interface EnrolledStudent {
  name: string;
  plan: GroupClassPaymentPlan;
  paymentStatus: GroupClassPaymentStatus;
  amountDue: number;
}

export const groupClassPaymentPlanStyles: Record<GroupClassPaymentPlan, string> = {
  "Per Session": "bg-indigo-100 text-indigo-700",
  Weekly: "bg-blue-100 text-blue-700",
  Monthly: "bg-violet-100 text-violet-700",
};

export const groupClassPaymentStatusStyles: Record<GroupClassPaymentStatus, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
};

function enrolledStudent(
  name: string,
  plan: GroupClassPaymentPlan,
  paymentStatus: GroupClassPaymentStatus,
  amountDue: number
): EnrolledStudent {
  return { name, plan, paymentStatus, amountDue };
}

export interface MyGroupClassCohort {
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  seatsFilled: number;
  seatsTotal: number;
}

export interface MyGroupClass {
  id: string;
  title: string;
  subject: string;
  level: string;
  // The precise class/grade this class targets (e.g. "SS2", "JSS3") — see
  // class-grade-taxonomy.ts. Absent on legacy seed classes that predate it.
  classGrade?: string;
  color: string;
  status: GroupClassStatus;
  seatsTotal: number;
  seatsFilled: number;
  // Only real, tutor-submitted classes (group-class-submission-store.ts)
  // carry a real minimum — legacy seed rows predate the concept.
  minStudents?: number;
  price: number;
  revenue: number;
  attendanceRate: number;
  schedule: string;
  mode: "Online" | "Physical";
  students: EnrolledStudent[];
  submittedDate?: string;
  estimatedReview?: string;
  reviewerNotes?: string[];
  // Cohort tracking is only populated for classes shown on the simplified
  // "Group Classes" tab (Classes > Group Classes) — undefined means this
  // class predates cohort tracking (still fine for the older
  // Draft/Submitted/Rejected verification-workflow views elsewhere, e.g.
  // admin). `nextCohort: null` means cohort tracking is on but the tutor
  // hasn't scheduled the next one yet ("Not scheduled yet").
  currentCohort?: MyGroupClassCohort;
  nextCohort?: MyGroupClassCohort | null;
  // Only populated for the cohort-tracked classes (see buildGroupClassCohorts
  // comment) — drives the Manage Group Class page's Settings/Class
  // Information panels.
  durationMinutes?: number;
  language?: string;
  classLink?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  description?: string;
}

export const groupClassStatusStyles: Record<GroupClassStatus, string> = {
  Draft: "bg-ensena-bg-soft text-ensena-muted",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  "Needs Changes": "bg-amber-100 text-amber-700",
  Rejected: "bg-rose-100 text-rose-700",
  Live: "bg-violet-100 text-violet-700",
  Completed: "bg-indigo-100 text-indigo-700",
};

export const initialMyGroupClasses: MyGroupClass[] = [
  {
    id: "gc-1",
    title: "French Conversation for Beginners",
    subject: "French",
    level: "Secondary",
    color: "#6C63FF",
    status: "Live",
    seatsTotal: 10,
    seatsFilled: 8,
    price: 1500,
    revenue: 96000,
    attendanceRate: 94,
    schedule: "Mon, Wed · 6:00 PM – 7:00 PM",
    mode: "Online",
    durationMinutes: 60,
    language: "English",
    classLink: "https://ensena.co/class/french-beginners",
    createdDate: "Jul 15, 2026",
    lastUpdatedDate: "Aug 5, 2026",
    description: "A friendly, conversation-first introduction to French for beginners, with weekly speaking practice and vocabulary building.",
    students: [
      enrolledStudent("Sarah A.", "Monthly", "Paid", 20400),
      enrolledStudent("James O.", "Weekly", "Paid", 2800),
      enrolledStudent("Mary U.", "Monthly", "Paid", 20400),
      enrolledStudent("David O.", "Per Session", "Pending", 1500),
      enrolledStudent("Grace A.", "Weekly", "Paid", 2800),
      enrolledStudent("Daniel N.", "Per Session", "Paid", 1500),
      enrolledStudent("Chioma E.", "Monthly", "Pending", 20400),
      enrolledStudent("Kunle A.", "Weekly", "Paid", 2800),
    ],
  },
  {
    id: "gc-2",
    title: "WAEC Revision Bootcamp",
    subject: "Mathematics",
    level: "WAEC / NECO",
    color: "#1FA971",
    status: "Submitted",
    seatsTotal: 12,
    seatsFilled: 8,
    price: 2000,
    revenue: 72000,
    attendanceRate: 88,
    schedule: "Tue, Thu, Sat · 8:00 AM – 9:30 AM",
    mode: "Online",
    submittedDate: "July 9",
    estimatedReview: "Within 24 hours",
    reviewerNotes: ["Waiting for review"],
    durationMinutes: 90,
    language: "English",
    classLink: "https://ensena.co/class/waec-math",
    createdDate: "Jul 28, 2026",
    lastUpdatedDate: "Aug 12, 2026",
    description: "An exam-focused WAEC Mathematics revision class covering the full syllabus with timed practice questions and weekly progress checks.",
    students: [
      // Cynthia Ejie is the app's one real demo Student persona
      // (dashboardStudent in student-dashboard-data.ts) — she's already
      // shown this exact class ("waec-revision") on her own dashboard and
      // in the escrow seed history, so she belongs in the tutor's real
      // roster too rather than only existing in disconnected seed data.
      enrolledStudent("Cynthia Ejie", "Per Session", "Paid", 2000),
      enrolledStudent("Blessing K.", "Monthly", "Paid", 27200),
      enrolledStudent("Tunde F.", "Weekly", "Pending", 5520),
      enrolledStudent("Sarah A.", "Per Session", "Paid", 2000),
      enrolledStudent("James O.", "Monthly", "Paid", 27200),
      enrolledStudent("Mary U.", "Weekly", "Paid", 5520),
      enrolledStudent("David O.", "Per Session", "Paid", 2000),
      enrolledStudent("Grace A.", "Monthly", "Paid", 27200),
    ],
  },
  {
    id: "gc-3",
    title: "JAMB Physics Crash Class",
    subject: "Physics",
    level: "JAMB / UTME",
    color: "#2F9BE0",
    status: "Draft",
    seatsTotal: 10,
    seatsFilled: 0,
    price: 1800,
    revenue: 0,
    attendanceRate: 0,
    schedule: "Sat · 10:00 AM – 12:00 PM",
    mode: "Online",
    durationMinutes: 120,
    language: "English",
    classLink: "https://ensena.co/class/jamb-physics",
    createdDate: "Jun 30, 2026",
    lastUpdatedDate: "Aug 1, 2026",
    description: "A fast-paced JAMB Physics crash class covering high-yield topics with past-question drills every session.",
    students: [
      enrolledStudent("Ibrahim K.", "Monthly", "Paid", 28800),
      enrolledStudent("David O.", "Monthly", "Paid", 28800),
      enrolledStudent("Chinedu K.", "Per Session", "Paid", 1800),
      enrolledStudent("Blessing K.", "Weekly", "Paid", 3600),
      enrolledStudent("Tunde F.", "Per Session", "Pending", 1800),
      enrolledStudent("Sarah A.", "Monthly", "Paid", 28800),
      enrolledStudent("James O.", "Weekly", "Paid", 3600),
      enrolledStudent("Mary U.", "Per Session", "Paid", 1800),
      enrolledStudent("Grace A.", "Monthly", "Paid", 28800),
    ],
  },
  {
    id: "gc-4",
    title: "Primary Math Boosters",
    subject: "Mathematics",
    level: "Primary",
    color: "#E58A2A",
    status: "Completed",
    seatsTotal: 8,
    seatsFilled: 8,
    price: 900,
    revenue: 57600,
    attendanceRate: 97,
    schedule: "Completed May 10, 2024",
    mode: "Online",
    students: [
      enrolledStudent("Grace A.", "Monthly", "Paid", 12240),
      enrolledStudent("Daniel N.", "Monthly", "Paid", 12240),
      enrolledStudent("Chioma E.", "Weekly", "Paid", 1656),
      enrolledStudent("Kunle A.", "Weekly", "Paid", 1656),
      enrolledStudent("Blessing K.", "Per Session", "Paid", 900),
      enrolledStudent("Tunde F.", "Per Session", "Paid", 900),
      enrolledStudent("Sarah A.", "Monthly", "Paid", 12240),
      enrolledStudent("James O.", "Weekly", "Paid", 1656),
    ],
  },
  {
    id: "gc-5",
    title: "Advanced Calculus Workshop",
    subject: "Further Mathematics",
    level: "Undergraduate",
    color: "#9B6BD6",
    status: "Needs Changes",
    seatsTotal: 10,
    seatsFilled: 0,
    price: 3000,
    revenue: 0,
    attendanceRate: 0,
    schedule: "Not yet published",
    mode: "Online",
    submittedDate: "July 5",
    estimatedReview: "Reviewed",
    reviewerNotes: [
      "Please upload a better cover image.",
      "Your lesson description is too short.",
      "Learning outcomes are missing.",
    ],
    students: [],
  },
  {
    id: "gc-6",
    title: "SAT Prep Intensive",
    subject: "English",
    level: "Undergraduate",
    color: "#B5546B",
    status: "Rejected",
    seatsTotal: 10,
    seatsFilled: 0,
    price: 3500,
    revenue: 0,
    attendanceRate: 0,
    schedule: "Not yet published",
    mode: "Online",
    submittedDate: "July 2",
    estimatedReview: "Reviewed",
    reviewerNotes: ["Class duration should be specified.", "SAT is not a supported exam board on Ensena at this time."],
    students: [],
  },
];

// Cohort data for the simplified "Group Classes" tab (Classes > Group
// Classes) — kept separate from initialMyGroupClasses (a plain array) and
// computed as a function of a real "today" anchor, same reasoning as
// buildCalendarEvents: dates relative to `new Date()` at module load would
// drift between the server render and the client's first render on a
// long-running dev server and cause a hydration mismatch. Callers should
// get `todayISO` from useTodayISO() and merge this onto initialMyGroupClasses.
export function buildGroupClassCohorts(todayISO: string): Record<string, { currentCohort: MyGroupClassCohort; nextCohort: MyGroupClassCohort | null }> {
  const today = fromISODate(todayISO);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };

  return {
    // WAEC Revision Bootcamp — seatsTotal 12 (matches base MyGroupClass record)
    "gc-2": {
      currentCohort: { startDate: addDays(-14), endDate: addDays(14), seatsFilled: 7, seatsTotal: 12 },
      nextCohort: { startDate: addDays(28), endDate: addDays(56), seatsFilled: 3, seatsTotal: 12 },
    },
    // French Conversation for Beginners — seatsTotal 10
    "gc-1": {
      currentCohort: { startDate: addDays(-13), endDate: addDays(15), seatsFilled: 5, seatsTotal: 10 },
      nextCohort: { startDate: addDays(35), endDate: addDays(63), seatsFilled: 1, seatsTotal: 10 },
    },
    // JAMB Physics Crash Class — seatsTotal 10
    "gc-3": {
      currentCohort: { startDate: addDays(-15), endDate: addDays(6), seatsFilled: 9, seatsTotal: 10 },
      nextCohort: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Manage Group Class page (Classes > Group Classes > Manage Class) — real
// per-cohort sessions and attendance, generated from a class's `schedule`
// string ("Days · start – end") rather than hand-authored, so it stays in
// sync with whatever cohort dates buildGroupClassCohorts produces.
// ---------------------------------------------------------------------------

const dayAbbrToIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function parseTimeLabel(label: string): { hour: number; minute: number } | null {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function formatTimeLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

// Only handles the "Days · start – end" shape used by cohort-tracked classes
// (gc-1/gc-2/gc-3) — returns null for anything else (e.g. the older
// Draft/Submitted-workflow classes with placeholder schedule text), and
// callers should treat that as "no sessions to generate".
function parseScheduleString(schedule: string): { days: number[]; start: { hour: number; minute: number }; end: { hour: number; minute: number } } | null {
  const [daysPart, timePart] = schedule.split("·").map((s) => s?.trim());
  if (!daysPart || !timePart) return null;
  const days = daysPart.split(",").map((d) => dayAbbrToIndex[d.trim()]).filter((d): d is number => d !== undefined);
  const [startLabel, endLabel] = timePart.split("–").map((s) => s?.trim());
  const start = startLabel ? parseTimeLabel(startLabel) : null;
  const end = endLabel ? parseTimeLabel(endLabel) : null;
  if (days.length === 0 || !start || !end) return null;
  return { days, start, end };
}

export type GroupClassSessionStatus = "Live" | "Upcoming" | "Completed";

export interface GroupClassSessionInstance {
  id: string;
  dateISO: string;
  topic: string;
  attendeeCount: number;
  status: GroupClassSessionStatus;
  startLabel: string;
  endLabel: string;
}

const sessionTopicBank: Record<string, string[]> = {
  Mathematics: ["Quadratic Equations", "Functions & Graphs", "Trigonometry Basics", "Linear Equations", "Probability & Statistics", "Circle Theorems", "Indices & Logarithms", "Simultaneous Equations"],
  French: ["Greetings & Introductions", "Everyday Vocabulary", "Present Tense Verbs", "Asking Questions", "Ordering at a Café", "Talking About Family", "Weather & Seasons", "Numbers & Time"],
  Physics: ["Motion & Forces", "Energy & Work", "Waves & Sound", "Electricity Basics", "Circuits & Resistance", "Light & Optics", "Momentum", "Past Questions Review"],
};

function sessionTopicFor(subject: string, index: number): string {
  const bank = sessionTopicBank[subject] ?? [`${subject} Fundamentals`, `${subject} Practice`, `${subject} Review`];
  return bank[index % bank.length];
}

// Generates one session per matching weekday between the cohort's start and
// end dates (inclusive). `todayISO` classifies each into Live/Upcoming/
// Completed the same way buildCalendarEvents does — as a parameter, not a
// module-level `new Date()`, to avoid the hydration mismatch documented on
// useTodayISO.
export function buildGroupClassSessions(groupClass: MyGroupClass, cohort: MyGroupClassCohort, todayISO: string): GroupClassSessionInstance[] {
  const parsed = parseScheduleString(groupClass.schedule);
  if (!parsed) return [];

  const sessions: GroupClassSessionInstance[] = [];
  const cursor = fromISODate(cohort.startDate);
  const end = fromISODate(cohort.endDate);
  let index = 0;
  while (cursor <= end) {
    if (parsed.days.includes(cursor.getDay())) {
      const dateISO = toISO(cursor);
      const status: GroupClassSessionStatus = dateISO < todayISO ? "Completed" : dateISO === todayISO ? "Live" : "Upcoming";
      sessions.push({
        id: `${groupClass.id}-session-${index}`,
        dateISO,
        topic: sessionTopicFor(groupClass.subject, index),
        attendeeCount: cohort.seatsFilled,
        status,
        startLabel: formatTimeLabel(parsed.start.hour, parsed.start.minute),
        endLabel: formatTimeLabel(parsed.end.hour, parsed.end.minute),
      });
      index++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

// Deterministic present/absent pattern (same "every 5th slot is absent"
// shape used elsewhere in this file for attendance-rate demo data) — keeps
// the Attendance tab and each student's attendance % derived from the same
// single formula instead of two separately-authored data sources drifting
// apart.
function attendedSession(studentIndex: number, sessionIndex: number): boolean {
  return (studentIndex + sessionIndex) % 5 !== 0;
}

export function buildSessionAttendance(session: GroupClassSessionInstance, sessionIndex: number, students: EnrolledStudent[]): Record<string, boolean> {
  return Object.fromEntries(students.map((s, i) => [s.name, attendedSession(i, sessionIndex)]));
}

export function studentAttendancePct(sessions: GroupClassSessionInstance[], studentIndex: number): number {
  const completed = sessions.filter((s) => s.status === "Completed");
  if (completed.length === 0) return 100;
  const present = completed.filter((_, sessionIndex) => attendedSession(studentIndex, sessionIndex)).length;
  return Math.round((present / completed.length) * 100);
}

// ---------------------------------------------------------------------------
// Students page
// ---------------------------------------------------------------------------

// Deliberately tutor-safe: no email, phone, parent/guardian contact,
// address, date of birth, or payment/escrow details — those are handled
// entirely on the student/admin side, never sent into the tutor-facing
// data model in the first place. Tutors get only what's needed to teach:
// who the student is, what/how they're doing, and how to reach them
// in-app (see Messages).
export interface StudentRecord {
  id: string;
  name: string;
  level: string;
  subjects: string[];
  progressPct: number;
  lessonsCompleted: number;
  upcomingLessons: number;
  attendancePct: number;
  homeworkPct: number;
  avgScore: number;
  lastLesson: string;
  notes: string;
  memberSince: string;
}

export const students: StudentRecord[] = [
  {
    id: "sarah-a",
    name: "Sarah A.",
    level: "WAEC / NECO",
    subjects: ["Mathematics", "French"],
    progressPct: 75,
    lessonsCompleted: 32,
    upcomingLessons: 2,
    attendancePct: 96,
    homeworkPct: 88,
    avgScore: 82,
    lastLesson: "May 18, 2024",
    notes: "Strong in algebra, needs more practice with trigonometry.",
    memberSince: "Jan 2024",
  },
  {
    id: "james-o",
    name: "James O.",
    level: "JAMB / UTME",
    subjects: ["Physics"],
    progressPct: 40,
    lessonsCompleted: 18,
    upcomingLessons: 1,
    attendancePct: 89,
    homeworkPct: 62,
    avgScore: 68,
    lastLesson: "May 20, 2024",
    notes: "Improving steadily; sometimes reschedules last minute.",
    memberSince: "Feb 2024",
  },
  {
    id: "mary-u",
    name: "Mary U.",
    level: "JAMB / UTME",
    subjects: ["Chemistry"],
    progressPct: 90,
    lessonsCompleted: 41,
    upcomingLessons: 1,
    attendancePct: 98,
    homeworkPct: 95,
    avgScore: 91,
    lastLesson: "May 18, 2024",
    notes: "Top performer, preparing for JAMB with high confidence.",
    memberSince: "Nov 2023",
  },
  {
    id: "david-o",
    name: "David O.",
    level: "JAMB / UTME",
    subjects: ["Physics", "Mathematics"],
    progressPct: 63,
    lessonsCompleted: 27,
    upcomingLessons: 1,
    attendancePct: 91,
    homeworkPct: 74,
    avgScore: 74,
    lastLesson: "May 22, 2024",
    notes: "Good grasp of mechanics, needs work on electromagnetism.",
    memberSince: "Dec 2023",
  },
  {
    id: "grace-a",
    name: "Grace A.",
    level: "WAEC / NECO",
    subjects: ["English"],
    progressPct: 55,
    lessonsCompleted: 15,
    upcomingLessons: 1,
    attendancePct: 93,
    homeworkPct: 70,
    avgScore: 70,
    lastLesson: "May 15, 2024",
    notes: "Working on essay structure and comprehension speed.",
    memberSince: "Mar 2024",
  },
  {
    id: "daniel-n",
    name: "Daniel N.",
    level: "JAMB / UTME",
    subjects: ["Mathematics"],
    progressPct: 30,
    lessonsCompleted: 6,
    upcomingLessons: 1,
    attendancePct: 100,
    homeworkPct: 50,
    avgScore: 60,
    lastLesson: "May 10, 2024",
    notes: "New student, currently building foundations in calculus.",
    memberSince: "May 2024",
  },
  {
    id: "amina-s",
    name: "Amina S.",
    level: "WAEC (Senior Secondary)",
    subjects: ["Mathematics"],
    progressPct: 68,
    lessonsCompleted: 14,
    upcomingLessons: 1,
    attendancePct: 92,
    homeworkPct: 85,
    avgScore: 78,
    lastLesson: "Aug 15, 2026",
    notes: "Doing well with algebra; needs more practice factorizing quadratic expressions.",
    memberSince: "Jan 2026",
  },
];

export type AttentionIssueTag = "Missed Lesson" | "No Upcoming Lesson" | "At Risk";

export interface AttentionInfo {
  tag: AttentionIssueTag;
  detail: string;
}

// "Needs attention" isn't an explicit field on StudentRecord — derived here
// from the real attendance/homework/upcoming-lesson numbers (checked in
// this priority order) so the sidebar badge, the My Students page, and the
// dedicated Needs Attention page all agree on the same students and reason.
export function attentionInfoFor(s: StudentRecord): AttentionInfo | null {
  if (s.attendancePct < 90) {
    return { tag: "Missed Lesson", detail: `Attendance has dropped to ${s.attendancePct}%.` };
  }
  if (s.upcomingLessons === 0) {
    return { tag: "No Upcoming Lesson", detail: "No lesson scheduled yet." };
  }
  if (s.homeworkPct < 65 || s.avgScore < 65) {
    return { tag: "At Risk", detail: `Homework completion is only ${s.homeworkPct}%.` };
  }
  return null;
}

export function studentNeedsAttention(s: StudentRecord): boolean {
  return attentionInfoFor(s) !== null;
}

export const needsAttentionCount = students.filter(studentNeedsAttention).length;

export interface SidebarNavItem {
  label: string;
  href: string;
  badge?: number;
  children?: { label: string; href: string; badge?: number }[];
}

// MVP tutor nav — intentionally flat: Dashboard, Students, Classes,
// Messages, Earnings, Reviews, Profile. Discovery Sessions, Analytics,
// Settings, Cohorts and per-student Progress/Assignments/Attendance/Notes
// are deliberately NOT separate nav items for MVP — the underlying pages
// still exist on disk and work if visited directly (nothing was deleted),
// they're just folded into the section where they conceptually belong:
// Discovery Sessions -> Classes > Schedule (alongside private/group) and
// Profile > Discovery Session (settings); Cohorts -> Classes > Group
// Classes; student Progress/Lessons/Notes -> the individual student
// profile page. "Classes" reuses the existing merged Lessons/Group
// Classes/Calendar hub (my-lessons-hub-client.tsx) via its `?tab=` query
// param rather than duplicating those pages; same for Earnings/Withdraw.
// Reviews DOES get a real top-level item (unlike the folded pages above)
// — it's a substantial page in its own right (rating breakdown, review
// list, reply flow) that previously had no link pointing to it anywhere.
export const sidebarNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/tutor-dashboard" },
  {
    label: "Students",
    href: "/tutor-dashboard/students",
    children: [
      { label: "All Students", href: "/tutor-dashboard/students" },
      { label: "Needs Attention", href: "/tutor-dashboard/students/needs-attention", badge: needsAttentionCount },
    ],
  },
  {
    label: "Classes",
    href: "/tutor-dashboard/private-lessons",
    children: [
      { label: "Schedule", href: "/tutor-dashboard/private-lessons?tab=Schedule" },
      { label: "Private Classes", href: "/tutor-dashboard/private-lessons?tab=Lessons" },
      { label: "Group Classes", href: "/tutor-dashboard/private-lessons?tab=Group Classes" },
      { label: "Discovery Sessions", href: "/tutor-dashboard/private-lessons?tab=Discovery Sessions" },
    ],
  },
  { label: "Messages", href: "/tutor-dashboard/messages" },
  {
    label: "Earnings",
    href: "/tutor-dashboard/earnings",
    children: [
      { label: "Overview", href: "/tutor-dashboard/earnings?tab=Earnings" },
      { label: "Withdraw", href: "/tutor-dashboard/earnings?tab=Withdrawals" },
    ],
  },
  { label: "Reviews", href: "/tutor-dashboard/reviews" },
  {
    label: "Profile",
    href: "/tutor-dashboard/profile",
    children: [
      { label: "Public Profile", href: "/tutor-dashboard/profile?tab=Public Profile" },
      { label: "Availability", href: "/tutor-dashboard/profile?tab=Availability" },
      { label: "Preview Profile", href: "/tutor-dashboard/profile?tab=Preview Profile" },
      { label: "Verification", href: "/tutor-dashboard/verification" },
      { label: "Settings", href: "/tutor-dashboard/settings" },
    ],
  },
];

export function findStudentIdByName(name: string): string | undefined {
  return students.find((s) => s.name === name)?.id;
}

export interface StudentLessonHistoryItem {
  date: string;
  subject: string;
  status: PrivateLessonStatus;
  score?: number;
  notes?: string;
}

export function studentLessonHistory(studentName: string): StudentLessonHistoryItem[] {
  return initialPrivateLessons
    .filter((l) => l.student === studentName)
    .map((l) => ({ date: l.date, subject: l.subject, status: l.status, score: l.status === "Completed" ? 70 + (l.id.length % 25) : undefined, notes: l.notes }));
}

export interface StudentAssignment {
  title: string;
  dueDate: string;
  status: "Submitted" | "Pending" | "Graded";
  grade?: string;
}

export const studentAssignments: StudentAssignment[] = [
  { title: "Algebra Worksheet 4", dueDate: "May 20, 2024", status: "Graded", grade: "A" },
  { title: "Trigonometry Practice Set", dueDate: "May 25, 2024", status: "Submitted" },
  { title: "Mock Test: Chapter 6", dueDate: "May 29, 2024", status: "Pending" },
];

export interface StudentInvoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "Paid" | "Pending";
}

export const studentInvoices: StudentInvoice[] = [
  { id: "INV-1042", date: "May 15, 2024", description: "4 Mathematics lessons", amount: "₦12,000", status: "Paid" },
  { id: "INV-1038", date: "May 1, 2024", description: "4 Mathematics lessons", amount: "₦12,000", status: "Paid" },
  { id: "INV-1051", date: "May 22, 2024", description: "1 Mathematics lesson", amount: "₦3,000", status: "Pending" },
];

export interface ActivityTimelineItem {
  date: string;
  description: string;
}

export const studentActivityTimeline: ActivityTimelineItem[] = [
  { date: "May 22, 2024", description: "Booked a new lesson for Wednesday" },
  { date: "May 20, 2024", description: "Submitted homework: Algebra Worksheet 4" },
  { date: "May 18, 2024", description: "Completed lesson: scored 82%" },
  { date: "May 10, 2024", description: "Left a 5-star review" },
];

// ---------------------------------------------------------------------------
// Messages page
// ---------------------------------------------------------------------------
//
// One chronological inbox, deliberately not split into separate Private
// Student / Group Class / Discovery Session inboxes (MVP decision) — each
// conversation just carries a `type` and a matching subtitle so the list
// stays scannable. Each page's demo cast is authored independently rather
// than cross-referenced against the Students page roster, matching this
// file's existing convention elsewhere — the one exception is Amina S.,
// added to `students` below, because the mockup's "View Student Profile"
// button needs somewhere real to go for at least the worked example.

export type ConversationType = "Private Student" | "Group Class" | "Discovery Session";

export interface ConversationRelatedInfo {
  privateSession?: { nextLabel: string; topic: string } | null;
  groupClass?: { name: string; schedule: string; slug: string } | null;
  discoverySession?: { statusLabel: string } | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  image?: string;
  online?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  starred: boolean;
  // Conversation Details panel — only meaningful for Private Student /
  // Discovery Session conversations (a single real person on the other end).
  // Deliberately no email/phone here: a tutor should never see a student's
  // private contact details, only what's needed to identify/reach them
  // in-app (name, level, join date, the related booking).
  studentName?: string;
  level?: string;
  joinedDate?: string;
  related?: ConversationRelatedInfo;
}

export const initialConversations: Conversation[] = [
  {
    id: "c-amina",
    type: "Private Student",
    title: "Amina S.",
    subtitle: "Private Student",
    image: "/teacher-1.jpg.png",
    online: true,
    lastMessage: "Thank you! That makes sense now.",
    time: "10:24 AM",
    unread: 2,
    starred: false,
    studentName: "Amina S.",
    level: "WAEC (Senior Secondary)",
    joinedDate: "Jan 12, 2026",
    related: {
      privateSession: { nextLabel: "Today, 4:00 PM", topic: "Quadratic Equations" },
      groupClass: { name: "WAEC Math Prep", schedule: "Tues & Thu, 6:00 PM", slug: "waec-revision-bootcamp" },
      discoverySession: { statusLabel: "Completed on Aug 10, 2026" },
    },
  },
  {
    id: "c-david-g",
    type: "Private Student",
    title: "David G.",
    subtitle: "Private Student",
    image: "/teacher-3.jpg.png",
    online: false,
    lastMessage: "Can we reschedule our next session?",
    time: "9:15 AM",
    unread: 1,
    starred: false,
    studentName: "David G.",
    level: "JAMB / UTME",
    joinedDate: "Feb 3, 2026",
    related: {
      privateSession: { nextLabel: "Fri, 5:00 PM", topic: "Mechanics Review" },
      groupClass: null,
      discoverySession: null,
    },
  },
  {
    id: "c-waec-math-prep",
    type: "Group Class",
    title: "WAEC Math Prep",
    subtitle: "Group Class · 10 students",
    lastMessage: "Sarah: Will the notes be shared after class?",
    time: "Yesterday",
    unread: 2,
    starred: true,
    related: {
      groupClass: { name: "WAEC Math Prep", schedule: "Tues & Thu, 6:00 PM", slug: "waec-revision-bootcamp" },
    },
  },
  {
    id: "c-discovery-chinedu",
    type: "Discovery Session",
    title: "Discovery Session",
    subtitle: "With Chinedu K.",
    image: "/teacher-4.jpg.png",
    lastMessage: "Thanks for the session!",
    time: "Yesterday",
    unread: 1,
    starred: false,
    studentName: "Chinedu K.",
    related: {
      discoverySession: { statusLabel: "Completed Yesterday" },
    },
  },
  {
    id: "c-sarah-o",
    type: "Private Student",
    title: "Sarah O.",
    subtitle: "Private Student",
    image: "/teacher-2.jpg.png",
    online: false,
    lastMessage: "Okay, I will try those questions.",
    time: "Mon",
    unread: 0,
    starred: false,
    studentName: "Sarah O.",
    level: "Secondary",
    joinedDate: "Nov 2, 2025",
    related: {
      privateSession: { nextLabel: "Wed, 3:00 PM", topic: "Essay Writing" },
      groupClass: null,
      discoverySession: null,
    },
  },
  {
    id: "c-ibrahim-b",
    type: "Private Student",
    title: "Ibrahim B.",
    subtitle: "Private Student",
    image: "/teacher-3.jpg.png",
    online: false,
    lastMessage: "Thank you so much!",
    time: "Mon",
    unread: 0,
    starred: false,
    studentName: "Ibrahim B.",
    level: "JAMB / UTME",
    joinedDate: "Oct 20, 2025",
    related: {
      privateSession: null,
      groupClass: null,
      discoverySession: null,
    },
  },
  {
    id: "c-functions-graphs",
    type: "Group Class",
    title: "Functions & Graphs",
    subtitle: "Group Class · 8 students",
    lastMessage: "David: I have a question about the homework.",
    time: "Sun",
    unread: 0,
    starred: false,
    related: {
      groupClass: { name: "Functions & Graphs", schedule: "Mon & Wed, 5:00 PM", slug: "functions-graphs" },
    },
  },
];

export interface ChatMessage {
  id: string;
  convId: string;
  sender: "tutor" | "student";
  // Shown above the bubble for Group Class threads (multiple students share
  // one conversation) — omitted for 1:1 Private Student / Discovery Session
  // threads where the chat header already establishes who "student" is.
  studentName?: string;
  text?: string;
  time: string;
  /** @deprecated name-only decorative field from before real attachments existed — kept for old seed rows; new messages use `attachments` (message-attachment-types.ts), backed by real IndexedDB blobs. */
  attachment?: { type: "image" | "pdf" | "voice"; name: string };
  attachments?: MessageAttachment[];
  offer?: Offer;
  read: boolean;
  dividerBefore?: string;
  /** Client-generated per-send-attempt id — lets sendTutorMessage reject an exact retry (double-tap Send, a retried failed request) as a no-op rather than creating a second message. */
  clientId?: string;
}

export const initialMessages: ChatMessage[] = [
  { id: "m-amina-1", convId: "c-amina", sender: "student", text: "Hi tutor, I was reviewing the notes from yesterday but I'm still confused about factorizing quadratic expressions.", time: "10:18 AM", read: true, dividerBefore: "Today" },
  { id: "m-amina-2", convId: "c-amina", sender: "tutor", text: "Hello Amina! No worries \u{1F60A} Which part exactly are you struggling with?", time: "10:20 AM", read: true },
  { id: "m-amina-3", convId: "c-amina", sender: "student", text: "The difference of two squares. I keep getting the signs wrong.", time: "10:21 AM", read: true },
  { id: "m-amina-4", convId: "c-amina", sender: "tutor", text: "Okay, I'll explain it with a few examples. Give me 2 minutes.", time: "10:21 AM", read: true },
  { id: "m-amina-5", convId: "c-amina", sender: "student", text: "Thank you! That makes sense now.", time: "10:24 AM", read: false, dividerBefore: "1 unread message" },

  { id: "m-david-g-1", convId: "c-david-g", sender: "student", text: "Hi, hope you're doing well!", time: "9:10 AM", read: true, dividerBefore: "Today" },
  { id: "m-david-g-2", convId: "c-david-g", sender: "student", text: "Can we reschedule our next session?", time: "9:15 AM", read: false, dividerBefore: "1 unread message" },

  { id: "m-waec-1", convId: "c-waec-math-prep", sender: "tutor", text: "Reminder: our next class is Thursday at 6:00 PM.", time: "Yesterday", read: true, dividerBefore: "Yesterday" },
  { id: "m-waec-2", convId: "c-waec-math-prep", sender: "student", studentName: "Sarah", text: "Will the notes be shared after class?", time: "Yesterday", read: false },
  { id: "m-waec-3", convId: "c-waec-math-prep", sender: "student", studentName: "Tunde F.", text: "+1, that would help a lot.", time: "Yesterday", read: false, dividerBefore: "2 unread messages" },

  { id: "m-discovery-1", convId: "c-discovery-chinedu", sender: "tutor", text: "Great meeting you today, Chinedu! I've sent a learning plan to your dashboard.", time: "Yesterday", read: true, dividerBefore: "Yesterday" },
  { id: "m-discovery-2", convId: "c-discovery-chinedu", sender: "student", text: "Thanks for the session!", time: "Yesterday", read: false, dividerBefore: "1 unread message" },

  { id: "m-sarah-o-1", convId: "c-sarah-o", sender: "tutor", text: "Try questions 5 to 10 before our next class.", time: "Mon", read: true, dividerBefore: "Monday" },
  { id: "m-sarah-o-2", convId: "c-sarah-o", sender: "student", text: "Okay, I will try those questions.", time: "Mon", read: true },

  { id: "m-ibrahim-b-1", convId: "c-ibrahim-b", sender: "tutor", text: "Here's the recording from today's session in case you want to review it.", time: "Mon", read: true, dividerBefore: "Monday" },
  { id: "m-ibrahim-b-2", convId: "c-ibrahim-b", sender: "student", text: "Thank you so much!", time: "Mon", read: true },

  { id: "m-fg-1", convId: "c-functions-graphs", sender: "tutor", text: "Homework for this week is up in the classroom.", time: "Sun", read: true, dividerBefore: "Sunday" },
  { id: "m-fg-2", convId: "c-functions-graphs", sender: "student", studentName: "David", text: "I have a question about the homework.", time: "Sun", read: true },
];

// ---------------------------------------------------------------------------
// Homework page
// ---------------------------------------------------------------------------

export type HomeworkStatus = "Draft" | "Scheduled" | "Submitted" | "Pending Review" | "Reviewed";

export interface HomeworkItem {
  id: string;
  title: string;
  student: string;
  subject: string;
  deadline: string;
  status: HomeworkStatus;
  grade?: string;
  feedback?: string;
  attachments: string[];
}

export const homeworkStatusStyles: Record<HomeworkStatus, string> = {
  Draft: "bg-ensena-bg-soft text-ensena-muted",
  Scheduled: "bg-indigo-100 text-indigo-700",
  Submitted: "bg-blue-100 text-blue-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  Reviewed: "bg-emerald-100 text-emerald-700",
};

export const initialHomework: HomeworkItem[] = [
  { id: "hw-1", title: "Algebra Worksheet 4", student: "Sarah A.", subject: "Mathematics", deadline: "May 20, 2024", status: "Reviewed", grade: "A", feedback: "Excellent work on factorization. Keep practicing word problems.", attachments: ["Algebra_Worksheet_4.pdf"] },
  { id: "hw-2", title: "Trigonometry Practice Set", student: "Sarah A.", subject: "Mathematics", deadline: "May 25, 2024", status: "Pending Review", attachments: ["Trig_Practice.pdf"] },
  { id: "hw-3", title: "Essay: My Community", student: "Grace A.", subject: "English", deadline: "May 23, 2024", status: "Submitted", attachments: ["My_Community_Essay.docx"] },
  { id: "hw-4", title: "Mock Test: Chapter 6", student: "Sarah A.", subject: "Mathematics", deadline: "May 29, 2024", status: "Scheduled", attachments: [] },
  { id: "hw-5", title: "Electromagnetism Problem Set", student: "David O.", subject: "Physics", deadline: "May 18, 2024", status: "Reviewed", grade: "B+", feedback: "Good understanding of the core concepts, review Lenz's law once more.", attachments: ["EM_Problems.pdf"] },
  { id: "hw-6", title: "Periodic Table Quiz", student: "Mary U.", subject: "Chemistry", deadline: "May 21, 2024", status: "Pending Review", attachments: ["Periodic_Quiz.pdf"] },
  { id: "hw-7", title: "Vocabulary Builder: Unit 3", student: "James O.", subject: "Physics", deadline: "May 30, 2024", status: "Draft", attachments: [] },
];

// ---------------------------------------------------------------------------
// Reviews page
// ---------------------------------------------------------------------------

export interface TutorReview {
  id: string;
  student: string;
  rating: number;
  subject: string;
  date: string;
  text: string;
  reply?: string;
}

export const initialTutorReviews: TutorReview[] = [
  { id: "rv-1", student: "Sarah A.", rating: 5, subject: "Mathematics", date: "May 18, 2024", text: "Excellent tutor! Explanations are always clear and she's very patient.", reply: "Thank you Sarah, I'm so glad the sessions are helping!" },
  { id: "rv-2", student: "Mary U.", rating: 5, subject: "Chemistry", date: "May 12, 2024", text: "Helped me pass my JAMB mock with a much better score than I expected." },
  { id: "rv-3", student: "David O.", rating: 4, subject: "Physics", date: "May 8, 2024", text: "Very knowledgeable, sometimes sessions run a little long but worth it." },
  { id: "rv-4", student: "Grace A.", rating: 5, subject: "English", date: "May 2, 2024", text: "My essay writing has improved so much in just a few weeks." },
  { id: "rv-5", student: "James O.", rating: 4, subject: "Physics", date: "Apr 27, 2024", text: "Good teacher, would love more practice questions after each class." },
  { id: "rv-6", student: "Daniel N.", rating: 3, subject: "Mathematics", date: "Apr 20, 2024", text: "Sessions are fine but I wish there was more homework follow-up." },
];

export const reviewKeywords = ["Patient", "Clear explanations", "Knowledgeable", "Punctual", "Encouraging", "Well-prepared"];

// ---------------------------------------------------------------------------
// Analytics page
// ---------------------------------------------------------------------------

export const analyticsOverview = {
  bookings: { value: 142, changePct: 18 },
  revenue: { value: 245000, changePct: 15 },
  profileViews: { value: 3280, changePct: 9 },
  conversionRate: { value: 12.4, changePct: 2 },
  repeatStudents: { value: 78, changePct: 6 },
  responseTime: { value: "Under 1 hour", changePct: 0 },
  lessonCompletion: { value: 96, changePct: 3 },
  cancellationRate: { value: 4, changePct: -1 },
};

export const bookingsBySubject = [
  { subject: "Mathematics", bookings: 52 },
  { subject: "Physics", bookings: 38 },
  { subject: "Chemistry", bookings: 24 },
  { subject: "French", bookings: 18 },
  { subject: "English", bookings: 10 },
];

export const revenueTrend = [120000, 145000, 132000, 168000, 190000, 178000, 210000, 198000, 225000, 215000, 238000, 245000];

export const peakHours = [
  { hour: "8 AM", bookings: 8 },
  { hour: "10 AM", bookings: 14 },
  { hour: "12 PM", bookings: 6 },
  { hour: "2 PM", bookings: 18 },
  { hour: "4 PM", bookings: 22 },
  { hour: "6 PM", bookings: 30 },
  { hour: "8 PM", bookings: 16 },
];

// ---------------------------------------------------------------------------
// Earnings page
// ---------------------------------------------------------------------------

// Everything here is deliberately MVP-simple — no revenue forecast, top
// paying students, per-subject/per-student breakdowns, or AI insights.
// Figures represent the *tutor's* earnings after Ensena's commission
// (splitEarnings, ENSENA_COMMISSION_PCT) unless labelled "gross" — see
// commission.ts. `earningsBalances` is shared with the Withdrawals and
// Escrow pages so "available to withdraw" always agrees across all three.

export const earningsPageOverview = {
  availableBalance: 84500,
  // Gross, not net — the monthly card and the breakdown card both derive
  // their commission/net figures from this single number via
  // splitEarnings() rather than storing the net amount separately, so the
  // two can never drift apart.
  monthlyGross: 157500,
  // All-time, already net — no gross history is modelled, so this is
  // authored directly rather than derived.
  totalEarnedNet: 485000,
};

export const revenueBySubject = [
  { label: "Mathematics", amount: 98000, color: "#6C63FF" },
  { label: "Physics", amount: 62000, color: "#2F9BE0" },
  { label: "Chemistry", amount: 41000, color: "#1FA971" },
  { label: "French", amount: 28000, color: "#E58A2A" },
  { label: "English", amount: 16000, color: "#9B6BD6" },
];

export const earningsBalances = {
  escrow: 18000,
  available: 84500,
  pending: 15000,
  withdrawable: 84500,
};

export interface EarningsTrendPoint {
  label: string;
  amount: number;
}

export const earningsWeeklyTrend: EarningsTrendPoint[] = [
  { label: "Mon", amount: 8000 },
  { label: "Tue", amount: 12000 },
  { label: "Wed", amount: 5000 },
  { label: "Thu", amount: 15000 },
  { label: "Fri", amount: 9000 },
  { label: "Sat", amount: 6500 },
  { label: "Sun", amount: 4000 },
];

export const earningsMonthlyTrend: EarningsTrendPoint[] = [
  9200, 10800, 9600, 11200, 13800, 15400, 14200, 16800, 19600, 22400, 24800, 26400, 25200, 22800,
  19400, 16200, 13800, 15600, 18400, 20200, 18800, 15400, 12200, 9800, 13400, 15800, 14200, 11600,
  9400, 8200, 7600,
].map((amount, i) => ({ label: `${i + 1} Aug`, amount }));

export const earnings3MonthTrend: EarningsTrendPoint[] = [
  { label: "Jun Wk1", amount: 28000 },
  { label: "Jun Wk2", amount: 34000 },
  { label: "Jun Wk3", amount: 25000 },
  { label: "Jun Wk4", amount: 31000 },
  { label: "Jul Wk1", amount: 36000 },
  { label: "Jul Wk2", amount: 42000 },
  { label: "Jul Wk3", amount: 38000 },
  { label: "Jul Wk4", amount: 45000 },
  { label: "Aug Wk1", amount: 48000 },
  { label: "Aug Wk2", amount: 52000 },
  { label: "Aug Wk3", amount: 41000 },
  { label: "Aug Wk4", amount: 35000 },
];

// Already net (post-commission) — matches how they're always shown.
export const incomeByLessonType = [
  { label: "Private Classes", amount: 78000, pct: 62, color: "#F80248" },
  { label: "Group Classes", amount: 38000, pct: 30, color: "#2F9BE0" },
  { label: "Discovery Sessions", amount: 10000, pct: 8, color: "#E58A2A" },
];

export type EarningsTransactionStatus = "Paid" | "Pending";
export type EarningsTransactionType = "Private Class" | "Group Class";

export interface EarningsTransaction {
  id: string;
  name: string;
  type: EarningsTransactionType;
  meta?: string;
  image?: string;
  date: string;
  time: string;
  gross: number;
  status: EarningsTransactionStatus;
}

// Same people/photos as the Messages page's conversations, where they
// overlap (Chinedu K., Amina S., Ibrahim B.) — one consistent cast rather
// than each page inventing its own.
export const earningsTransactions: EarningsTransaction[] = [
  { id: "tx-1", name: "Chinedu K.", type: "Private Class", image: "/teacher-4.jpg.png", date: "Aug 18, 2026", time: "10:00 AM", gross: 5000, status: "Paid" },
  { id: "tx-2", name: "WAEC Math Prep", type: "Group Class", meta: "10 students", date: "Aug 17, 2026", time: "6:00 PM", gross: 20000, status: "Paid" },
  { id: "tx-3", name: "Amina S.", type: "Private Class", image: "/teacher-1.jpg.png", date: "Aug 16, 2026", time: "4:00 PM", gross: 5000, status: "Paid" },
  { id: "tx-4", name: "Functions & Graphs", type: "Group Class", meta: "8 students", date: "Aug 15, 2026", time: "6:00 PM", gross: 15000, status: "Pending" },
  { id: "tx-5", name: "Ibrahim B.", type: "Private Class", image: "/teacher-3.jpg.png", date: "Aug 14, 2026", time: "11:00 AM", gross: 5000, status: "Paid" },
];

// ---------------------------------------------------------------------------
// Withdrawals page
// ---------------------------------------------------------------------------

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
  isDefault: boolean;
}

export const initialBankAccounts: BankAccount[] = [
  { id: "bank-1", bankName: "GTBank", accountNumber: "0123456789", accountName: "Adaeze Okonkwo", verified: true, isDefault: true },
  { id: "bank-2", bankName: "Access Bank", accountNumber: "0987654321", accountName: "Adaeze Okonkwo", verified: false, isDefault: false },
];

export type WithdrawalStatus = "Pending" | "Processing" | "Completed" | "Rejected" | "Failed";

export interface WithdrawalRecord {
  id: string;
  date: string;
  amount: number;
  bank: string;
  status: WithdrawalStatus;
}

export const withdrawalStatusStyles: Record<WithdrawalStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Processing: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Failed: "bg-rose-100 text-rose-700",
};

export const initialWithdrawals: WithdrawalRecord[] = [
  { id: "wd-1", date: "Jul 6, 2024", amount: 20000, bank: "GTBank •••6789", status: "Completed" },
  { id: "wd-2", date: "Jul 2, 2024", amount: 35000, bank: "Access Bank •••4321", status: "Completed" },
  { id: "wd-3", date: "Jun 28, 2024", amount: 10000, bank: "GTBank •••6789", status: "Processing" },
  { id: "wd-4", date: "Jun 20, 2024", amount: 50000, bank: "Zenith Bank •••7788", status: "Failed" },
];

export const withdrawalRules = {
  minimum: 1000,
  processingTime: "Within 24 hours",
  fee: 0,
};

export const processingStages = ["Withdrawal Requested", "Processing", "Sent to Bank", "Completed"];

export const withdrawalNotifications = [
  "Withdrawal successful: ₦20,000 sent to GTBank.",
  "Bank confirmed payment.",
  "Receipt generated for withdrawal wd-2.",
];

export const financialDocuments = ["Monthly Earnings Statement", "Annual Earnings Report", "Withdrawal History", "Payment Receipts"];

// ---------------------------------------------------------------------------
// Escrow page
// ---------------------------------------------------------------------------

export interface EscrowTransaction {
  id: string;
  student: string;
  description: string;
  amount: number;
  platformFee: number;
  status: "Held" | "Released" | "Refunded" | "Disputed";
  date: string;
  expectedRelease?: string;
}

export const initialEscrowTransactions: EscrowTransaction[] = [
  { id: "esc-1", student: "David O.", description: "Physics Lesson", amount: 7500, platformFee: 1125, status: "Held", date: "May 22, 2024", expectedRelease: "After lesson completion" },
  { id: "esc-2", student: "French Beginners Group", description: "Group Class Session", amount: 6000, platformFee: 900, status: "Held", date: "May 23, 2024", expectedRelease: "After lesson completion" },
  { id: "esc-3", student: "Mary U.", description: "Chemistry Lesson", amount: 4500, platformFee: 675, status: "Held", date: "May 24, 2024", expectedRelease: "After lesson completion" },
  { id: "esc-4", student: "Sarah A.", description: "Mathematics Lesson", amount: 3000, platformFee: 450, status: "Released", date: "May 18, 2024" },
  { id: "esc-5", student: "James O.", description: "Physics Lesson", amount: 5250, platformFee: 788, status: "Released", date: "May 15, 2024" },
  { id: "esc-6", student: "Tunde F.", description: "Mathematics Lesson (Cancelled)", amount: 2250, platformFee: 0, status: "Refunded", date: "May 14, 2024" },
];

// ---------------------------------------------------------------------------
// Escrow Center (bookings, lesson-by-lesson breakdown, timeline, disputes)
// ---------------------------------------------------------------------------

export interface EscrowBookingLesson {
  label: string;
  status: "Completed" | "Held" | "Scheduled";
  amountGross: number;
  date: string;
}

export interface EscrowBooking {
  id: string;
  title: string;
  student: string;
  subject: string;
  type: "Private" | "Group";
  plan: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  lessons: EscrowBookingLesson[];
}

function buildLessons(total: number, completed: number, amount: number, startDay: number): EscrowBookingLesson[] {
  return Array.from({ length: total }, (_, i) => {
    const isCompleted = i < completed;
    const isNext = i === completed;
    return {
      label: `Lesson ${i + 1}`,
      status: isCompleted ? "Completed" : isNext ? "Held" : "Scheduled",
      amountGross: amount,
      date: isCompleted ? `${startDay + i} May` : isNext ? "Tomorrow" : `${startDay + i} June`,
    } as EscrowBookingLesson;
  });
}

export const escrowBookings: EscrowBooking[] = [
  {
    id: "bk-1",
    title: "WAEC Mathematics",
    student: "Sarah A.",
    subject: "Mathematics",
    type: "Private",
    plan: "Monthly",
    startDate: "May 1",
    endDate: "Aug 1",
    totalSessions: 12,
    completedSessions: 4,
    lessons: buildLessons(12, 4, 3000, 1),
  },
  {
    id: "bk-2",
    title: "JAMB Physics",
    student: "David O.",
    subject: "Physics",
    type: "Private",
    plan: "Weekly",
    startDate: "May 20",
    endDate: "Aug 20",
    totalSessions: 12,
    completedSessions: 0,
    lessons: buildLessons(12, 0, 4500, 20),
  },
  {
    id: "bk-3",
    title: "Chemistry Catch-Up",
    student: "Mary U.",
    subject: "Chemistry",
    type: "Private",
    plan: "Per Session",
    startDate: "May 18",
    endDate: "May 18",
    totalSessions: 1,
    completedSessions: 1,
    lessons: buildLessons(1, 1, 2500, 18),
  },
  {
    id: "bk-4",
    title: "French Conversation for Beginners",
    student: "French Beginners Group",
    subject: "French",
    type: "Group",
    plan: "Full Course",
    startDate: "Apr 1",
    endDate: "May 27",
    totalSessions: 8,
    completedSessions: 3,
    lessons: buildLessons(8, 3, 6000, 1),
  },
];

export const escrowUpcomingReleases = [
  { date: "Tomorrow", student: "Sarah A.", amountGross: 3000 },
  { date: "Friday", student: "David O.", amountGross: 4500 },
  { date: "Saturday", student: "French Beginners Group", amountGross: 6000 },
];

export interface EscrowDispute {
  id: string;
  student: string;
  subject: string;
  reason: string;
  amountFrozen: number;
  status: "Awaiting Admin Review" | "Resolved";
}

export const escrowDisputes: EscrowDispute[] = [
  { id: "dis-1", student: "Tunde F.", subject: "Mathematics", reason: "Lesson quality issue", amountFrozen: 2250, status: "Awaiting Admin Review" },
];

export const escrowNotifications = [
  "₦3,000 released to Sarah A. for Mathematics Lesson 4.",
  "Lesson confirmed: David O., Physics.",
  "Mary U. completed Chemistry Catch-Up. Funds releasing.",
  "Escrow updated for French Conversation for Beginners.",
  "Withdrawal successful: ₦40,000 sent to GTBank.",
  "Tunde F. requested a refund for a cancelled lesson.",
];

export const escrowMonthlyTrend = {
  held: [12000, 15000, 18000, 16000, 20000, 22000, 19000, 21000, 24000, 23000, 25000, 26500],
  released: [80000, 92000, 88000, 105000, 112000, 98000, 120000, 118000, 130000, 128000, 140000, 145000],
};


// ---------------------------------------------------------------------------
// Resources page
// ---------------------------------------------------------------------------

export interface ResourceFile {
  id: string;
  name: string;
  folder: string;
  type: "PDF" | "Video" | "Slides" | "Doc";
  size: string;
  sharedWithStudents: boolean;
}

export const resourceFolders = ["Worksheets", "Past Questions", "Lesson Plans", "Videos", "Assignments"];

export const initialResourceFiles: ResourceFile[] = [
  { id: "res-1", name: "Algebra Basics Worksheet.pdf", folder: "Worksheets", type: "PDF", size: "1.2 MB", sharedWithStudents: true },
  { id: "res-2", name: "Trigonometry Practice.pdf", folder: "Worksheets", type: "PDF", size: "980 KB", sharedWithStudents: true },
  { id: "res-3", name: "WAEC Mathematics 2023.pdf", folder: "Past Questions", type: "PDF", size: "2.4 MB", sharedWithStudents: false },
  { id: "res-4", name: "JAMB Physics 2022.pdf", folder: "Past Questions", type: "PDF", size: "2.1 MB", sharedWithStudents: false },
  { id: "res-5", name: "Week 1: Functions.pptx", folder: "Lesson Plans", type: "Slides", size: "3.5 MB", sharedWithStudents: false },
  { id: "res-6", name: "Intro to Calculus.mp4", folder: "Videos", type: "Video", size: "48 MB", sharedWithStudents: true },
  { id: "res-7", name: "Homework Template.docx", folder: "Assignments", type: "Doc", size: "220 KB", sharedWithStudents: true },
];

// ---------------------------------------------------------------------------
// Tutor Profile (My Profile) page
// ---------------------------------------------------------------------------

export const tutorProfileDetail = {
  bio: "I help students build strong foundations in Mathematics and French through interactive, student-centered lessons. Over 6 years I've helped hundreds of students improve their grades and confidence.",
  subjects: ["Mathematics", "French"],
  levels: ["Secondary", "WAEC / NECO", "JAMB / UTME"],
  languages: ["English (Native)", "French (Fluent)", "Igbo (Native)"],
  qualifications: ["B.Sc. Mathematics, University of Lagos", "PGDE, University of Ibadan"],
  certificates: ["Certified WAEC Examiner", "TEFL Certificate"],
  teachingStyle: "Interactive, exam-focused, practical",
  experience: "6+ years",
  pricePerHour: 2800,
  memberSince: "November 2023",
};

// ---------------------------------------------------------------------------
// Public Profile (MVP) — Profile > Public Profile. Deliberately a narrower
// field set than the older "kitchen sink" ProfileEditorClient
// (/tutor-dashboard/profile/edit, still on disk but no longer the primary
// edit entry point): photo, name, bio, subjects, academic levels, exam
// expertise, teaching experience, languages, pricing, discovery session —
// nothing else. Separate option pools from subjectOptions/
// academicLevelOptions (which mix in exam boards and serve the older
// editor) so this page's Academic Levels vs Exam Expertise stay cleanly
// distinct without touching that page's behavior.
export const tutorPublicProfile = {
  headline: "Math Tutor | WAEC, JAMB & University Level",
  bio: "Passionate math tutor with over 6 years of experience helping students build confidence and achieve excellent results. I simplify complex concepts and tailor lessons to each student's learning style.",
  subjects: ["Mathematics", "Further Mathematics", "Statistics"],
  academicLevels: ["Secondary School", "Undergraduate"],
  examExpertise: ["WAEC", "JAMB/UTME", "NECO"],
  teachingExperienceYears: 6,
  languages: ["English", "Yoruba"],
  hourlyRate: 5000,
  hourlyDurationMins: 60 as 30 | 45 | 60,
  discoveryEnabled: true,
  discoveryDurationMins: 30 as 15 | 30,
  discoveryPrice: 0,
};

export const profileSubjectOptions = ["Mathematics", "Further Mathematics", "Statistics", "Physics", "Chemistry", "Biology", "English", "French", "Economics", "Government", "Literature"];
export const profileAcademicLevelOptions = ["Primary School", "Secondary School", "Undergraduate", "Postgraduate", "Adult Learner"];
export const profileExamExpertiseOptions = ["WAEC", "NECO", "JAMB/UTME", "Post-UTME", "IGCSE", "SAT", "Common Entrance"];
export const profileLanguageOptions = ["English", "French", "Yoruba", "Igbo", "Hausa", "Arabic", "Spanish"];

// "Mon – Fri, 10:00 AM – 8:00 PM" style summary of defaultWeeklyAvailability
// (or a passed-in copy of it) — real data, not hardcoded, so the mobile
// Availability summary card never drifts from the actual Availability tab.
export function summarizeWeeklyAvailability(days: WeeklyAvailabilityDay[]): string {
  const enabledDays = days.filter((d) => d.enabled);
  if (enabledDays.length === 0) return "No availability set";
  const dayAbbrev = (day: string) => day.slice(0, 3);
  const first = enabledDays[0];
  const last = enabledDays[enabledDays.length - 1];
  const sameHoursThroughout = enabledDays.every((d) => d.start === first.start && d.end === first.end);
  const dayRange = enabledDays.length > 1 && enabledDays.length === (days.indexOf(last) - days.indexOf(first) + 1)
    ? `${dayAbbrev(first.day)} – ${dayAbbrev(last.day)}`
    : enabledDays.map((d) => dayAbbrev(d.day)).join(", ");
  return sameHoursThroughout ? `${dayRange}, ${first.start} – ${first.end}` : `${dayRange}, varies by day`;
}

// ---------------------------------------------------------------------------
// Verification & Documents (Profile > Public Profile) — private to the
// tutor and admin. Never surfaced on ProfilePreviewCard, the Preview
// Profile tab, or the real public /find-teachers/[slug] page — students
// only ever see the "Verified Tutor" badge derived from dashboardTutor,
// never these records. Separate from the older, admin-facing
// VerificationDoc/defaultVerificationDocs (used only by the deprioritized
// /tutor-dashboard/profile/edit) and from admin-tutor-profile-data.ts's own
// VerificationDocument model — each side of the review already has its own
// independently-authored demo data, matching this file's existing
// convention elsewhere.
export type TutorDocumentStatus = "Pending Review" | "Verified" | "Changes Required";

export interface TutorDocument {
  id: string;
  name: string;
  fileName: string;
  uploadedDate: string;
  status: TutorDocumentStatus;
}

export const tutorDocumentStatusStyles: Record<TutorDocumentStatus, string> = {
  "Pending Review": "bg-amber-100 text-amber-700",
  Verified: "bg-emerald-100 text-emerald-700",
  "Changes Required": "bg-rose-100 text-rose-700",
};

export const defaultTutorDocuments: TutorDocument[] = [
  { id: "doc-gov-id", name: "Government-issued ID", fileName: "national-id-tunde-adebayo.pdf", uploadedDate: "Jul 20, 2026", status: "Verified" },
  { id: "doc-degree", name: "Degree Certificate", fileName: "bsc-mathematics-unilag.pdf", uploadedDate: "Jul 20, 2026", status: "Verified" },
  { id: "doc-teaching-cert", name: "Teaching Credential", fileName: "waec-examiner-certificate.pdf", uploadedDate: "Jul 22, 2026", status: "Pending Review" },
  { id: "doc-subject-qual", name: "Subject Qualification", fileName: "further-maths-endorsement.pdf", uploadedDate: "Aug 1, 2026", status: "Changes Required" },
];

// ---------------------------------------------------------------------------
// Help Center page
// ---------------------------------------------------------------------------

export interface FaqItem {
  question: string;
  answer: string;
  // Loosely matches a SupportContext value (support-data.ts) — kept as a
  // plain string here rather than importing that type, since this is a
  // broad, foundational data file and the tag is only ever compared as a
  // string by HelpCenterClient's highlightContext sort. Optional: most FAQ
  // items don't map to a specific support context and just keep their
  // natural order.
  tags?: string[];
}

export const faqItems: FaqItem[] = [
  // Getting started
  { question: "How do I become a tutor on Ensena?", answer: "Sign up as a tutor and complete the application: your photo and profile, the subjects and academic levels you teach, your teaching format, and your verification documents. You must be at least 18. Our team reviews your application and you can start taking bookings once you're approved. You can follow progress under Application Status.", tags: ["account", "tutor-signup"] },
  { question: "How do I verify my account?", answer: "Go to Verification and upload a government-issued ID plus your academic certificate and any teaching qualification. PDF, JPG, PNG, WEBP, GIF and Word files are accepted. If a document is rejected you'll see the reason and can upload a new one.", tags: ["account"] },
  { question: "How do I complete my tutor profile?", answer: "Go to Profile → Public Profile and add a clear photo, a specific headline, your bio, subjects and academic levels, languages, experience and your prices. Use Preview Profile to see exactly what students see.", tags: ["account"] },
  { question: "Why can't students find my profile?", answer: "Your profile only appears in Find Teachers when your application is approved, your profile is set to public (Settings → Privacy) and Vacation Mode is off (Profile → Availability). Students also only see times that fall inside your weekly availability.", tags: ["account"] },
  // Availability & calendar
  { question: "How do I set my availability?", answer: "Go to Profile → Availability and set your weekly hours. Students can book any free 30-minute slot inside those hours, at least 2 hours ahead and up to 90 days in advance. Times are shown in Nigeria time (WAT).", tags: ["account"] },
  { question: "How do I block time off or go on holiday?", answer: "In Profile → Availability, use Block Time to close specific dates or hours. To pause all new bookings, turn on Vacation Mode. Lessons you've already accepted stay booked either way." },
  // Lessons & bookings
  { question: "How do students book me?", answer: "Students choose a free slot in your availability and pay to confirm it, so there's nothing for you to accept. An unpaid booking only holds the slot for 30 minutes. Paid lessons appear in Classes → Private Classes and on your Schedule.", tags: ["booking"] },
  { question: "When can I enter the classroom?", answer: "You can open the classroom for a lesson up to 24 hours before it starts, so you can set up your whiteboard and materials. Students can join from 30 minutes before the start time.", tags: ["booking", "technical"] },
  { question: "How do I reschedule a lesson?", answer: "Open the lesson in Classes → Private Classes and choose Reschedule. You can move a lesson up to 2 hours before it starts, to any time within the next 90 days that doesn't clash with your other classes or the student's. The student is notified straight away.", tags: ["booking"] },
  { question: "What happens if I cancel a lesson?", answer: "When you cancel, the student always gets a full refund, and you'll be asked for a reason that is shared with them. If you only need a different time, reschedule instead.", tags: ["booking"] },
  { question: "What happens if a student cancels?", answer: "If a student cancels 24 hours or more before the lesson they get a full refund. Between 2 and 24 hours before, they get 50% back and you keep the rest. Within 2 hours, or if the student doesn't show up, there's no refund.", tags: ["booking", "payment"] },
  { question: "How do I mark a lesson as complete?", answer: "Ending the class from the classroom completes it automatically. If a lesson ended without that, open Classes → Private Classes, filter by Needs completing and choose Mark complete.", tags: ["booking"] },
  // Group classes & discovery
  { question: "How do I create a group class?", answer: "Go to Classes → Group Classes → Create Group Class. Set the title, subject, level, days, start time, session length, number of weeks, seats and price per student. Every session is generated for you and checked for clashes. Approved tutors can publish straight away; anything else is saved as a draft.", tags: ["group-class"] },
  { question: "Can I cancel a group class session?", answer: "Yes. Open the class and cancel a single session, or cancel the whole class. Enrolled students are notified and refunded for any sessions they won't get.", tags: ["group-class"] },
  { question: "What is a Discovery Session?", answer: "A free introductory call of up to 25 minutes where a student meets you before booking paid lessons. Each student can have one free Discovery Session per tutor. You'll find them under Classes → Discovery Sessions." },
  // Payments & earnings
  { question: "How much does Ensena charge?", answer: "Ensena keeps a 20% commission on each lesson or class. You earn the other 80% of the price you set.", tags: ["payment", "payout"] },
  { question: "How does escrow work?", answer: "A student's payment is held securely by Ensena until the lesson is complete. After it ends, the student has 24 hours to confirm it or report a problem. The money is released to you when they confirm, or automatically after 24 hours if nothing is reported.", tags: ["payment", "payout"] },
  { question: "Why hasn't my payment been released?", answer: "Payments are released 24 hours after a lesson is completed, or sooner if the student confirms. A payment stays on hold if the lesson was never marked complete or the student reported a problem; reported lessons are reviewed by our team. Check Escrow for the lesson's status, or submit a ticket with the booking reference.", tags: ["payment", "payout"] },
  { question: "How do I withdraw my earnings?", answer: "Go to Withdrawals and add the bank account you want to be paid into. Once earnings are released to your available balance, request a withdrawal there and follow its status on the same page.", tags: ["payout"] },
  // Messages & safety
  { question: "Who can I message?", answer: "You can message students who have booked a lesson, discovery session or group class with you, and anyone who messages you first. For everyone's safety, phone numbers, emails, social handles and payment details can't be shared in messages, and repeated attempts can lead to a messaging restriction.", tags: ["account"] },
  { question: "How do I appeal a messaging restriction or suspension?", answer: "Open the restriction notice and choose Contact Internal Support, or submit a ticket under Account & Profile. Your restriction stays in place until our team has reviewed it.", tags: ["account"] },
  // Account & security
  { question: "How do I change my name, phone number or password?", answer: "Update your name and phone number in Settings → Account. Change your password in Settings → Security. To change the email you sign in with, contact Ensena Support.", tags: ["account"] },
  { question: "How do I turn on two-step verification?", answer: "Go to Settings → Security and set up an authenticator app. After that, you'll enter a 6-digit code from the app each time you sign in.", tags: ["account", "technical"] },
  // Support
  { question: "How do I contact Ensena Support?", answer: "Use Submit a Ticket on this page and choose what you need help with, or Report an Issue if something isn't working. You can follow every request and our replies under Your Support Requests. For technical problems you can also email support@ensena.co.", tags: ["technical"] },
];

// Article content itself now lives in help-articles-data.ts (audience:
// "Tutor") so Admin can manage it — see TutorHelpCenterClient, which reads
// it through usePublishedHelpArticles("Tutor") instead of a hardcoded list.

// ---------------------------------------------------------------------------
// Tutor Profile Editor
// ---------------------------------------------------------------------------

export const subjectOptions = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology",
  "French", "Programming", "Economics", "Accounting", "Government", "Literature",
];

export const academicLevelOptions = [
  "K1 – K3", "Primary", "Secondary", "WAEC", "NECO", "JAMB",
  "Undergraduate", "Masters", "PhD", "Adult Learning",
];

export const languageOptions = ["English", "French", "Yoruba", "Igbo", "Hausa", "Arabic", "Spanish"];

export const ageGroupOptions = ["Children (5-12)", "Teenagers (13-18)", "Adults (18+)"];

export const nigerianStates = [
  "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Enugu", "Kaduna", "Delta", "Anambra", "Ogun",
];

export interface ExperienceEntry {
  id: string;
  type: "Certification" | "Degree" | "Award";
  title: string;
  institution: string;
  year: string;
}

export const defaultExperienceEntries: ExperienceEntry[] = [
  { id: "exp-1", type: "Degree", title: "B.Sc. Mathematics", institution: "University of Lagos", year: "2016" },
  { id: "exp-2", type: "Degree", title: "PGDE", institution: "University of Ibadan", year: "2018" },
  { id: "exp-3", type: "Certification", title: "Certified WAEC Examiner", institution: "WAEC", year: "2020" },
  { id: "exp-4", type: "Award", title: "Top Rated Tutor", institution: "Ensena", year: "2023" },
];

export interface HourlyRateSet {
  30: number;
  45: number;
  60: number;
  90: number;
  120: number;
}

export const defaultHourlyRates: HourlyRateSet = {
  30: 1500,
  45: 2100,
  60: 2800,
  90: 4000,
  120: 5200,
};

export function hourlyRateFor(minutes: number, fallback: number): number {
  const key = minutes as keyof HourlyRateSet;
  return key in defaultHourlyRates ? defaultHourlyRates[key] : fallback;
}

export const defaultGroupPricing = {
  pricePerStudent: 1500,
  maxClassSize: 10,
  minClassSize: 3,
};

export interface VerificationDoc {
  label: string;
  status: "Verified" | "Pending" | "Not Uploaded";
}

export const defaultVerificationDocs: VerificationDoc[] = [
  { label: "Identity Document", status: "Verified" },
  { label: "Teaching Certificate", status: "Verified" },
  { label: "Degree Certificate", status: "Verified" },
  { label: "Professional License", status: "Pending" },
  { label: "Address Verification", status: "Not Uploaded" },
];

export const defaultSocialLinks = {
  linkedin: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  x: "",
  website: "",
};

export const defaultPersonalInfo = {
  firstName: "Adaeze",
  lastName: "Okonkwo",
  displayName: "Adaeze Okonkwo",
  gender: "Female",
  dob: "1994-03-12",
  phone: "+234 801 234 5678",
  email: "adaeze.okonkwo@example.com",
  country: "Nigeria",
  state: "Lagos",
  city: "Lekki",
  address: "12 Admiralty Way, Lekki Phase 1",
};

export const professionalHeadlines = [
  "Senior Mathematics Tutor",
  "WAEC Expert",
  "JAMB Specialist",
  "French Teacher",
];

// ---------------------------------------------------------------------------
// Private Lessons — enhanced (countdown, reminders, notes)
// ---------------------------------------------------------------------------

export interface StudentLookup {
  name: string;
  studentId: string;
  subject: string;
  level: string;
  paymentStatus: "Paid" | "Pending";
}

export const privateLessonExtras: Record<string, StudentLookup> = {
  "pl-1": { name: "Sarah A.", studentId: "sarah-a", subject: "Mathematics", level: "WAEC / NECO", paymentStatus: "Paid" },
  "pl-2": { name: "David O.", studentId: "david-o", subject: "Physics", level: "JAMB / UTME", paymentStatus: "Paid" },
  "pl-3": { name: "Daniel N.", studentId: "daniel-n", subject: "Mathematics", level: "JAMB / UTME", paymentStatus: "Pending" },
  "pl-4": { name: "Grace A.", studentId: "grace-a", subject: "English", level: "WAEC / NECO", paymentStatus: "Pending" },
  "pl-9": { name: "Chioma E.", studentId: "chioma-e", subject: "English", level: "Secondary", paymentStatus: "Paid" },
};

// A fixed simulated "now" so the demo dataset (dated May 2024) can still show a
// live-ticking countdown; real elapsed time is added to this anchor at render time.
export const simulatedNowAnchor = new Date(2024, 4, 22, 9, 45, 0).getTime();
export const simulatedNowAnchorRealTime = Date.now();

// ---------------------------------------------------------------------------
// Student Performance Manager
// ---------------------------------------------------------------------------

export interface SubjectProgress {
  subject: string;
  percentage: number;
}

export function subjectProgressFor(studentId: string): SubjectProgress[] {
  const seedMap: Record<string, SubjectProgress[]> = {
    "sarah-a": [
      { subject: "Algebra", percentage: 85 },
      { subject: "Geometry", percentage: 67 },
      { subject: "Statistics", percentage: 93 },
      { subject: "Calculus", percentage: 70 },
    ],
    "james-o": [
      { subject: "Mechanics", percentage: 74 },
      { subject: "Electromagnetism", percentage: 52 },
      { subject: "Waves", percentage: 66 },
    ],
    "mary-u": [
      { subject: "Organic Chemistry", percentage: 91 },
      { subject: "Inorganic Chemistry", percentage: 88 },
      { subject: "Physical Chemistry", percentage: 94 },
    ],
    "david-o": [
      { subject: "Mechanics", percentage: 78 },
      { subject: "Algebra", percentage: 69 },
    ],
    "grace-a": [
      { subject: "Comprehension", percentage: 62 },
      { subject: "Essay Writing", percentage: 55 },
    ],
    "daniel-n": [
      { subject: "Arithmetic", percentage: 58 },
      { subject: "Algebra", percentage: 30 },
    ],
  };
  return seedMap[studentId] ?? [{ subject: "General", percentage: 60 }];
}

export interface LearningGoal {
  id: string;
  title: string;
  done: boolean;
}

export const defaultLearningGoals: Record<string, LearningGoal[]> = {
  "sarah-a": [
    { id: "g-1", title: "Master Fractions", done: true },
    { id: "g-2", title: "Complete WAEC Revision", done: false },
    { id: "g-3", title: "Improve Speaking Confidence", done: false },
  ],
  "james-o": [
    { id: "g-4", title: "Finish JAMB Practice", done: false },
    { id: "g-5", title: "Master Electromagnetism", done: false },
  ],
};

export const monthlyImprovementTrend = [58, 61, 64, 63, 68, 72, 74, 76, 78, 80, 81, 82];

export function performanceOverviewFor(student: { progressPct: number; attendancePct: number; avgScore: number }) {
  return {
    overallScore: Math.round((student.progressPct + student.attendancePct + student.avgScore) / 3),
    progressPct: student.progressPct,
    attendancePct: student.attendancePct,
    homeworkCompletion: Math.min(100, student.avgScore + 6),
    quizAverage: Math.max(0, student.avgScore - 4),
    assignmentAverage: Math.min(100, student.avgScore + 2),
    monthlyImprovement: 8,
    currentStreak: 5,
  };
}

// ---------------------------------------------------------------------------
// Virtual Classroom
// ---------------------------------------------------------------------------

export interface ClassroomParticipant {
  id: string;
  name: string;
  role: "tutor" | "student";
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  joinedAt: string;
}

export const defaultClassroomParticipants: ClassroomParticipant[] = [
  { id: "p-tutor", name: "Adaeze Okonkwo", role: "tutor", micOn: true, camOn: true, handRaised: false, joinedAt: "10:00 AM" },
  { id: "p-1", name: "Sarah A.", role: "student", micOn: false, camOn: true, handRaised: false, joinedAt: "10:01 AM" },
  { id: "p-2", name: "David O.", role: "student", micOn: false, camOn: false, handRaised: true, joinedAt: "10:02 AM" },
];

export interface ClassroomChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  private?: boolean;
}

export const defaultClassroomChat: ClassroomChatMessage[] = [
  { id: "cc-1", sender: "Sarah A.", text: "Good morning!", time: "10:01 AM" },
  { id: "cc-2", sender: "Adaeze Okonkwo", text: "Good morning everyone, let's get started.", time: "10:01 AM" },
];


