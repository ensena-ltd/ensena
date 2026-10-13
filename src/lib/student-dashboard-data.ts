import type { FaqItem } from "@/lib/tutor-dashboard-data";
import type { SupportTypeId } from "@/lib/academic-support-types";
import { getOfferById, type Offer } from "@/lib/offers-data";
import { parseDurationLabelMinutes, parseLegacyDateTime } from "@/lib/class-entry-access";
import { formatClassDate } from "@/lib/class-date-format";
import type { MessageAttachment } from "@/lib/message-attachment-types";

export interface DashboardStudent {
  name: string;
  image: string;
  level: string;
  tier: string;
  dob: string;
  email: string;
  phone: string;
}

export const DEFAULT_STUDENT_IMAGE = "/teacher-4.jpg.png";

export const dashboardStudent: DashboardStudent = {
  name: "Cynthia Ejie",
  image: "/teacher-4.jpg.png",
  level: "SSS2",
  tier: "Premium Student",
  dob: "2009-07-26",
  email: "cynthia.ejie@example.com",
  phone: "+234 803 555 1234",
};

export interface StudentSidebarNavItem {
  label: string;
  href: string;
  badge?: number;
  /**
   * Extra path prefixes (besides `href`) that should also light this item up
   * as active — e.g. Find a Tutor stays active while a student is on the
   * public tutor-profile/booking pages it hands off to.
   */
  activeMatch?: string[];
}

// The student's permanent primary navigation — exactly five destinations:
// Dashboard, Find a Tutor, Group Classes, My Classes, Messages. Desktop
// renders these as a fixed left sidebar; mobile renders the same five as a
// fixed bottom tab bar — never a horizontal top nav, never the sidebar
// squeezed onto mobile. Profile/Payments are deliberately NOT primary nav
// items — see studentAccountNavItems (desktop sidebar's secondary "Account"
// section) and studentProfileMenuItems (mobile avatar menu) below.
//
// "Find a Tutor" opens a dashboard-embedded results page
// (/student-dashboard/find-a-tutor) that reuses the same tutor dataset and
// filter/sort logic as the public /find-teachers page, then hands off to
// the existing profile/booking/discovery-session routes under
// /find-teachers/[slug] for the rest of the flow — no duplicate profile or
// booking UI. "Group Classes" works the same way: a dashboard-embedded
// discovery page (/student-dashboard/group-classes) that reuses the same
// groupClassListings dataset as the public /group-classes page, adds a
// "Recommended for You" section matched on the student's saved grade level,
// then hands off to the existing /group-classes/[slug] booking page (with
// its cohort picker and weekly/monthly plans) unchanged. "My Classes" is
// the renamed My Lessons hub (private lessons + group classes + Discovery
// Sessions + Study Planner merged in via tabs) — there is no separate My
// Bookings destination. Every other page from the pre-MVP build (My
// Tutors, Learning Paths, Homework, Progress, Saved Tutors, Wallet,
// Notifications, Help Center) still exists on disk and still works if you
// navigate to it directly — it's just not linked from here. See
// src/lib/feature-flags.ts for the full list of what's deferred.
export const studentPrimaryNavItems: StudentSidebarNavItem[] = [
  { label: "Dashboard", href: "/student-dashboard" },
  { label: "Find a Tutor", href: "/student-dashboard/find-a-tutor", activeMatch: ["/find-teachers"] },
  { label: "Group Classes", href: "/student-dashboard/group-classes", activeMatch: ["/group-classes"] },
  { label: "My Classes", href: "/student-dashboard/lessons" },
  { label: "Messages", href: "/student-dashboard/messages", badge: 4 },
];

// Counselling is a conditional sixth destination — inserted right before
// Messages, matching the approved nav order — that only exists once a
// student has a real counselling record (see hasCounsellingRecords in
// admin-counselling-data.ts). Not part of the base array above so a
// student who has never booked counselling still sees exactly the
// original five items, unchanged.
export function buildStudentNavItems(showCounselling: boolean, needsAttention: boolean): StudentSidebarNavItem[] {
  if (!showCounselling) return studentPrimaryNavItems;
  const messages = studentPrimaryNavItems[studentPrimaryNavItems.length - 1];
  const rest = studentPrimaryNavItems.slice(0, -1);
  const counselling: StudentSidebarNavItem = {
    label: "Counselling",
    href: "/student-dashboard/counselling",
    badge: needsAttention ? 1 : undefined,
  };
  return [...rest, counselling, messages];
}

// Mobile bottom tab bar's own five destinations — deliberately different
// from studentPrimaryNavItems (the desktop sidebar's five): Explore,
// Bookings, Messages, Wishlist, Profile. Kept as a separate array rather
// than reusing/mutating studentPrimaryNavItems so the desktop sidebar is
// untouched by this mobile-specific nav design. "Find a Tutor" and "Group
// Classes" aren't separate tabs here — both are reachable from Explore
// (the dashboard home's own discovery sections), matching activeMatch below
// so navigating to them still highlights Explore as the active tab.
export const studentMobileNavItems: StudentSidebarNavItem[] = [
  { label: "Explore", href: "/student-dashboard", activeMatch: ["/student-dashboard/find-a-tutor", "/student-dashboard/group-classes", "/find-teachers", "/group-classes"] },
  { label: "Bookings", href: "/student-dashboard/lessons" },
  { label: "Messages", href: "/student-dashboard/messages", badge: 4 },
  { label: "Wishlist", href: "/student-dashboard/saved-tutors" },
  { label: "Profile", href: "/student-dashboard/profile" },
];

// The mobile top bar's avatar menu (and the dashboard home's own desktop
// profile dropdown, which shares this same list) — Counselling is inserted
// conditionally, same rule as buildStudentNavItems above, since it stays
// out of the primary bottom nav per product decision but must remain
// reachable. Contact Support is always present.
export function buildStudentAccountMenuItems(showCounselling: boolean): StudentProfileMenuItem[] {
  const items = [...studentProfileMenuItems];
  if (showCounselling) {
    items.splice(1, 0, { label: "Counselling", href: "/student-dashboard/counselling" });
  }
  items.push({ label: "Contact Support", href: "/student-dashboard/help" });
  return items;
}

