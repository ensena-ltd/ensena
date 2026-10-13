import { buildBookingReference } from "@/lib/booking-reference";
import { classifyClassStatus } from "@/lib/class-status";
import { getPlatformNowMs, parsePlatformDateTime } from "@/lib/platform-time";

export type BookingType = "Private Lesson" | "Group Class" | "Counselling" | "Discovery Session";
export type BookingStatus = "Pending" | "Upcoming" | "Live" | "Completed" | "Cancelled" | "Disputed";
export type DisputeReportedBy = "Student" | "Tutor";
export type PaymentEscrowStatus = "Awaiting Payment" | "Held in Escrow" | "Released" | "Refunded";
export type BookingMode = "Online" | "Physical" | "Hybrid";
export type PaymentCadence = "Single Session" | "Daily" | "Weekly" | "Monthly";

export interface PaymentPlan {
  cadence: PaymentCadence;
  sessionsPaid: number;
  daysPerWeek: number;
  amountPerSession: number;
}

export interface BookingTimelineStep {
  label: string;
  time: string;
  done: boolean;
}

export interface BookingRow {
  id: string;
  type: BookingType;
  // Public-facing "Lesson ID" shown everywhere instead of `id` — see
  // src/lib/booking-reference.ts. `id` is the internal key; never render it.
  bookingReference: string;
  student: string;
  studentImage: string;
  studentEmail: string;
  studentPhone: string;
  tutor: string;
  tutorImage: string;
  tutorEmail: string;
  tutorPhone: string;
  subject: string;
  academicLevel: string;
  topic: string;
  date: string;
  time: string;
  durationMins: number;
  mode: BookingMode;
  status: BookingStatus;
  paymentStatus: PaymentEscrowStatus;
  amountGross: number;
  createdAt: string;
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  paymentMethod?: string;
  releaseDate?: string;
  refundStatus?: string;
  homework?: string;
  attendancePct?: number;
  recordingAvailable?: boolean;
  aiSummary?: string;
  paymentPlan?: PaymentPlan;
  timeline: BookingTimelineStep[];

  // Private Lesson session-tracking (a booking here represents one lesson
  // within a recurring package — see paymentPlan for pricing/cadence).
  currentSessionNumber?: number;

  // Group Class capacity — shown as "x/y students" instead of a single
  // student name/photo.
  groupEnrolled?: number;
  groupMaxStudents?: number;

  // Structured dispute detail — only meaningful when status === "Disputed".
  // Kept on the booking row itself (rather than cross-linked to the
  // separate LessonConfirmation/escrow-release.ts dispute system used by
  // /admin/disputes) so this page never shows dispute detail sourced from a
  // different booking than the one being viewed.
  disputeReportedBy?: DisputeReportedBy;
  disputeReason?: string;
  disputeSubmittedDate?: string;
  disputeMessage?: string;

  // Booking Details page extras
  platform?: string;
  sessionLink?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  transactionId?: string;
  studentGoal?: string;
  lessonFocus?: string;
  materialsSharedBy?: string;
  updatedAt?: string;
  bookedBy?: "Student" | "Tutor" | "Admin";

  // Group Class scheduling/pricing (only meaningful when type === "Group Class")
  groupClassId?: string;
  classDay?: string;
  totalSessions?: number;
  pricePerSession?: number;
  enrollmentOpens?: string;
  enrollmentCloses?: string;
  groupRoster?: GroupRosterEntry[];

  // Identifies exactly which recurring-class meeting this row is for (see
  // LessonConfirmation.sessionId's own doc comment) — only set for a row
  // built from a real LessonConfirmation (lesson-confirmation-to-booking-row.ts).
  // completedAtMs/scheduledDurationMinutes are what let lesson-evidence.ts
  // isolate THIS session's real attendance window out of the whole
  // recurring class's classroom history (group classroomIds are per-class,
  // not per-session — see classroomIdForLesson's own doc comment).
  sessionId?: string;
  completedAtMs?: number;
  scheduledDurationMinutes?: number;

  // Admin-only notes, kept separate for the student vs. the tutor side of
  // this specific booking (never visible to either of them).
  studentNotes?: string[];
  tutorNotes?: string[];
}

export interface GroupRosterEntry {
  student: string;
  bookingId: string;
  bookingReference: string;
  amountPaid: number;
  status: "Paid" | "Pending";
  paidOn: string;
}

// The single Booking ID shown anywhere in the app for a given booking — the
// real booking's own `bookingReference` (PRV/GRP/DSC/CNS + random suffix,
// booking-reference.ts), never a second, differently-shaped id. This used
// to independently format "ENS-BK-00124" from the raw internal id, which
// meant a booking could show two different-looking "Booking ID"s depending
// on which screen you were on — this now always resolves back to the one
// real reference every other screen (search, CSV export, cross-linking)
// already uses. Falls back to deriving one only if `id` isn't a real
// booking (defensive — should not happen for a genuine BookingRow id).
export function formatBookingDisplayId(id: string): string {
  const booking = initialBookings.find((b) => b.id === id);
  return booking ? booking.bookingReference : buildBookingReference("private", id);
}

export function formatPaymentPlan(plan: PaymentPlan): string {
  if (plan.cadence === "Single Session") return "Single session";
  const days = `${plan.daysPerWeek}x/week`;
  return `${plan.cadence} · ${days} · ${plan.sessionsPaid} session${plan.sessionsPaid === 1 ? "" : "s"} paid`;
}

export function paymentPlanTotal(plan: PaymentPlan): number {
  return plan.amountPerSession * plan.sessionsPaid;
}

export const bookingTypeIconStyles: Record<BookingType, string> = {
  "Private Lesson": "bg-ensena-primary/10 text-ensena-primary",
  "Group Class": "bg-blue-100 text-blue-700",
  Counselling: "bg-purple-100 text-purple-700",
  "Discovery Session": "bg-amber-100 text-amber-700",
};

export const bookingStatusStyles: Record<BookingStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Live: "bg-emerald-100 text-emerald-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Disputed: "bg-rose-100 text-rose-700",
};

export const paymentEscrowStyles: Record<PaymentEscrowStatus, string> = {
  "Awaiting Payment": "bg-amber-100 text-amber-700",
  "Held in Escrow": "bg-amber-100 text-amber-700",
  Released: "bg-emerald-100 text-emerald-700",
  Refunded: "bg-rose-100 text-rose-700",
};

function standardTimeline(status: BookingStatus): BookingTimelineStep[] {
  const base: BookingTimelineStep[] = [
    { label: "Booked", time: "May 20, 9:15 AM", done: true },
    { label: "Payment Received", time: "May 20, 9:16 AM", done: true },
    { label: "Escrow Created", time: "May 20, 9:16 AM", done: true },
    { label: "Tutor Accepted", time: "May 20, 10:02 AM", done: true },
    { label: "Reminder Sent", time: "May 22, 3:45 PM", done: status !== "Pending" },
    { label: "Lesson Started", time: "May 22, 4:00 PM", done: status === "Live" || status === "Completed" },
    { label: "Lesson Completed", time: "May 22, 5:00 PM", done: status === "Completed" },
    { label: "Escrow Released", time: "Pending", done: status === "Completed" },
  ];
  if (status === "Cancelled") {
    return [
      { label: "Booked", time: "May 20, 9:15 AM", done: true },
      { label: "Payment Received", time: "May 20, 9:16 AM", done: true },
      { label: "Cancelled", time: "May 21, 6:40 PM", done: true },
      { label: "Refund Processed", time: "May 21, 7:10 PM", done: true },
    ];
  }
  if (status === "Disputed") {
    return [
      { label: "Booked", time: "May 18, 9:15 AM", done: true },
      { label: "Payment Received", time: "May 18, 9:16 AM", done: true },
      { label: "Lesson Completed", time: "May 18, 5:00 PM", done: true },
      { label: "Dispute Raised", time: "May 19, 8:00 AM", done: true },
      { label: "Escrow Frozen", time: "May 19, 8:01 AM", done: true },
      { label: "Admin Review", time: "Pending", done: false },
    ];
  }
  return base;
}

// Deterministic (keyed off the record's own id) rather than truly random —
// this data has no backend to persist a reference in, and this module can
// be re-evaluated on both server and client, so a Math.random() value
// wouldn't stay stable across renders. See buildBookingReference's doc
// comment in booking-reference.ts.
function referenceForBookingType(type: BookingType, id: string): string {
  if (type === "Private Lesson") return buildBookingReference("private", id);
  if (type === "Group Class") return buildBookingReference("group", id);
  if (type === "Discovery Session") return buildBookingReference("discovery", id);
  return buildBookingReference("counselling", id);
}