export interface StudentAccountNavItem {
  label: string;
  href: string;
}

// The desktop sidebar's secondary "Account" section, below a divider from
// the five primary items — deliberately just two links (not the full
// profile-menu list below) so Profile/Settings don't visually compete with
// the primary nav. Both pages already surface the fuller set of account
// actions (Payment Methods/History, Security, etc. — see
// student-profile-client.tsx and student-settings-client.tsx). Logout is
// rendered separately as a styled button, matching the inert Logout
// pattern used in the admin dashboard (no real auth/session to tear down).
export const studentAccountNavItems: StudentAccountNavItem[] = [
  { label: "Profile", href: "/student-dashboard/profile" },
  { label: "Settings", href: "/student-dashboard/settings" },
];

export interface StudentProfileMenuItem {
  label: string;
  href: string;
}

// Behind the mobile avatar button only (desktop uses the sidebar's Account
// section above instead). Reuses the existing Profile, Settings (tabbed),
// Transactions and Notifications pages rather than building new ones.
export const studentProfileMenuItems: StudentProfileMenuItem[] = [
  { label: "My Profile", href: "/student-dashboard/profile" },
  { label: "Payment Methods", href: "/student-dashboard/settings?tab=Payment Methods" },
  { label: "Payment History", href: "/student-dashboard/transactions" },
  { label: "Account Settings", href: "/student-dashboard/settings?tab=Account" },
  { label: "Notifications", href: "/student-dashboard/notifications" },
  { label: "Security", href: "/student-dashboard/settings?tab=Security" },
];

export const studentQuickStats = [
  { label: "Lessons Completed", value: "52", trend: "↑ 12% this month" },
  { label: "Active Tutors", value: "3", trend: "View all tutors" },
  { label: "Group Classes", value: "2", trend: "View all classes" },
  { label: "Learning Streak", value: "28 Days", trend: "Keep it up" },
  { label: "Average Score", value: "91%", trend: "Excellent!" },
  { label: "Wallet Balance", value: "₦15,000", trend: "Top up wallet" },
];

export interface StudentScheduleItem {
  time: string;
  title: string;
  person: string;
  status: "Upcoming" | "Starts in 30 mins" | "Reminder";
  type: "Private" | "Group" | "Reminder";
}

export const studentTodaySchedule: StudentScheduleItem[] = [
  { time: "10:00 AM", title: "Mathematics", person: "Adaeze Okonkwo", status: "Upcoming", type: "Private" },
  { time: "2:00 PM", title: "French Group Class", person: "David Martin", status: "Starts in 30 mins", type: "Group" },
  { time: "6:00 PM", title: "Homework Review", person: "", status: "Reminder", type: "Reminder" },
];

export interface StudentUpcomingLesson {
  id: string;
  subject: string;
  tutor: string;
  tutorImage: string;
  date: string;
  time: string;
  mode: "Online" | "Physical";
}

export const studentUpcomingLessons: StudentUpcomingLesson[] = [
  { id: "ul-1", subject: "Physics", tutor: "James O.", tutorImage: "/teacher-1.jpg.png", date: "Today, May 22", time: "6:00 PM – 7:00 PM", mode: "Online" },
  { id: "ul-2", subject: "Chemistry", tutor: "Mary U.", tutorImage: "/teacher-2.jpg.png", date: "Tomorrow, May 23", time: "4:00 PM – 5:00 PM", mode: "Online" },
];

export const studentOverallProgress = {
  overall: 72,
  subjects: [
    { subject: "Mathematics", pct: 82, color: "#6C63FF" },
    { subject: "Physics", pct: 65, color: "#E58A2A" },
    { subject: "English", pct: 90, color: "#1FA971" },
    { subject: "French", pct: 45, color: "#E0507A" },
    { subject: "Chemistry", pct: 70, color: "#9B6BD6" },
  ],
};

export interface StudentHomeworkItem {
  title: string;
  subject: string;
  tutor: string;
  due: string;
  status: "Pending" | "Submitted";
}

export const studentRecentHomework: StudentHomeworkItem[] = [
  { title: "Algebra Practice", subject: "Mathematics", tutor: "Adaeze Okonkwo", due: "Due Tomorrow", status: "Pending" },
  { title: "Essay Writing", subject: "English", tutor: "Sarah K.", due: "May 24, 2024", status: "Submitted" },
  { title: "Physics Quiz", subject: "Physics", tutor: "James O.", due: "May 25, 2024", status: "Pending" },
];

export interface ContinueLearningItem {
  title: string;
  subtitle: string;
  progressPct: number;
  color: string;
}

export const continueLearningItems: ContinueLearningItem[] = [
  { title: "WAEC Mathematics Revision", subtitle: "Module 3: Equations & Inequalities", progressPct: 60, color: "#6C63FF" },
  { title: "French for Beginners", subtitle: "Lesson 5: Basic Conversations", progressPct: 40, color: "#E58A2A" },
];

export interface StudentMessagePreview {
  name: string;
  image?: string;
  preview: string;
  time: string;
  unread: number;
  isGroup?: boolean;
}

export const studentRecentMessages: StudentMessagePreview[] = [
  { name: "Adaeze Okonkwo", image: "/teacher-2.jpg.png", preview: "Don't forget to review the homework…", time: "10:30 AM", unread: 2 },
  { name: "David Martin", image: "/teacher-3.jpg.png", preview: "See you in class at 2pm today!", time: "9:15 AM", unread: 1 },
  { name: "French Beginners Group", preview: "Assignment posted for next class.", time: "Yesterday", unread: 0, isGroup: true },
];

export interface RecommendedTutor {
  name: string;
  image: string;
  subject: string;
  rating: number;
  reviews: number;
  price: number;
}