// Real students (cycled — this seed data only has 7), each with their own
// real, deterministic booking reference, for the "Students & Payments"
// table on a Group Class booking's details page.
const rosterStudents = ["Cynthia Ejie", "David Okonkwo", "Amaka N.", "Michael T.", "Fatima B.", "Chinedu M.", "Joy U.", "Daniel E."];
function buildGroupRoster(): GroupRosterEntry[] {
  return rosterStudents.map((name, i) => {
    const bookingId = `BK-102${96 + i}`;
    return {
      student: name,
      bookingId,
      bookingReference: buildBookingReference("group", `${bookingId}-roster-${i}`),
      amountPaid: 26000,
      status: i === 3 || i === 7 ? "Pending" : "Paid",
      paidOn: `Aug 24, 2026 · ${3 + Math.floor(i / 2)}:${(i % 2) * 10 + 20} PM`,
    };
  });
}

const rawBookings: Omit<BookingRow, "bookingReference">[] = [
  {
    id: "BK-10294", type: "Private Lesson", student: "Cynthia Ejie", studentImage: "/teacher-2.jpg.png", studentEmail: "cynthiaejie@gmail.com", studentPhone: "+234 801 234 5678",
    tutor: "Tunde Adebayo", tutorImage: "/teacher-2.jpg.png", tutorEmail: "tunde.a@example.com", tutorPhone: "+234 811 000 1122",
    subject: "Mathematics", academicLevel: "SSS2", topic: "Algebra & Trigonometry", date: "Aug 25, 2026", time: "7:00 PM", durationMins: 60, mode: "Online",
    status: "Upcoming", paymentStatus: "Released", amountGross: 5000, createdAt: "Aug 24, 2026 · 3:20 PM", updatedAt: "Aug 24, 2026 · 3:22 PM", bookedBy: "Student",
    meetingLink: "https://meet.google.com/abc-defg-hij", platform: "Google Meet", sessionLink: "meet.google.com/abc-defg-hij", paymentMethod: "Card",
    transactionId: buildBookingReference("payment", "BK-10294"),
    timeline: [
      { label: "Booking created", time: "Aug 24 · 3:20 PM", done: true },
      { label: "Payment received", time: "Aug 24 · 3:21 PM", done: true },
      { label: "Tutor notified", time: "Aug 24 · 3:21 PM", done: true },
      { label: "Class scheduled", time: "Aug 24 · 3:22 PM", done: true },
      { label: "Upcoming lesson", time: "Aug 25 · 7:00 PM", done: false },
    ],
    paymentPlan: { cadence: "Weekly", sessionsPaid: 12, daysPerWeek: 2, amountPerSession: 5000 },
    currentSessionNumber: 3, startDate: "Aug 11, 2026", endDate: "Oct 27, 2026",
    tags: ["Academic Support", "Regular Student", "Evening Class"],
    studentGoal: "Improve exam scores", lessonFocus: "Algebra, Trigonometry", materialsSharedBy: "Shared by tutor",
    studentNotes: [], tutorNotes: [],
  },
  {
    id: "BK-10293", type: "Group Class", student: "David Okonkwo", studentImage: "/teacher-1.jpg.png", studentEmail: "david.o@example.com", studentPhone: "+234 803 222 3344",
    tutor: "Michael Adewale", tutorImage: "/teacher-3.jpg.png", tutorEmail: "michael.a@example.com", tutorPhone: "+234 804 333 4455",
    subject: "WAEC Mathematics (Group Class)", academicLevel: "WAEC", topic: "Mock Test Review", date: "May 22, 2024", time: "2:00 PM", durationMins: 90, mode: "Online",
    status: "Live", paymentStatus: "Released", amountGross: 2000, createdAt: "May 15, 2024 · 8:00 AM", paymentMethod: "Wallet",
    timeline: standardTimeline("Live"), aiSummary: "Session in progress. Attendance and engagement being tracked live.",
    paymentPlan: { cadence: "Monthly", sessionsPaid: 24, daysPerWeek: 3, amountPerSession: 2000 },
    groupEnrolled: 8, groupMaxStudents: 10,
    // Real, resolvable admin-group-classes-data.ts class — lets "Open
    // Classroom" navigate to a real destination instead of a dead id.
    groupClassId: "gc-1",
  },
  {
    id: "BK-10292", type: "Counselling", student: "Grace Emmanuel", studentImage: "/teacher-2.jpg.png", studentEmail: "grace.e@example.com", studentPhone: "+234 805 444 5566",
    tutor: "Cynthia Ejie", tutorImage: "/teacher-4.jpg.png", tutorEmail: "cynthia.e@ensena.co", tutorPhone: "+234 806 555 6677",
    subject: "Academic Counselling", academicLevel: "SS 2", topic: "Confidence & Study Habits", date: "May 22, 2024", time: "10:00 AM", durationMins: 45, mode: "Online",
    status: "Upcoming", paymentStatus: "Released", amountGross: 3000, createdAt: "May 19, 2024 · 1:00 PM", paymentMethod: "Card · Flutterwave",
    timeline: standardTimeline("Upcoming"),
  },
  {
    id: "BK-10291", type: "Private Lesson", student: "Peter Obi", studentImage: "/teacher-3.jpg.png", studentEmail: "peter.o@example.com", studentPhone: "+234 807 666 7788",
    tutor: "Adaeze Okonkwo", tutorImage: "/teacher-2.jpg.png", tutorEmail: "adaeze.o@example.com", tutorPhone: "+234 802 111 2233",
    subject: "English Language", academicLevel: "SS 3", topic: "Essay Writing", date: "May 22, 2024", time: "9:30 AM", durationMins: 60, mode: "Online",
    status: "Completed", paymentStatus: "Released", amountGross: 4000, createdAt: "May 18, 2024 · 6:00 PM", paymentMethod: "Card · Paystack",
    homework: "Write a 500-word essay on 'My Future Career'.", attendancePct: 100, recordingAvailable: true,
    aiSummary: "Peter engaged well and completed all practice exercises. Recommend focusing on grammar next session.",
    timeline: standardTimeline("Completed"),
    paymentPlan: { cadence: "Monthly", sessionsPaid: 12, daysPerWeek: 3, amountPerSession: 4000 },
    currentSessionNumber: 12,
  },
  {
    id: "BK-10290", type: "Private Lesson", student: "Hannah Bassey", studentImage: "/teacher-4.jpg.png", studentEmail: "hannah.b@example.com", studentPhone: "+234 808 777 8899",
    tutor: "Michael Adewale", tutorImage: "/teacher-3.jpg.png", tutorEmail: "michael.a@example.com", tutorPhone: "+234 804 333 4455",
    subject: "Chemistry", academicLevel: "WAEC", topic: "Organic Chemistry", date: "May 21, 2024", time: "3:30 PM", durationMins: 60, mode: "Online",
    status: "Completed", paymentStatus: "Released", amountGross: 4500, createdAt: "May 17, 2024 · 11:00 AM", paymentMethod: "Wallet",
    homework: "Practice questions on hydrocarbons.", attendancePct: 96, recordingAvailable: true,
    aiSummary: "Strong grasp of core concepts. Attendance and participation both excellent this term.",
    timeline: standardTimeline("Completed"),
    paymentPlan: { cadence: "Weekly", sessionsPaid: 8, daysPerWeek: 2, amountPerSession: 4500 },
    currentSessionNumber: 8,
  },
  {
    id: "BK-10289", type: "Private Lesson", student: "Chidera Nwosu", studentImage: "/teacher-1.jpg.png", studentEmail: "chidera.n@example.com", studentPhone: "+234 810 999 0011",
    tutor: "Tunde Adebayo", tutorImage: "/teacher-3.jpg.png", tutorEmail: "tunde.a@example.com", tutorPhone: "+234 811 000 1122",
    subject: "Mathematics", academicLevel: "JAMB", topic: "Trigonometry", date: "May 20, 2024", time: "5:00 PM", durationMins: 45, mode: "Online",
    status: "Cancelled", paymentStatus: "Refunded", amountGross: 2250, createdAt: "May 16, 2024 · 9:00 AM", refundStatus: "Fully refunded (tutor unavailable)",
    timeline: standardTimeline("Cancelled"),
    paymentPlan: { cadence: "Single Session", sessionsPaid: 1, daysPerWeek: 1, amountPerSession: 2250 },
  },
  {
    id: "BK-10288", type: "Private Lesson", student: "Cynthia Ejie", studentImage: "/teacher-2.jpg.png", studentEmail: "cynthiaejie@gmail.com", studentPhone: "+234 812 111 2233",
    tutor: "Zainab Yusuf", tutorImage: "/teacher-4.jpg.png", tutorEmail: "zainab.y@example.com", tutorPhone: "+234 813 222 3344",
    subject: "Biology", academicLevel: "WAEC", topic: "Genetics", date: "May 18, 2024", time: "4:00 PM", durationMins: 60, mode: "Online",
    status: "Disputed", paymentStatus: "Held in Escrow", amountGross: 4500, createdAt: "May 14, 2024 · 2:00 PM",
    refundStatus: "Under review (student reports tutor absence)", timeline: standardTimeline("Disputed"),
    paymentPlan: { cadence: "Weekly", sessionsPaid: 4, daysPerWeek: 1, amountPerSession: 4500 },
    currentSessionNumber: 2,
    disputeReportedBy: "Student", disputeReason: "Lesson did not take place", disputeSubmittedDate: "May 19, 2024",
    disputeMessage: "The tutor did not attend the scheduled lesson.",
  },
  {
    id: "BK-10287", type: "Group Class", student: "9 students", studentImage: "/teacher-3.jpg.png", studentEmail: "", studentPhone: "",
    tutor: "Adaeze Okonkwo", tutorImage: "/teacher-2.jpg.png", tutorEmail: "adaeze.o@example.com", tutorPhone: "+234 802 111 2233",
    subject: "Chemistry WAEC Class", academicLevel: "WAEC", topic: "Titration Practice", date: "May 28, 2024", time: "6:00 PM", durationMins: 90, mode: "Online",
    status: "Pending", paymentStatus: "Awaiting Payment", amountGross: 12000, createdAt: "May 20, 2024 · 10:00 AM",
    timeline: standardTimeline("Pending"),
    paymentPlan: { cadence: "Weekly", sessionsPaid: 8, daysPerWeek: 2, amountPerSession: 1333 },
    groupEnrolled: 9, groupMaxStudents: 12,
    groupClassId: "gc-4",
  },
  {
    id: "BK-10286", type: "Discovery Session", student: "Sarah Johnson", studentImage: "/teacher-4.jpg.png", studentEmail: "sarah.j@example.com", studentPhone: "+234 810 123 4567",
    tutor: "Ibrahim Suleiman", tutorImage: "/teacher-4.jpg.png", tutorEmail: "ibrahim.s@example.com", tutorPhone: "+234 814 333 4455",
    subject: "Biology", academicLevel: "SS 2", topic: "Meet your tutor", date: "May 26, 2024", time: "2:00 PM", durationMins: 25, mode: "Online",
    status: "Upcoming", paymentStatus: "Released", amountGross: 0, createdAt: "May 21, 2024 · 4:00 PM",
    timeline: standardTimeline("Upcoming"),
  },
  {
    id: "BK-10285", type: "Discovery Session", student: "David Okonkwo", studentImage: "/teacher-1.jpg.png", studentEmail: "david.o@example.com", studentPhone: "+234 803 222 3344",
    tutor: "Faruk Musa", tutorImage: "/teacher-1.jpg.png", tutorEmail: "faruk.m@example.com", tutorPhone: "+234 815 444 5566",
    subject: "Mathematics", academicLevel: "JAMB", topic: "Meet your tutor", date: "May 17, 2024", time: "1:00 PM", durationMins: 25, mode: "Online",
    status: "Completed", paymentStatus: "Released", amountGross: 0, createdAt: "May 15, 2024 · 10:00 AM",
    timeline: standardTimeline("Completed"),
  },
  {
    id: "BK-10296", type: "Group Class", student: "Cynthia Ejie", studentImage: "/teacher-2.jpg.png", studentEmail: "cynthiaejie@gmail.com", studentPhone: "+234 801 234 5678",
    tutor: "Tunde Adebayo", tutorImage: "/teacher-2.jpg.png", tutorEmail: "tunde.a@example.com", tutorPhone: "+234 811 000 1122",
    subject: "Mathematics", academicLevel: "SSS2", topic: "WAEC Mathematics Prep", date: "Aug 26, 2026", time: "10:00 AM", durationMins: 60, mode: "Online",
    status: "Upcoming", paymentStatus: "Released", amountGross: 26000, createdAt: "Aug 24, 2026 · 3:21 PM", updatedAt: "Aug 24, 2026 · 3:22 PM", bookedBy: "Student",
    platform: "Google Meet", paymentMethod: "Card",
    timeline: [
      { label: "Group class created", time: "Aug 24 · 10:20 AM", done: true },
      { label: "Class approved", time: "Aug 24 · 11:15 AM", done: true },
      { label: "Student enrolled", time: "Aug 24 · 2:30 PM", done: true },
      { label: "Payment received", time: "Aug 24 · 2:31 PM", done: true },
      { label: "Tutor notified", time: "Aug 24 · 2:31 PM", done: true },
      { label: "First class", time: "Sep 5 · 10:00 AM", done: false },
    ],
    startDate: "Sep 5, 2026", endDate: "Nov 28, 2026", classDay: "Saturday", totalSessions: 13, pricePerSession: 2000,
    groupEnrolled: 8, groupMaxStudents: 10, enrollmentOpens: "Aug 25, 2026", enrollmentCloses: "Sep 5, 2026",
    groupRoster: buildGroupRoster(),
  },
];