export const recommendedTutors: RecommendedTutor[] = [
  { name: "Chinonso A.", image: "/teacher-2.jpg.png", subject: "Mathematics", rating: 4.98, reviews: 256, price: 3000 },
  { name: "Sarah K.", image: "/teacher-4.jpg.png", subject: "English", rating: 4.97, reviews: 189, price: 2500 },
  { name: "David M.", image: "/teacher-1.jpg.png", subject: "French", rating: 4.96, reviews: 134, price: 3000 },
];

// ---------------------------------------------------------------------------
// My Lessons
// ---------------------------------------------------------------------------

export type StudentLessonStatus = "Upcoming" | "Completed" | "Cancelled" | "Rescheduled";

export interface StudentLesson {
  id: string;
  subject: string;
  tutor: string;
  tutorImage: string;
  date: string;
  time: string;
  duration: string;
  type: "Private" | "Group";
  mode: "Online" | "Physical";
  status: StudentLessonStatus;
  meetingLink?: string;
  homework?: string;
  notes?: string;
  attendance?: "Present" | "Absent" | "Not Marked";
  payment: string;
  feedback?: string;
  materials?: string[];
  // Present only for a lesson that's one session within a multi-session
  // Private booking (see private-booking-schedule.ts) — absent for a
  // standalone one-time lesson or a legacy seed row.
  bookingId?: string;
  sessionNumber?: number;
  totalSessions?: number;
  weekNumber?: number;
  // The payment/frequency plan the booking was made under — see the
  // matching field/comment on tutor-dashboard-data.ts's PrivateLesson.
  // Absent (never guessed) on a lesson created before this field existed.
  frequency?: "oneTime" | "weekly" | "monthly";
}

// Real start/end epoch-ms for a Private lesson's entry window — every
// StudentLesson (and every real runtime-booked private lesson, which uses
// the exact same `date`/`time`/`duration` display-string shape) has a real,
// parseable calendar date even though there's no dedicated ISO field, so
// parseLegacyDateTime's fallback path is all that's ever needed here — there
// is nothing to backfill. Mirrors getDiscoverySessionTimeRange's role in
// discovery-sessions-data.ts and getGroupSessionTimeRange below.
export function getPrivateLessonTimeRange(lesson: { date: string; time: string; duration: string }): { startMs: number; endMs: number } {
  const startMs = parseLegacyDateTime(lesson.date, lesson.time);
  return { startMs, endMs: startMs + parseDurationLabelMinutes(lesson.duration) * 60_000 };
}

export const studentLessonStatusStyles: Record<StudentLessonStatus, string> = {
  Upcoming: "bg-indigo-100 text-indigo-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Rescheduled: "bg-amber-100 text-amber-700",
};

export const studentLessons: StudentLesson[] = [
  {
    id: "sl-1",
    subject: "Mathematics",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    date: "May 22, 2024",
    time: "10:00 AM",
    duration: "60 mins",
    type: "Private",
    mode: "Online",
    status: "Upcoming",
    meetingLink: "meet.ensena.co/adaeze-cynthia",
    homework: "Algebra Practice due tomorrow",
    payment: "₦3,000 · Paid",
    materials: ["WAEC Mathematics — Algebra.pdf", "Practice Questions.pdf"],
  },
  {
    id: "sl-2",
    subject: "French Group Class",
    tutor: "David Martin",
    tutorImage: "/teacher-3.jpg.png",
    date: "May 22, 2024",
    time: "2:00 PM",
    duration: "60 mins",
    type: "Group",
    mode: "Online",
    status: "Upcoming",
    meetingLink: "meet.ensena.co/french-beginners",
    payment: "₦1,500 · Paid",
  },
  {
    id: "sl-3",
    subject: "Physics",
    tutor: "James O.",
    tutorImage: "/teacher-1.jpg.png",
    date: "May 20, 2024",
    time: "8:00 AM",
    duration: "90 mins",
    type: "Private",
    mode: "Online",
    status: "Completed",
    homework: "Electromagnetism Problem Set",
    notes: "Covered mechanics, need more practice with vectors.",
    attendance: "Present",
    payment: "₦5,250 · Paid",
    feedback: "Great engagement this session, keep practicing the vector diagrams.",
  },
  {
    id: "sl-4",
    subject: "Chemistry",
    tutor: "Mary U.",
    tutorImage: "/teacher-2.jpg.png",
    date: "May 18, 2024",
    time: "4:00 PM",
    duration: "60 mins",
    type: "Private",
    mode: "Online",
    status: "Completed",
    notes: "Reviewed organic naming conventions.",
    attendance: "Present",
    payment: "₦4,500 · Paid",
    feedback: "Well prepared, ready for the next topic.",
  },
  {
    id: "sl-5",
    subject: "English",
    tutor: "Sarah K.",
    tutorImage: "/teacher-4.jpg.png",
    date: "May 14, 2024",
    time: "5:00 PM",
    duration: "45 mins",
    type: "Private",
    mode: "Online",
    status: "Cancelled",
    attendance: "Absent",
    payment: "₦2,250 · Refunded",
  },
  {
    id: "sl-6",
    subject: "Mathematics",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    date: "May 27, 2024",
    time: "11:00 AM",
    duration: "60 mins",
    type: "Private",
    mode: "Online",
    status: "Rescheduled",
    payment: "₦3,000 · Paid",
  },
  {
    id: "sl-7",
    subject: "Mathematics",
    tutor: "Tunde Adebayo",
    tutorImage: "/teacher-1.jpg.png",
    date: "Aug 28, 2026",
    time: "4:00 PM",
    duration: "60 mins",
    type: "Private",
    mode: "Online",
    status: "Upcoming",
    meetingLink: "meet.ensena.co/tunde-cynthia",
    payment: "₦5,000 · Paid",
    materials: ["WAEC Mathematics — Algebra.pdf"],
  },
];

// ---------------------------------------------------------------------------
// Study Planner (My Classes' dedicated Study Planner page, and the
// condensed Today/This-Week widget on the main My Classes page — both read
// from this one list so a task ticked in one place stays ticked in the
// other).
// ---------------------------------------------------------------------------
// Deliberately separate from study-planner-data.ts's full Today/Week/Month
// calendar planner (still used by the guardian dashboard) — this is just a
// flat "see tasks, add a task, check it off" list tied to a subject and a
// day offset from today, per the explicit MVP scope: no AI planning,
// progress charts, streaks, or complex calendar.