export const initialBookings: BookingRow[] = rawBookings.map((b) => ({ ...b, bookingReference: referenceForBookingType(b.type, b.id) }));

// Pending/Cancelled/Disputed are real recorded EVENTS (an admin/tutor/student
// action), not time-derived — they're returned as-is. Upcoming/Live/Completed
// are re-derived from the booking's real date/time/duration against real
// Africa/Lagos "now" every time this is called, exactly like class-status.ts
// does for private lessons — the seed `status` field only ever reflected what
// was true the moment it was written, so a booking dated "Aug 25, 2026" does
// not stay "Upcoming" forever just because that string is still on the row.
export function getBookingDisplayStatus(row: BookingRow, nowMs: number = getPlatformNowMs()): BookingStatus {
  if (row.status === "Pending" || row.status === "Cancelled" || row.status === "Disputed") return row.status;
  const startMs = parsePlatformDateTime(row.date, row.time, nowMs);
  const endMs = startMs + row.durationMins * 60_000;
  const status = classifyClassStatus({ isCancelled: false, startMs, endMs, nowMs });
  return status === "Upcoming" || status === "Live" ? status : "Completed";
}

export const bookingStats = {
  totalBookings: initialBookings.length,
  todaysLessons: initialBookings.filter((b) => b.date === "May 22, 2024").length,
  privateLessons: initialBookings.filter((b) => b.type === "Private Lesson").length,
  groupClasses: initialBookings.filter((b) => b.type === "Group Class").length,
  counsellingSessions: initialBookings.filter((b) => b.type === "Counselling").length,
  discoverySessions: initialBookings.filter((b) => b.type === "Discovery Session").length,
  completed: initialBookings.filter((b) => b.status === "Completed").length,
  cancelled: initialBookings.filter((b) => b.status === "Cancelled").length,
  activeLive: initialBookings.filter((b) => b.status === "Live").length,
  pendingApproval: initialBookings.filter((b) => b.status === "Pending").length,
  disputed: initialBookings.filter((b) => b.status === "Disputed").length,
  revenueToday: initialBookings.filter((b) => b.date === "May 22, 2024").reduce((s, b) => s + b.amountGross, 0),
};

export interface BookingHealthAlert {
  id: string;
  tone: "warning" | "success";
  text: string;
}

export const bookingHealthAlerts: BookingHealthAlert[] = [
  { id: "bh-1", tone: "warning", text: "1 lesson starting within 15 minutes" },
  { id: "bh-2", tone: "warning", text: "1 booking waiting for escrow release" },
  { id: "bh-3", tone: "warning", text: "1 dispute needs admin review" },
  { id: "bh-4", tone: "warning", text: "1 group class pending approval" },
  { id: "bh-5", tone: "success", text: "96% booking completion this week" },
];

export interface BookingAiInsight {
  id: string;
  text: string;
  recommendation: string;
}

export const bookingAiInsights: BookingAiInsight[] = [
  { id: "bi-1", text: "Tunde Fashola has cancelled 2 Mathematics lessons this month.", recommendation: "Recommend checking in or offering a different tutor." },
  { id: "bi-2", text: "Grace Adamu's Biology dispute is the second this month for this tutor.", recommendation: "Recommend a quality review for Zainab Yusuf." },
  { id: "bi-3", text: "Chemistry WAEC Class has been pending approval for 2 days.", recommendation: "Recommend reviewing the group class submission." },
];