export interface StudyTask {
  id: string;
  label: string;
  subject: string;
  /** Days from today: 0 = today, 1 = tomorrow, etc. */
  dayOffset: number;
  done: boolean;
}

export const studentStudyTasks: StudyTask[] = [
  { id: "st-1", label: "Review Algebra notes", subject: "Mathematics", dayOffset: 0, done: true },
  { id: "st-2", label: "Complete 10 Mathematics practice questions", subject: "Mathematics", dayOffset: 0, done: false },
  { id: "st-3", label: "Review today's lesson notes", subject: "Mathematics", dayOffset: 0, done: false },
  { id: "st-4", label: "Review quadratic equations", subject: "Mathematics", dayOffset: 1, done: false },
  { id: "st-5", label: "Complete WAEC practice questions", subject: "Mathematics", dayOffset: 2, done: false },
  { id: "st-6", label: "Prepare for Mathematics lesson", subject: "Mathematics", dayOffset: 4, done: false },
  { id: "st-7", label: "Study trigonometry formulas", subject: "Mathematics", dayOffset: 6, done: false },
];

// ---------------------------------------------------------------------------
// My Tutors
// ---------------------------------------------------------------------------

export interface StudentTutor {
  id: string;
  name: string;
  image: string;
  subjects: string[];
  rating: number;
  reviews: number;
  lessonsCompleted: number;
  nextLesson?: string;
  bio: string;
  education: string;
  languages: string[];
}

export const myTutors: StudentTutor[] = [
  {
    id: "adaeze-okonkwo",
    name: "Adaeze Okonkwo",
    image: "/teacher-2.jpg.png",
    subjects: ["Mathematics", "French"],
    rating: 4.98,
    reviews: 215,
    lessonsCompleted: 22,
    nextLesson: "Today, 10:00 AM",
    bio: "I help students build strong foundations in Mathematics and French through interactive, student-centered lessons.",
    education: "B.Sc. Mathematics, University of Lagos",
    languages: ["English", "French"],
  },
  {
    id: "james-o",
    name: "James O.",
    image: "/teacher-1.jpg.png",
    subjects: ["Physics"],
    rating: 4.9,
    reviews: 98,
    lessonsCompleted: 15,
    nextLesson: "Today, 6:00 PM",
    bio: "Physics tutor focused on building strong exam technique and conceptual understanding for JAMB and WAEC.",
    education: "B.Sc. Physics, University of Ibadan",
    languages: ["English"],
  },
  {
    id: "mary-u",
    name: "Mary U.",
    image: "/teacher-2.jpg.png",
    subjects: ["Chemistry"],
    rating: 4.95,
    reviews: 134,
    lessonsCompleted: 15,
    nextLesson: "Tomorrow, 4:00 PM",
    bio: "Chemistry specialist with a passion for making organic chemistry easy to understand.",
    education: "B.Sc. Chemistry, University of Nigeria, Nsukka",
    languages: ["English"],
  },
];

// ---------------------------------------------------------------------------
// Group Classes (student view)
// ---------------------------------------------------------------------------

export interface StudentGroupClassSession {
  date: string;
  status: "Completed" | "Live" | "Upcoming";
  // Present for a real, runtime-computed cohort schedule (see
  // group-class-schedule.ts) — absent on the two hand-authored seed classes,
  // which render as an ungrouped flat list exactly as before.
  sessionNumber?: number;
  weekNumber?: number;
}

export interface StudentGroupClass {
  id: string;
  title: string;
  tutor: string;
  tutorImage: string;
  tutorRating: number;
  color: string;
  schedule: string;
  seatsFilled: number;
  seatsTotal: number;
  nextClass: string;
  attendancePct: number;
  subject: string;
  academicLevel: string;
  /** Not every class is exam-prep (e.g. a conversation class) — omit rather than force a fake value. */
  exam?: string;
  mode: "Online" | "In-person";
  durationMins: number;
  nextSessionDate: string;
  nextSessionStartsToday: boolean;
  cohortStart: string;
  cohortEnd: string;
  pricePerSession: number;
  description: string;
  tags: string[];
  sessions: StudentGroupClassSession[];
  // Absent on every hand-authored seed class (all seed classes are simply
  // "Active") — only set by the real-enrollment adapter, where a cancelled
  // enrollment must still render (never disappear) but as a cancelled
  // booking rather than an active one.
  status?: "Active" | "Cancelled";
}

// Real start/end epoch-ms for a group class's NEXT recurring session — the
// real generalization of a `parseGroupClassWindow` that used to live as a
// private, unexported copy inside student-dashboard-client.tsx. `schedule`
// ("Tue, Thu, Sat · 8:00 AM – 9:30 AM") carries the real time-of-day range;
// `nextSessionDate` ("Saturday, Aug 22") carries the real next calendar
// date. Returns null when either piece is missing/unparseable — callers
// treat that the same as "unknown," never as "always enterable."
export function getGroupSessionTimeRange(gc: StudentGroupClass): { startMs: number; endMs: number } | null {
  const timePart = gc.schedule.split("· ")[1];
  const datePart = gc.nextSessionDate.split(", ")[1];
  if (!timePart || !datePart) return null;
  const [startStr, endStr] = timePart.split("–").map((s) => s.trim());
  if (!startStr || !endStr) return null;
  const year = new Date().getFullYear();
  const startMs = new Date(`${datePart}, ${year} ${startStr}`).getTime();
  const endMs = new Date(`${datePart}, ${year} ${endStr}`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { startMs, endMs };
}

// Never a bare weekday with no calendar date ("Monday, 6:00 PM") — always
// the real next occurrence's actual date, computed from the class's own
// real per-session list (which already carries real dates + status) rather
// than a separately hand-typed "nextClass"/"nextSessionDate" string that
// can drift out of sync with the sessions it's supposed to summarize.
function withDerivedNextSession(cls: StudentGroupClass): StudentGroupClass {
  const timeLabel = cls.schedule.split("· ")[1]?.split("–")[0]?.trim() ?? "";
  const session = cls.sessions.find((s) => s.status !== "Completed") ?? cls.sessions.at(-1);
  if (!session) return cls;
  const parsed = new Date(session.date);
  const dateLabel = Number.isNaN(parsed.getTime()) ? session.date : formatClassDate(parsed);
  return { ...cls, nextSessionDate: dateLabel, nextClass: timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel };
}

const rawStudentGroupClasses: StudentGroupClass[] = [
  {
    id: "french-beginners",
    title: "French Conversation for Beginners",
    tutor: "David Martin",
    tutorImage: "/teacher-3.jpg.png",
    tutorRating: 4.9,
    color: "#6C63FF",
    schedule: "Mon, Wed · 6:00 PM – 7:00 PM",
    seatsFilled: 8,
    seatsTotal: 10,
    nextClass: "Monday, 6:00 PM",
    attendancePct: 96,
    subject: "French",
    academicLevel: "Secondary",
    mode: "Online",
    durationMins: 60,
    nextSessionDate: "Monday, Aug 24",
    nextSessionStartsToday: false,
    cohortStart: "Aug 4, 2026",
    cohortEnd: "Sep 29, 2026",
    pricePerSession: 1500,
    description: "Build everyday French speaking confidence through guided conversation practice, vocabulary building and pronunciation coaching.",
    tags: ["Conversation Practice", "Vocabulary Building", "Confidence Building"],
    sessions: [
      { date: "Aug 11, 2026", status: "Completed" },
      { date: "Aug 13, 2026", status: "Completed" },
      { date: "Aug 18, 2026", status: "Completed" },
      { date: "Aug 20, 2026", status: "Completed" },
      { date: "Aug 24, 2026", status: "Upcoming" },
      { date: "Aug 26, 2026", status: "Upcoming" },
    ],
  },
  {
    id: "waec-revision",
    title: "WAEC Revision Bootcamp",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    tutorRating: 4.98,
    color: "#1FA971",
    schedule: "Tue, Thu, Sat · 8:00 AM – 9:30 AM",
    seatsFilled: 6,
    seatsTotal: 12,
    attendancePct: 88,
    nextClass: "Saturday, 8:00 AM",
    subject: "Mathematics",
    academicLevel: "SS3",
    exam: "WAEC",
    mode: "Online",
    durationMins: 90,
    nextSessionDate: "Saturday, Aug 22",
    nextSessionStartsToday: true,
    cohortStart: "Jul 29, 2026",
    cohortEnd: "Sep 23, 2026",
    pricePerSession: 2000,
    description: "Prepare for WAEC Mathematics with comprehensive lessons, solved examples, past questions, and exam-focused strategies to help you achieve excellent results.",
    tags: ["Exam-focused", "Past Questions", "Practice Worksheets", "Step-by-step Solutions"],
    sessions: [
      { date: "Aug 15, 2026", status: "Completed" },
      { date: "Aug 18, 2026", status: "Completed" },
      { date: "Aug 20, 2026", status: "Completed" },
      { date: "Aug 22, 2026", status: "Upcoming" },
      { date: "Aug 25, 2026", status: "Upcoming" },
      { date: "Aug 27, 2026", status: "Upcoming" },
    ],
  },
];

export const studentGroupClasses: StudentGroupClass[] = rawStudentGroupClasses.map(withDerivedNextSession);

export const groupClassResources = ["Week 1: Greetings & Introductions.pdf", "Vocabulary Flashcards.pdf", "Practice Dialogue Recording.mp3"];

// ---------------------------------------------------------------------------
// Learning Paths
// ---------------------------------------------------------------------------

export interface LearningPathModule {
  title: string;
  status: "Completed" | "In Progress" | "Not Started";
  progressPct: number;
}

export interface LearningPath {
  id: string;
  title: string;
  subject: string;
  color: string;
  overallPct: number;
  modules: LearningPathModule[];
}

export const learningPaths: LearningPath[] = [
  {
    id: "waec-math-revision",
    title: "WAEC Mathematics Revision",
    subject: "Mathematics",
    color: "#6C63FF",
    overallPct: 60,
    modules: [
      { title: "Module 1: Number & Numeration", status: "Completed", progressPct: 100 },
      { title: "Module 2: Algebraic Processes", status: "Completed", progressPct: 100 },
      { title: "Module 3: Equations & Inequalities", status: "In Progress", progressPct: 60 },
      { title: "Module 4: Geometry", status: "Not Started", progressPct: 0 },
      { title: "Module 5: Statistics", status: "Not Started", progressPct: 0 },
    ],
  },
  {
    id: "french-for-beginners",
    title: "French for Beginners",
    subject: "French",
    color: "#E58A2A",
    overallPct: 40,
    modules: [
      { title: "Lesson 1: Greetings", status: "Completed", progressPct: 100 },
      { title: "Lesson 2: Numbers & Colors", status: "Completed", progressPct: 100 },
      { title: "Lesson 3: Family & Friends", status: "In Progress", progressPct: 50 },
      { title: "Lesson 4: Daily Routine", status: "Not Started", progressPct: 0 },
      { title: "Lesson 5: Basic Conversations", status: "Not Started", progressPct: 0 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Homework (student)
// ---------------------------------------------------------------------------

export interface StudentHomeworkDetail {
  id: string;
  title: string;
  subject: string;
  tutor: string;
  due: string;
  status: "Pending" | "Submitted" | "Graded" | "Late";
  instructions: string;
  grade?: string;
  feedback?: string;
}

export const studentHomeworkList: StudentHomeworkDetail[] = [
  {
    id: "hw-1",
    title: "Algebra Practice",
    subject: "Mathematics",
    tutor: "Adaeze Okonkwo",
    due: "Tomorrow",
    status: "Pending",
    instructions: "Complete questions 1–15 on page 42 of your workbook. Show all working.",
  },
  {
    id: "hw-2",
    title: "Essay Writing",
    subject: "English",
    tutor: "Sarah K.",
    due: "May 24, 2024",
    status: "Submitted",
    instructions: "Write a 500-word essay on 'My Community' and submit as a PDF.",
  },
  {
    id: "hw-3",
    title: "Physics Quiz",
    subject: "Physics",
    tutor: "James O.",
    due: "May 25, 2024",
    status: "Pending",
    instructions: "Complete the online quiz covering mechanics and vectors.",
  },
  {
    id: "hw-4",
    title: "Chemistry Lab Report",
    subject: "Chemistry",
    tutor: "Mary U.",
    due: "May 15, 2024",
    status: "Graded",
    instructions: "Write up the titration experiment from our last session.",
    grade: "A",
    feedback: "Excellent structure and accurate calculations. Well done!",
  },
];

export const studentHomeworkStatusStyles: Record<StudentHomeworkDetail["status"], string> = {
  Pending: "bg-amber-100 text-amber-700",
  Submitted: "bg-blue-100 text-blue-700",
  Graded: "bg-emerald-100 text-emerald-700",
  Late: "bg-rose-100 text-rose-700",
};

// ---------------------------------------------------------------------------
// Progress (student)
// ---------------------------------------------------------------------------

export const progressMonthlyTrend = [58, 61, 63, 66, 68, 70, 71, 73, 74, 75, 76, 78];

export const progressAchievements = [
  { title: "30-Day Study Streak", earned: true },
  { title: "10 Lessons Completed", earned: true },
  { title: "Homework Hero", earned: true },
  { title: "100% Attendance (1 month)", earned: false },
  { title: "Top Performer", earned: false },
];

export const weakStrongSubjects = {
  strong: ["English", "Mathematics"],
  weak: ["French"],
};

// ---------------------------------------------------------------------------
// Saved Tutors (wishlist)
// ---------------------------------------------------------------------------

export interface SavedTutor {
  name: string;
  image: string;
  subject: string;
  rating: number;
  reviews: number;
  price: number;
  availableToday: boolean;
}

export const savedTutorsList: SavedTutor[] = [
  { name: "Chinonso A.", image: "/teacher-2.jpg.png", subject: "Mathematics", rating: 4.98, reviews: 256, price: 3000, availableToday: true },
  { name: "Sarah K.", image: "/teacher-4.jpg.png", subject: "English", rating: 4.97, reviews: 189, price: 2500, availableToday: false },
  { name: "David M.", image: "/teacher-1.jpg.png", subject: "French", rating: 4.96, reviews: 134, price: 3000, availableToday: true },
];

// ---------------------------------------------------------------------------
// Wallet & Transactions (student)
// ---------------------------------------------------------------------------

export const studentWallet = {
  balance: 15000,
  pendingRefund: 0,
  promoCredits: 500,
  referralEarnings: 1000,
};

export interface StudentTransaction {
  id: string;
  date: string;
  description: string;
  type: "Private Lesson" | "Group Class" | "Refund" | "Top Up" | "Wallet";
  amount: number;
  direction: "debit" | "credit";
  status: "Completed" | "Pending" | "Refunded";
}

export const studentTransactions: StudentTransaction[] = [
  { id: "tx-1", date: "May 22, 2024", description: "Mathematics Lesson with Adaeze Okonkwo", type: "Private Lesson", amount: 3000, direction: "debit", status: "Completed" },
  { id: "tx-2", date: "May 20, 2024", description: "Physics Lesson with James O.", type: "Private Lesson", amount: 5250, direction: "debit", status: "Completed" },
  { id: "tx-3", date: "May 18, 2024", description: "Chemistry Lesson with Mary U.", type: "Private Lesson", amount: 4500, direction: "debit", status: "Completed" },
  { id: "tx-4", date: "May 14, 2024", description: "English Lesson with Sarah K. (Cancelled)", type: "Refund", amount: 2250, direction: "credit", status: "Refunded" },
  { id: "tx-5", date: "May 10, 2024", description: "Wallet Top Up", type: "Top Up", amount: 10000, direction: "credit", status: "Completed" },
  { id: "tx-6", date: "May 1, 2024", description: "French Group Class with David Martin", type: "Group Class", amount: 1500, direction: "debit", status: "Completed" },
];

// ---------------------------------------------------------------------------
// Notifications (student)
// ---------------------------------------------------------------------------

export interface StudentNotification {
  id: string;
  category: "Booking" | "Assignment" | "Message" | "Payment" | "Review" | "Announcement" | "Discovery" | "Counselling";
  text: string;
  time: string;
  unread: boolean;
  // Absent on every notification that predates deep-linking/dismissal (every
  // seed row, and any notification pushed by code that hasn't been updated
  // to pass them) — a notification without an actionUrl falls back to
  // notificationCategoryHref's generic per-category destination.
  bookingId?: string;
  actionUrl?: string;
  dismissed?: boolean;
}

export const studentNotifications: StudentNotification[] = [
  { id: "n-1", category: "Booking", text: "Your Mathematics lesson with Adaeze Okonkwo is confirmed for today at 10:00 AM.", time: "1h ago", unread: true },
  { id: "n-2", category: "Assignment", text: "New homework posted: Algebra Practice, due tomorrow.", time: "3h ago", unread: true },
  { id: "n-3", category: "Message", text: "David Martin sent you a message in French Group Class.", time: "5h ago", unread: true },
  { id: "n-4", category: "Payment", text: "₦10,000 was added to your wallet.", time: "1d ago", unread: false },
  { id: "n-5", category: "Review", text: "Don't forget to leave a review for James O. after your Physics lesson.", time: "2d ago", unread: false },
  { id: "n-6", category: "Announcement", text: "Ensena will be performing scheduled maintenance this weekend.", time: "3d ago", unread: false },
  { id: "n-7", category: "Discovery", text: "Your Discovery Session with Adaeze Okonkwo starts in 1 hour.", time: "10m ago", unread: true },
  { id: "n-8", category: "Discovery", text: "Your Discovery Session is complete. Is this tutor the right fit for you?", time: "1d ago", unread: false },
  { id: "n-9", category: "Discovery", text: "Adaeze Okonkwo is a great match. Book more sessions to continue learning.", time: "2d ago", unread: false },
  { id: "n-11", category: "Counselling", text: "Benny has recommended a Mathematics tutor for you.", time: "9d ago", unread: false },
  { id: "n-12", category: "Counselling", text: "Your next counselling session with Benny is scheduled for Aug 29 at 4:00 PM.", time: "9d ago", unread: false },
];

// Where clicking a notification should land, by category — no per-notification
// record id exists in the seed data to link to (e.g. no lesson/message id), so
// this routes to the closest real existing page for that category rather than
// fabricating one. Announcement has no natural destination, so it's omitted
// (click just marks it read).
export const notificationCategoryHref: Partial<Record<StudentNotification["category"], string>> = {
  Booking: "/student-dashboard/lessons",
  Discovery: "/student-dashboard/lessons",
  Assignment: "/student-dashboard/homework",
  Message: "/student-dashboard/messages",
  Payment: "/student-dashboard/transactions",
  Review: "/student-dashboard/lessons/completed",
  Counselling: "/student-dashboard/counselling",
};

// ---------------------------------------------------------------------------
// Student Profile & Settings
// ---------------------------------------------------------------------------

export const studentProfileDetail = {
  bio: "SS3 student preparing for WAEC and JAMB, aiming to study Computer Science.",
  academicLevel: "WAEC",
  subjects: ["Mathematics", "Physics", "Chemistry", "English", "French"],
  learningGoals: ["Score A1 in WAEC Mathematics", "Improve French conversation confidence"],
  parentName: "Mrs. Ejie",
  parentContact: "ejie.parent@example.com",
  emergencyContact: "+234 802 345 6789",
  timezone: "WAT (GMT+1)",
  preferredLanguage: "English",
  // Optional, editable-later preference — "what do you usually need help
  // with" (academic-support-types.ts). Never required at onboarding; used
  // only to personalize discovery, same taxonomy tutors declare on their
  // own side so the two are directly comparable.
  supportPreferences: ["tutoring"] as SupportTypeId[],
};

// ---------------------------------------------------------------------------
// Help Center (student) — reuses tutor faqItems/knowledgeBaseArticles pattern
// ---------------------------------------------------------------------------

export const studentFaqItems: FaqItem[] = [
  // Getting Started
  { question: "How do I create my account?", answer: "Go to Sign Up, choose Student, and fill in your details. You can start browsing tutors right away." },
  { question: "How do I find a tutor?", answer: "Go to Find a Tutor and filter by subject, academic level, price and availability, or start with a Discovery Session to meet a tutor first." },
  { question: "How do I book a lesson?", answer: "Go to Find a Tutor, choose a tutor and time that works for you, and complete payment. Your lesson is instantly confirmed.", tags: ["booking"] },
  { question: "How do I contact my tutor?", answer: "Open the lesson or your tutor's profile and use Message. All messages stay inside Ensena for your safety." },
  // Lessons & Tutoring
  { question: "How do I reschedule a lesson?", answer: "Open the lesson from My Lessons and select Reschedule. Your tutor needs to confirm the new time.", tags: ["booking"] },
  { question: "What happens if I need to cancel a lesson?", answer: "You can cancel up to 24 hours before your lesson for a full refund. Late cancellations may not be refunded.", tags: ["booking"] },
  { question: "What happens if my tutor cancels?", answer: "You'll be notified immediately and refunded in full. You can then rebook with the same tutor or find another one.", tags: ["booking"] },
  { question: "How do I leave a review?", answer: "After a lesson is marked complete, go to My Lessons and select Leave a Review on that lesson." },
  { question: "How do I join a group class?", answer: "Go to Browse Group Classes, choose a class and plan, and complete payment to secure your seat.", tags: ["group-class"] },
  // Payments & Billing
  { question: "How does escrow protect my payment?", answer: "Your payment is held securely and only released to the tutor after your lesson is completed, so you're always protected.", tags: ["payment"] },
  { question: "How do I top up my wallet?", answer: "Go to Wallet → Top Up, choose an amount, and pay with card, bank transfer or Paystack/Flutterwave.", tags: ["payment"] },
  { question: "How do I request a refund?", answer: "If your lesson didn't happen or wasn't as described, open the lesson and select Contact Support to start a refund request.", tags: ["payment"] },
  // Account & Profile
  { question: "How do I update my profile or account details?", answer: "Go to Settings → Profile to update your name, photo, contact details and learning preferences.", tags: ["account"] },
  { question: "How do I get academic counselling?", answer: "Go to Counselling to book a session with an academic counsellor for guidance on tutors, subjects or your learning plan.", tags: ["counselling"] },
];

// ---------------------------------------------------------------------------
// Messages (student)
// ---------------------------------------------------------------------------

export type ConversationKind = "Private Tutor" | "Group Class" | "Discovery Session" | "Ensena Support";

// The deterministic conversation id a brand-new (no seed conversation yet)
// private-tutor thread gets — both student-messages-client.tsx's own
// conversation resolution and message-tutor-modal.tsx synthesize the exact
// same id for the same tutor slug, so a conversation started from a tutor's
// profile page and one opened from the real inbox for the same tutor are
// the same real thread, never two orphaned ones.
export function studentTutorConversationId(tutorSlug: string): string {
  return `sc-tutor-${tutorSlug}`;
}

export interface StudentConversation {
  id: string;
  name: string;
  image?: string;
  kind: ConversationKind;
  /** e.g. subject for a private tutor, tutor name for a group class */
  contextLabel: string;
  online?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  pinned: boolean;
  archived: boolean;
  /** Drives the Booking ID shown in the chat header and the View Class / View Group Class / View Appointment button. */
  booking?: {
    type: "private" | "group" | "discovery" | "counselling";
    /** Seed passed to buildBookingReference, or the group class id used to build the "View Group Class" link. */
    seedId: string;
  };
}

// One unified inbox — no separate Private Tutor / Group Class / Counsellor
// sections. Each conversation's `kind`/`contextLabel` is the only thing
// that tells them apart, and each is wired to a real booking already
// established elsewhere in the app (studentLessons, studentGroupClasses,
// discoverySessions) rather than an invented id, so its Booking ID and
// "View Class" links are the exact same ones shown on My Classes.
export const initialStudentConversations: StudentConversation[] = [
  { id: "sc-1", name: "Adaeze Okonkwo", image: "/teacher-2.jpg.png", kind: "Private Tutor", contextLabel: "Mathematics", online: true, lastMessage: "Great, I'll see you tomorrow at 7 PM.", time: "10:24 AM", unread: 2, pinned: true, archived: false, booking: { type: "private", seedId: "sl-1" } },
  { id: "sc-2", name: "French Conversation for Beginners", image: "/teacher-3.jpg.png", kind: "Group Class", contextLabel: "David Martin", lastMessage: "Your practice questions are now available.", time: "Yesterday", unread: 1, pinned: false, archived: false, booking: { type: "group", seedId: "french-beginners" } },
  { id: "sc-3", name: "Adaeze Okonkwo", image: "/teacher-2.jpg.png", kind: "Discovery Session", contextLabel: "Mathematics", lastMessage: "Thanks for booking your discovery session!", time: "Yesterday", unread: 0, pinned: false, archived: false, booking: { type: "discovery", seedId: "ds-1" } },
  { id: "sc-4", name: "Ensena Counsellor", image: "/teacher-3.jpg.png", kind: "Ensena Support", contextLabel: "Academic Support", lastMessage: "Your counselling appointment has been confirmed.", time: "Monday", unread: 1, pinned: false, archived: false, booking: { type: "counselling", seedId: "cns-1" } },
  { id: "sc-5", name: "James O.", image: "/teacher-1.jpg.png", kind: "Private Tutor", contextLabel: "Physics", lastMessage: "Please find the notes from today's class.", time: "May 16", unread: 0, pinned: false, archived: false, booking: { type: "private", seedId: "sl-3" } },
  { id: "sc-6", name: "Mary U.", image: "/teacher-2.jpg.png", kind: "Private Tutor", contextLabel: "Chemistry", lastMessage: "Thanks for the lab report!", time: "May 12", unread: 0, pinned: false, archived: false, booking: { type: "private", seedId: "sl-4" } },
];

export interface StudentChatMessage {
  id: string;
  convId: string;
  sender: "student" | "other";
  text?: string;
  time: string;
  offer?: Offer;
  attachments?: MessageAttachment[];
  /** A dated/status divider rendered above this message, e.g. "Today" or "New Messages". */
  dividerLabel?: string;
  /** Read receipt on the student's own sent messages — a static display detail, not a tracked feature. */
  read?: boolean;
  /** A single reaction shown under this message, e.g. "👍 1" — display-only, not a live reaction picker. */
  reaction?: string;
  /** Client-generated per-send-attempt id — lets sendStudentMessage reject an exact retry as a no-op rather than creating a second message. */
  clientId?: string;
}

export const initialStudentMessages: StudentChatMessage[] = [
  { id: "sm-1", convId: "sc-1", sender: "other", text: "Hi Cynthia, how did the algebra worksheet go?", time: "10:12 AM" },
  { id: "sm-2", convId: "sc-1", sender: "student", text: "I finished it! Had a bit of trouble with question 8.", time: "10:20 AM", read: true },
  { id: "sm-3", convId: "sc-1", sender: "other", text: "No problem, we'll go over it in our next lesson.", time: "10:25 AM" },
  { id: "sm-4a1", convId: "sc-1", sender: "student", text: "Hi Ms. Adaeze, I'm preparing for WAEC and would like lessons twice a week.", time: "10:31 AM", read: true },
  { id: "sm-4a2", convId: "sc-1", sender: "student", time: "10:31 AM", offer: getOfferById("off-6") },
  { id: "sm-4b", convId: "sc-1", sender: "other", text: "Since you're booking a full month, here's a discounted rate. Let's lock in your Tue/Thu slot.", time: "10:32 AM" },
  { id: "sm-4c", convId: "sc-1", sender: "other", time: "10:32 AM", offer: getOfferById("off-1") },
  { id: "sm-5", convId: "sc-1", sender: "student", text: "Hi Adaeze, can we focus on quadratic equations tomorrow?", time: "10:15 AM", read: true, dividerLabel: "Today" },
  { id: "sm-6", convId: "sc-1", sender: "other", text: "Hi Cynthia! Of course, we can. I'll prepare some practice questions for you so we can solve them together.", time: "10:18 AM" },
  { id: "sm-7", convId: "sc-1", sender: "student", text: "Great, thank you!", time: "10:19 AM", read: true },
  { id: "sm-8", convId: "sc-1", sender: "other", text: "You're welcome. See you tomorrow at 7 PM.", time: "10:24 AM", dividerLabel: "New Messages", reaction: "👍 1" },

  { id: "sm-10", convId: "sc-2", sender: "other", text: "Welcome to the class! Feel free to introduce yourself.", time: "Mon" },
  { id: "sm-11", convId: "sc-2", sender: "student", text: "Hi everyone, excited to be here!", time: "Mon", read: true },
  { id: "sm-12", convId: "sc-2", sender: "other", text: "Your practice questions are now available.", time: "Yesterday" },

  { id: "sm-20", convId: "sc-3", sender: "other", text: "Thanks for booking your discovery session! Looking forward to meeting you.", time: "Yesterday" },

  { id: "sm-30", convId: "sc-4", sender: "student", text: "Hi, I'd like to speak with a counsellor about my WAEC study plan.", time: "Monday", read: true },
  { id: "sm-31", convId: "sc-4", sender: "other", text: "Your counselling appointment has been confirmed.", time: "Monday" },

  { id: "sm-40", convId: "sc-5", sender: "other", text: "Please find the notes from today's class.", time: "May 16" },

  { id: "sm-50", convId: "sc-6", sender: "other", text: "Thanks for the lab report!", time: "May 12" },
];

