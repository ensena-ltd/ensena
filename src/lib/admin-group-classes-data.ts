import { buildBookingReference } from "@/lib/booking-reference";

export type GroupClassStatus = "Pending Review" | "Live" | "Upcoming" | "Completed" | "Cancelled" | "Changes Requested" | "Archived" | "Rejected";

// The admin Group Classes workspace groups the lifecycle statuses above into
// one of three top-level approval categories — mirrors how Tutor
// Verification separates its own lifecycle from a simpler admin-facing
// bucket. "Changes Requested" still counts as awaiting a decision (the
// class returns to Pending Approval once the tutor resubmits).
export type GroupClassApprovalCategory = "Pending Approval" | "Approved" | "Rejected";

export function approvalCategoryFor(status: GroupClassStatus): GroupClassApprovalCategory {
  if (status === "Rejected") return "Rejected";
  if (status === "Pending Review" || status === "Changes Requested") return "Pending Approval";
  return "Approved";
}

export const classRejectionReasons = [
  "Inappropriate content",
  "Incorrect academic level",
  "Pricing issue",
  "Schedule issue",
  "Class information incomplete",
  "Other",
];

export const classChangeRequestFields = ["Class title", "Description", "Academic level", "Exam", "Price", "Schedule", "Class capacity", "Other"];

const examKeywords = ["WAEC", "JAMB", "NECO", "UTME"];

// GroupClassRow.academicLevel conflates level and exam in one free-text
// field (e.g. "WAEC", "NECO / WAEC", "Secondary") — split it into the two
// display columns the queue table needs without changing the stored field.
export function examFor(academicLevel: string): string {
  const parts = academicLevel.split(/[\s/]+/).filter((p) => examKeywords.includes(p));
  return parts.length > 0 ? parts.join(" / ") : "—";
}
export type TeachingMode = "Online" | "Physical" | "Hybrid";
export type SessionStatus = "Upcoming" | "Completed" | "Cancelled" | "Rescheduled";
export type EscrowLineStatus = "Released" | "Scheduled" | "Frozen";

export interface CurriculumWeek {
  week: number;
  topic: string;
}

export interface AiCheck {
  label: string;
  pass: boolean;
  note?: string;
}

export interface RosterStudent {
  id: string;
  name: string;
  image: string;
  attendancePct: number;
  homeworkPct: number;
  avgScore: number;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  sessionsPaid: number;
  amountPaid: number;
  certificateEligible: boolean;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  image: string;
  joinedDate: string;
}

export interface ClassSession {
  id: string;
  label: string;
  date: string;
  status: SessionStatus;
}

export interface EscrowLine {
  session: string;
  amount: number;
  status: EscrowLineStatus;
  date: string;
}

export interface ReviewComment {
  student: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ActivityEntry {
  time: string;
  action: string;
}

export interface GroupClassRow {
  id: string;
  classCode: string;
  title: string;
  bannerLabel: string;
  bannerTint: string;
  tutor: string;
  tutorId: string;
  tutorImage: string;
  tutorRating: number;
  subject: string;
  academicLevel: string;
  // The precise class/grade this class targets (e.g. "SS2", "JSS3") — see
  // class-grade-taxonomy.ts. Absent on legacy rows that predate it.
  classGrade?: string;
  mode: TeachingMode;
  language: string;
  scheduleDays: string;
  scheduleTime: string;
  timezone: string;
  weeks: number;
  sessionsTotal: number;
  sessionsCompleted: number;
  sessionDurationMins: number;
  pricePerSession: number;
  maxStudents: number;
  // Only real, tutor-submitted classes (group-class-submission-store.ts)
  // carry a real minimum — legacy seed rows predate the concept.
  minStudents?: number;
  studentsEnrolled: number;
  price: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  status: GroupClassStatus;
  createdDate: string;
  startDate: string;
  endDate: string;
  weeklyHomework: boolean;
  certificateOnCompletion: boolean;
  meetingLink: string;

  description: string;
  learningOutcomes: string[];
  curriculum: CurriculumWeek[];
  homeworkPlan: string;
  requirements: string[];

  submittedAt?: string;
  aiScore?: number;
  aiChecks?: AiCheck[];
  rejectionReason?: string;
  changeRequestNote?: string;
  changeRequestFields?: string[];

  students: RosterStudent[];
  waitlist: WaitlistEntry[];
  sessions: ClassSession[];

  attendance: { avgAttendancePct: number; late: number; absent: number; cameraUsagePct: number; participationScore: number };
  homeworkStats: { assignmentsCount: number; submissionPct: number; avgScore: number; lateSubmissions: number };

  classroom: { recordingAvailable: boolean; whiteboardActive: boolean; chatMessages: number; pollsCount: number; connectionQuality: "Excellent" | "Good" | "Fair" };

  reviews: { breakdown: [number, number, number, number, number]; comments: ReviewComment[] };

  escrow: { totalHeld: number; released: number; perSessionAmount: number; frozen: number; log: EscrowLine[] };

  aiInsights: string[];
  activityLog: ActivityEntry[];
  certificatesIssued: number;

  adminNotes: string[];

  // Promotion — only meaningful once the class is Approved; see
  // approvalCategoryFor(). Undefined/false = never promoted.
  promoted: boolean;
  promotionChannels: { homepage: boolean; studentDashboard: boolean; discovery: boolean; email: boolean; push: boolean };
  promotionHeadline?: string;
  promotionDescription?: string;
}

export interface PromotionAudience {
  totalMatching: number;
  levelMatching: number;
  examMatching: number;
  subjectInterested: number;
}

// Illustrative platform-scale targeting figures for the class's own
// level/exam/subject — same "hand-authored aggregate distinct from the
// small interactive seed list" convention already used by groupClassStats
// and platformStats elsewhere in the admin data layer; there's no real
// per-student academic-level/exam-goal ledger to count against.
export function promotionAudienceFor(row: GroupClassRow): PromotionAudience {
  let hash = 0;
  for (const ch of row.id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  const levelMatching = 150 + (hash % 120);
  const examMatching = 120 + (hash % 100);
  const subjectInterested = 90 + (hash % 90);
  return {
    totalMatching: levelMatching + Math.round(examMatching * 0.4),
    levelMatching,
    examMatching,
    subjectInterested,
  };
}

export const groupClassStatusStyles: Record<GroupClassStatus, string> = {
  "Pending Review": "bg-amber-100 text-amber-700",
  Live: "bg-emerald-100 text-emerald-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-rose-100 text-rose-700",
  "Changes Requested": "bg-amber-100 text-amber-700",
  Archived: "bg-slate-100 text-slate-600",
  Rejected: "bg-rose-100 text-rose-700",
};

export const sessionStatusStyles: Record<SessionStatus, string> = {
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Rescheduled: "bg-amber-100 text-amber-700",
};

const studentImgs = ["/teacher-1.jpg.png", "/teacher-2.jpg.png", "/teacher-3.jpg.png", "/teacher-4.jpg.png"];

function buildSessions(total: number, completed: number, days: string, startDate: string): ClassSession[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `s-${i + 1}`,
    label: `Session ${i + 1}`,
    date: `${startDate} + ${i} · ${days.split(",")[0]}`,
    status: i < completed ? "Completed" : i === completed ? "Upcoming" : "Upcoming",
  }));
}

// Group class students don't all pay for the full course upfront — some can
// only afford a handful of sessions at a time. sessionsPaid/amountPaid model
// that per student rather than assuming everyone bought the whole package.
function buildRoster(n: number, seed: number, sessionsTotal: number, pricePerSession: number): RosterStudent[] {
  return Array.from({ length: n }, (_, i) => {
    const attendancePct = 78 + ((seed + i * 7) % 22);
    const homeworkPct = 70 + ((seed + i * 11) % 30);
    const paymentStatus = i % 9 === 0 ? "Pending" : "Paid";
    let sessionsPaid = 0;
    if (paymentStatus === "Paid") {
      if (sessionsTotal > 1 && i % 5 === 0) {
        // Partial payer: paid for a subset of sessions only.
        sessionsPaid = Math.min(sessionsTotal, Math.max(1, ((seed + i * 13) % sessionsTotal) + 1));
      } else {
        sessionsPaid = sessionsTotal;
      }
    }
    return {
      id: `st-${seed}-${i}`,
      name: ["Chidinma Eze", "Yusuf Aliyu", "Blessing Okafor", "Emeka Nwosu", "Halima Sani", "Kelechi Uche", "Ngozi Obi", "Femi Alabi", "Aisha Bello", "Chuka Nnamdi"][i % 10],
      image: studentImgs[i % studentImgs.length],
      attendancePct,
      homeworkPct,
      avgScore: 65 + ((seed + i * 5) % 33),
      paymentStatus,
      sessionsPaid,
      amountPaid: sessionsPaid * pricePerSession,
      certificateEligible: attendancePct >= 80 && homeworkPct >= 75,
    };
  });
}

function buildEscrowLog(sessionsTotal: number, sessionsCompleted: number, perSession: number): EscrowLine[] {
  return Array.from({ length: sessionsTotal }, (_, i) => ({
    session: `Session ${i + 1}`,
    amount: perSession,
    status: i < sessionsCompleted ? "Released" : "Scheduled",
    date: i < sessionsCompleted ? `Week ${i + 1}` : `Scheduled: Week ${i + 1}`,
  }));
}

function defaultCurriculum(subject: string, weeks: number): CurriculumWeek[] {
  return Array.from({ length: weeks }, (_, i) => ({ week: i + 1, topic: `${subject}: Week ${i + 1} Fundamentals & Practice` }));
}

interface SeedInput {
  id: string;
  title: string;
  bannerLabel: string;
  bannerTint: string;
  tutor: string;
  tutorId: string;
  tutorImage: string;
  tutorRating: number;
  subject: string;
  academicLevel: string;
  mode: TeachingMode;
  scheduleDays: string;
  scheduleTime: string;
  weeks: number;
  sessionsCompleted: number;
  sessionDurationMins: number;
  maxStudents: number;
  studentsEnrolled: number;
  price: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  status: GroupClassStatus;
  createdDate: string;
  startDate: string;
  endDate: string;
}

function seed(input: SeedInput, overrides: Partial<GroupClassRow> = {}): GroupClassRow {
  const sessionsPerWeek = input.scheduleDays.split(",").length;
  const sessionsTotal = input.weeks * sessionsPerWeek;
  const sessionsCompleted = Math.min(sessionsTotal, input.sessionsCompleted);
  const gross = input.revenue;
  const commission = Math.round(gross * 0.2);
  const tutorEarnings = gross - commission;
  const perSessionAmount = Math.round(tutorEarnings / sessionsTotal);
  const pricePerSession = Math.round(input.price / sessionsTotal);
  const students = buildRoster(input.studentsEnrolled, input.studentsEnrolled + input.weeks, sessionsTotal, pricePerSession);
  const certificatesIssued = input.status === "Completed" ? students.filter((s) => s.certificateEligible).length : 0;
  // The class's own real reference code (CLS + random suffix) — deterministically
  // derived from its id, same reasoning as buildBookingReference's own doc
  // comment (this seed data has no backend to have persisted a real
  // crypto-random one). Distinct from a student's own enrollment/booking code.
  const classCode = buildBookingReference("class", input.id);

  return {
    id: input.id,
    classCode,
    title: input.title,
    bannerLabel: input.bannerLabel,
    bannerTint: input.bannerTint,
    tutor: input.tutor,
    tutorId: input.tutorId,
    tutorImage: input.tutorImage,
    tutorRating: input.tutorRating,
    subject: input.subject,
    academicLevel: input.academicLevel,
    mode: input.mode,
    language: "English",
    scheduleDays: input.scheduleDays,
    scheduleTime: input.scheduleTime,
    timezone: "WAT (UTC+1)",
    weeks: input.weeks,
    sessionsTotal,
    sessionsCompleted,
    sessionDurationMins: input.sessionDurationMins,
    pricePerSession,
    maxStudents: input.maxStudents,
    studentsEnrolled: input.studentsEnrolled,
    price: input.price,
    revenue: input.revenue,
    rating: input.rating,
    reviewCount: input.reviewCount,
    status: input.status,
    createdDate: input.createdDate,
    startDate: input.startDate,
    endDate: input.endDate,
    weeklyHomework: true,
    certificateOnCompletion: true,
    meetingLink: `https://ensena.co/class/${input.id}`,
    description: `A structured, exam-focused ${input.subject} group class for ${input.academicLevel} students, led live by ${input.tutor} with weekly homework and progress tracking.`,
    learningOutcomes: [
      `Build a strong foundation in core ${input.subject} topics`,
      `Practice with past questions and timed mock tests`,
      `Develop confidence answering exam-style questions`,
    ],
    curriculum: defaultCurriculum(input.subject, input.weeks),
    homeworkPlan: "One assignment released after every session, due before the next class.",
    requirements: ["Stable internet connection", "Notebook and calculator", "Camera on during live sessions"],
    submittedAt: input.status === "Pending Review" ? `${input.createdDate}` : undefined,
    aiScore: input.status === "Pending Review" ? 82 + (input.studentsEnrolled % 15) : undefined,
    aiChecks:
      input.status === "Pending Review"
        ? [
            { label: "Curriculum complete", pass: true },
            { label: "Pricing within normal range", pass: true },
            { label: "Verified tutor", pass: true },
            { label: "Description quality", pass: false, note: "Description could be more detailed" },
          ]
        : undefined,
    students,
    waitlist:
      input.studentsEnrolled >= input.maxStudents
        ? [
            { id: `wl-${input.id}-1`, name: "Tobi Ogundele", image: studentImgs[1], joinedDate: "2 days ago" },
            { id: `wl-${input.id}-2`, name: "Amina Yusuf", image: studentImgs[2], joinedDate: "Yesterday" },
          ]
        : [],
    sessions: buildSessions(sessionsTotal, sessionsCompleted, input.scheduleDays, input.startDate),
    attendance: {
      avgAttendancePct: Math.round(students.reduce((s, st) => s + st.attendancePct, 0) / Math.max(1, students.length)) || 90,
      late: Math.max(0, Math.round(input.studentsEnrolled * 0.08)),
      absent: Math.max(0, Math.round(input.studentsEnrolled * 0.04)),
      cameraUsagePct: 88,
      participationScore: 4.4,
    },
    homeworkStats: {
      assignmentsCount: sessionsCompleted,
      submissionPct: Math.round(students.reduce((s, st) => s + st.homeworkPct, 0) / Math.max(1, students.length)) || 90,
      avgScore: Math.round(students.reduce((s, st) => s + st.avgScore, 0) / Math.max(1, students.length)) || 80,
      lateSubmissions: Math.max(0, Math.round(input.studentsEnrolled * 0.15)),
    },
    classroom: {
      recordingAvailable: input.status !== "Pending Review",
      whiteboardActive: input.status === "Live",
      chatMessages: 128 + input.studentsEnrolled * 4,
      pollsCount: 3,
      connectionQuality: "Excellent",
    },
    reviews: {
      breakdown: [
        Math.round(input.reviewCount * 0.78),
        Math.round(input.reviewCount * 0.15),
        Math.round(input.reviewCount * 0.04),
        Math.round(input.reviewCount * 0.02),
        Math.round(input.reviewCount * 0.01),
      ],
      comments: [
        { student: students[0]?.name ?? "Student", rating: 5, comment: `${input.tutor.split(" ")[0]} explains ${input.subject} so clearly. My grades have improved a lot.`, date: "1 week ago" },
        { student: students[1]?.name ?? "Student", rating: 5, comment: "Homework feedback is fast and detailed. Highly recommend this class.", date: "2 weeks ago" },
      ],
    },
    escrow: {
      totalHeld: tutorEarnings - perSessionAmount * sessionsCompleted,
      released: perSessionAmount * sessionsCompleted,
      perSessionAmount,
      frozen: input.status === "Cancelled" ? tutorEarnings - perSessionAmount * sessionsCompleted : 0,
      log: buildEscrowLog(sessionsTotal, sessionsCompleted, perSessionAmount),
    },
    aiInsights: [
      `Average attendance is ${Math.round(students.reduce((s, st) => s + st.attendancePct, 0) / Math.max(1, students.length)) || 90}%, ${input.studentsEnrolled > 8 ? "up 12% vs last month" : "steady vs last month"}.`,
      `Homework completion is ${Math.round(students.reduce((s, st) => s + st.homeworkPct, 0) / Math.max(1, students.length)) || 90}%.`,
      input.weeks >= 6 ? `Students show more questions around Week 3 content. Recommend slowing down that section.` : `Class pace is well matched to student comprehension.`,
      input.rating >= 4.9 ? "Class engagement is excellent. Recommend featuring this class on the homepage." : "Engagement is solid with room to grow via more live polls.",
    ],
    activityLog: [
      { time: input.createdDate, action: "Class created by tutor" },
      { time: input.createdDate, action: "Submitted for admin review" },
      ...(input.status !== "Pending Review" && input.status !== "Changes Requested" ? [{ time: input.createdDate, action: "Approved and published" }] : []),
      ...(input.studentsEnrolled > 0 ? [{ time: input.startDate, action: `First student enrolled` }] : []),
      ...(sessionsCompleted > 0 ? [{ time: input.startDate, action: "Session 1 completed: escrow released" }] : []),
      ...(input.status === "Completed" ? [{ time: input.endDate, action: "Course completed: certificates issued" }] : []),
      ...(input.status === "Cancelled" ? [{ time: input.endDate, action: "Class cancelled: remaining escrow frozen" }] : []),
    ],
    certificatesIssued,
    adminNotes: [],
    promoted: false,
    promotionChannels: { homepage: false, studentDashboard: true, discovery: false, email: false, push: false },
    ...overrides,
  };
}

export const initialGroupClasses: GroupClassRow[] = [
  seed({
    id: "gc-1", title: "WAEC Mathematics Bootcamp 2024", bannerLabel: "WAEC MATHS BOOTCAMP", bannerTint: "from-indigo-600 to-indigo-800",
    tutor: "Adaeze Okonkwo", tutorId: "t-1", tutorImage: "/teacher-2.jpg.png", tutorRating: 4.98,
    subject: "Mathematics", academicLevel: "WAEC", mode: "Online", scheduleDays: "Mon,Wed,Fri", scheduleTime: "4:00 PM - 6:00 PM",
    weeks: 8, sessionsCompleted: 12, sessionDurationMins: 60, maxStudents: 10, studentsEnrolled: 9,
    price: 18000, revenue: 162000, rating: 4.98, reviewCount: 245, status: "Live",
    createdDate: "May 10, 2024", startDate: "May 20, 2024", endDate: "Jul 12, 2024",
  }, {
    description: "An intensive, exam-focused WAEC Mathematics bootcamp covering the full syllabus with weekly homework, timed mock tests, and personalised feedback.",
  }),
  seed({
    id: "gc-2", title: "JAMB Physics Intensive", bannerLabel: "JAMB PHYSICS INTENSIVE", bannerTint: "from-purple-600 to-purple-800",
    tutor: "Michael Adewale", tutorId: "t-2", tutorImage: "/teacher-3.jpg.png", tutorRating: 4.92,
    subject: "Physics", academicLevel: "JAMB", mode: "Online", scheduleDays: "Tue,Thu,Sat", scheduleTime: "6:00 PM - 8:00 PM",
    weeks: 6, sessionsCompleted: 4, sessionDurationMins: 90, maxStudents: 15, studentsEnrolled: 12,
    price: 16000, revenue: 192000, rating: 4.95, reviewCount: 178, status: "Upcoming",
    createdDate: "May 8, 2024", startDate: "May 26, 2024", endDate: "Jul 6, 2024",
  }),
  seed({
    id: "gc-3", title: "English Conversation Beginners", bannerLabel: "ENGLISH CONVERSATION BEGINNERS", bannerTint: "from-teal-500 to-teal-700",
    tutor: "John Emmanuel", tutorId: "t-3", tutorImage: "/teacher-1.jpg.png", tutorRating: 4.7,
    subject: "English", academicLevel: "Secondary", mode: "Online", scheduleDays: "Mon,Wed", scheduleTime: "7:00 PM - 8:30 PM",
    weeks: 8, sessionsCompleted: 10, sessionDurationMins: 90, maxStudents: 10, studentsEnrolled: 7,
    price: 14000, revenue: 98000, rating: 4.90, reviewCount: 132, status: "Live",
    createdDate: "Apr 28, 2024", startDate: "May 6, 2024", endDate: "Jun 28, 2024",
  }),
  seed({
    id: "gc-4", title: "WAEC Chemistry Crash Course", bannerLabel: "CHEMISTRY WAEC CRASH COURSE", bannerTint: "from-orange-500 to-amber-600",
    tutor: "Tunde Adebayo", tutorId: "t-5", tutorImage: "/teacher-2.jpg.png", tutorRating: 4.9,
    subject: "Chemistry", academicLevel: "WAEC", mode: "Online", scheduleDays: "Sat,Sun", scheduleTime: "10:00 AM - 12:00 PM",
    weeks: 4, sessionsCompleted: 5, sessionDurationMins: 120, maxStudents: 20, studentsEnrolled: 15,
    price: 12000, revenue: 180000, rating: 4.88, reviewCount: 201, status: "Live",
    createdDate: "May 1, 2024", startDate: "May 11, 2024", endDate: "Jun 9, 2024",
  }),
  seed({
    id: "gc-5", title: "Biology Masterclass", bannerLabel: "BIOLOGY MASTERCLASS", bannerTint: "from-blue-600 to-blue-800",
    tutor: "Zainab Yusuf", tutorId: "t-6", tutorImage: "/teacher-3.jpg.png", tutorRating: 4.8,
    subject: "Biology", academicLevel: "SS 1 - SS 3", mode: "Online", scheduleDays: "Tue,Thu", scheduleTime: "5:00 PM - 7:00 PM",
    weeks: 6, sessionsCompleted: 2, sessionDurationMins: 120, maxStudents: 12, studentsEnrolled: 8,
    price: 15000, revenue: 120000, rating: 4.93, reviewCount: 160, status: "Upcoming",
    createdDate: "May 12, 2024", startDate: "May 28, 2024", endDate: "Jul 9, 2024",
  }),
  seed({
    id: "gc-6", title: "Data Analysis with Excel", bannerLabel: "DATA ANALYSIS WITH EXCEL", bannerTint: "from-emerald-600 to-emerald-800",
    tutor: "Faruk Musa", tutorId: "t-7", tutorImage: "/teacher-1.jpg.png", tutorRating: 4.7,
    subject: "Computer Skills", academicLevel: "University", mode: "Online", scheduleDays: "Mon,Wed,Fri", scheduleTime: "8:00 PM - 9:30 PM",
    weeks: 6, sessionsCompleted: 18, sessionDurationMins: 90, maxStudents: 15, studentsEnrolled: 6,
    price: 20000, revenue: 120000, rating: 4.91, reviewCount: 98, status: "Completed",
    createdDate: "Mar 1, 2024", startDate: "Mar 8, 2024", endDate: "Apr 19, 2024",
  }),
  seed({
    id: "gc-7", title: "NECO & WAEC Biology Prep", bannerLabel: "BIOLOGY NECO & WAEC PREP", bannerTint: "from-pink-500 to-rose-600",
    tutor: "Ibrahim Suleiman", tutorId: "t-8", tutorImage: "/teacher-4.jpg.png", tutorRating: 4.6,
    subject: "Biology", academicLevel: "NECO / WAEC", mode: "Online", scheduleDays: "Tue,Thu,Sat", scheduleTime: "4:00 PM - 6:00 PM",
    weeks: 7, sessionsCompleted: 9, sessionDurationMins: 60, maxStudents: 20, studentsEnrolled: 17,
    price: 13000, revenue: 221000, rating: 4.95, reviewCount: 214, status: "Live",
    createdDate: "Apr 20, 2024", startDate: "Apr 30, 2024", endDate: "Jun 18, 2024",
  }),
  seed({
    id: "gc-8", title: "Mental Maths for Kids", bannerLabel: "MENTAL MATHS FOR KIDS", bannerTint: "from-yellow-400 to-amber-500",
    tutor: "Adaeze Okonkwo", tutorId: "t-1", tutorImage: "/teacher-2.jpg.png", tutorRating: 4.98,
    subject: "Mathematics", academicLevel: "Primary", mode: "Online", scheduleDays: "Mon,Wed", scheduleTime: "4:00 PM - 5:00 PM",
    weeks: 6, sessionsCompleted: 12, sessionDurationMins: 45, maxStudents: 10, studentsEnrolled: 10,
    price: 10000, revenue: 60000, rating: 4.87, reviewCount: 76, status: "Completed",
    createdDate: "Mar 15, 2024", startDate: "Mar 25, 2024", endDate: "May 6, 2024",
  }),
  seed({
    id: "gc-9", title: "Spanish for Beginners", bannerLabel: "SPANISH FOR BEGINNERS", bannerTint: "from-red-500 to-red-700",
    tutor: "Michael Adewale", tutorId: "t-2", tutorImage: "/teacher-3.jpg.png", tutorRating: 4.92,
    subject: "Spanish", academicLevel: "Secondary", mode: "Online", scheduleDays: "Mon,Wed", scheduleTime: "5:00 PM - 6:30 PM",
    weeks: 8, sessionsCompleted: 0, sessionDurationMins: 90, maxStudents: 12, studentsEnrolled: 0,
    price: 15000, revenue: 0, rating: 0, reviewCount: 0, status: "Pending Review",
    createdDate: "Today", startDate: "TBD", endDate: "TBD",
  }),
  seed({
    id: "gc-10", title: "Further Mathematics WAEC Intensive", bannerLabel: "FURTHER MATHS WAEC", bannerTint: "from-slate-600 to-slate-800",
    tutor: "Zainab Yusuf", tutorId: "t-6", tutorImage: "/teacher-3.jpg.png", tutorRating: 4.8,
    subject: "Further Mathematics", academicLevel: "WAEC", mode: "Online", scheduleDays: "Tue,Thu", scheduleTime: "6:00 PM - 7:30 PM",
    weeks: 8, sessionsCompleted: 0, sessionDurationMins: 90, maxStudents: 10, studentsEnrolled: 0,
    price: 19000, revenue: 0, rating: 0, reviewCount: 0, status: "Changes Requested",
    createdDate: "Yesterday", startDate: "TBD", endDate: "TBD",
  }, {
    changeRequestNote: "Please update the class schedule before we approve this class. It currently overlaps with another WAEC Mathematics session.",
    changeRequestFields: ["Schedule"],
  }),
  seed({
    id: "gc-11", title: "Yoruba Language Class", bannerLabel: "YORUBA LANGUAGE CLASS", bannerTint: "from-lime-600 to-green-700",
    tutor: "John Emmanuel", tutorId: "t-3", tutorImage: "/teacher-1.jpg.png", tutorRating: 4.7,
    subject: "Yoruba", academicLevel: "Secondary", mode: "Online", scheduleDays: "Fri", scheduleTime: "5:00 PM - 6:00 PM",
    weeks: 4, sessionsCompleted: 0, sessionDurationMins: 60, maxStudents: 10, studentsEnrolled: 0,
    price: 8000, revenue: 0, rating: 0, reviewCount: 0, status: "Rejected",
    createdDate: "Apr 2, 2024", startDate: "TBD", endDate: "TBD",
  }, {
    rejectionReason: "Information inconsistent",
    activityLog: [
      { time: "Apr 2, 2024", action: "Class created by tutor" },
      { time: "Apr 2, 2024", action: "Submitted for admin review" },
      { time: "Apr 3, 2024", action: "Rejected: Information inconsistent" },
    ],
  }),
  seed({
    id: "gc-12", title: "JAMB 2023 Prep Class", bannerLabel: "JAMB 2023 PREP", bannerTint: "from-gray-500 to-gray-700",
    tutor: "Tunde Adebayo", tutorId: "t-5", tutorImage: "/teacher-2.jpg.png", tutorRating: 4.9,
    subject: "Mathematics", academicLevel: "JAMB", mode: "Online", scheduleDays: "Mon,Wed,Fri", scheduleTime: "5:00 PM - 6:30 PM",
    weeks: 10, sessionsCompleted: 30, sessionDurationMins: 90, maxStudents: 20, studentsEnrolled: 18,
    price: 14000, revenue: 252000, rating: 4.85, reviewCount: 190, status: "Archived",
    createdDate: "Jan 5, 2023", startDate: "Jan 15, 2023", endDate: "Mar 24, 2023",
  }),
];

export const groupClassStats = {
  totalClasses: initialGroupClasses.length,
  pendingReview: initialGroupClasses.filter((c) => c.status === "Pending Review").length,
  pendingApproval: initialGroupClasses.filter((c) => approvalCategoryFor(c.status) === "Pending Approval").length,
  approved: initialGroupClasses.filter((c) => approvalCategoryFor(c.status) === "Approved").length,
  rejected: initialGroupClasses.filter((c) => approvalCategoryFor(c.status) === "Rejected").length,
  published: initialGroupClasses.filter((c) => c.status === "Live" || c.status === "Upcoming" || c.status === "Completed").length,
  live: initialGroupClasses.filter((c) => c.status === "Live").length,
  completed: initialGroupClasses.filter((c) => c.status === "Completed").length,
  cancelled: initialGroupClasses.filter((c) => c.status === "Cancelled").length,
  studentsEnrolled: initialGroupClasses.reduce((s, c) => s + c.studentsEnrolled, 0),
  availableSeats: initialGroupClasses.reduce((s, c) => s + Math.max(0, c.maxStudents - c.studentsEnrolled), 0),
  revenue: initialGroupClasses.reduce((s, c) => s + c.revenue, 0),
  get commission() {
    return Math.round(this.revenue * 0.2);
  },
  get tutorEarnings() {
    return this.revenue - this.commission;
  },
  averageRating:
    Math.round(
      (initialGroupClasses.filter((c) => c.rating > 0).reduce((s, c) => s + c.rating, 0) /
        Math.max(1, initialGroupClasses.filter((c) => c.rating > 0).length)) *
        100
    ) / 100,
  averageAttendance: Math.round(
    initialGroupClasses.filter((c) => c.studentsEnrolled > 0).reduce((s, c) => s + c.attendance.avgAttendancePct, 0) /
      Math.max(1, initialGroupClasses.filter((c) => c.studentsEnrolled > 0).length)
  ),
  completionRate: Math.round(
    (initialGroupClasses.filter((c) => c.status === "Completed").length /
      Math.max(1, initialGroupClasses.filter((c) => ["Completed", "Cancelled"].includes(c.status)).length)) *
      100
  ),
};

// ---------------------------------------------------------------------------
// Live classroom oversight (Group Classes > Live Now > Join / Observe)
// ---------------------------------------------------------------------------

export type StudentConnectionState = "Connected" | "Camera Off" | "Muted" | "Poor Connection" | "Disconnected" | "Joined Late";

export interface LiveStudentStatus {
  id: string;
  name: string;
  image: string;
  connection: StudentConnectionState;
  camOn: boolean;
  micOn: boolean;
  joinedAt: string;
}

export interface SessionTimelineEvent {
  time: string;
  label: string;
}

export interface LiveClassroomState {
  tutorConnection: "Excellent" | "Good" | "Poor" | "Disconnected";
  sessionStartedAt: string;
  students: LiveStudentStatus[];
}

export const studentConnectionStyles: Record<StudentConnectionState, string> = {
  Connected: "bg-emerald-100 text-emerald-700",
  "Camera Off": "bg-slate-100 text-slate-600",
  Muted: "bg-amber-100 text-amber-700",
  "Poor Connection": "bg-orange-100 text-orange-700",
  Disconnected: "bg-rose-100 text-rose-700",
  "Joined Late": "bg-blue-100 text-blue-700",
};

// A deterministic (not random) rotation of connection states so the demo is
// stable across renders/reloads for the same class — every 7th student is
// disconnected, every 5th has poor connection, etc., rather than being
// hand-authored per class.
const connectionCycle: StudentConnectionState[] = [
  "Connected",
  "Connected",
  "Connected",
  "Camera Off",
  "Connected",
  "Muted",
  "Disconnected",
  "Connected",
  "Poor Connection",
  "Joined Late",
];

export function buildLiveClassroomState(row: GroupClassRow): LiveClassroomState {
  const roster = row.students.slice(0, row.studentsEnrolled);
  const liveStudents: LiveStudentStatus[] = roster.map((s, i) => {
    const connection = connectionCycle[i % connectionCycle.length];
    return {
      id: s.id,
      name: s.name,
      image: s.image,
      connection,
      camOn: connection !== "Camera Off" && connection !== "Disconnected",
      micOn: connection !== "Muted" && connection !== "Disconnected",
      joinedAt: connection === "Joined Late" ? "10:14 AM" : "10:00 AM",
    };
  });

  return {
    tutorConnection: row.classroom.connectionQuality === "Fair" ? "Poor" : row.classroom.connectionQuality,
    sessionStartedAt: "10:00 AM",
    students: liveStudents,
  };
}

export function buildSessionTimeline(row: GroupClassRow, liveState: LiveClassroomState): SessionTimelineEvent[] {
  const lateStudents = liveState.students.filter((s) => s.connection === "Joined Late");
  const disconnected = liveState.students.filter((s) => s.connection === "Disconnected");
  return [
    { time: "10:00", label: "Class started" },
    ...(row.classroom.whiteboardActive ? [{ time: "10:04", label: "Whiteboard activated" }] : []),
    ...lateStudents.map((s, i) => ({ time: `10:1${4 + i}`, label: `${s.name} joined late` })),
    ...disconnected.map((s, i) => ({ time: `10:2${8 + i}`, label: `${s.name} lost connection` })),
  ];
}

// A short, class-scoped chat seed (tutor + first couple of real enrolled
// students) so the admin Join view's chat panel reflects the actual class
// being joined instead of an unrelated hardcoded demo thread.
export interface AdminClassroomChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export function buildClassroomChatSeed(row: GroupClassRow): AdminClassroomChatMessage[] {
  const [first, second] = row.students;
  return [
    { id: "cc-1", sender: row.tutor, text: `Welcome everyone! Let's get started with today's ${row.subject} session.`, time: "10:01 AM" },
    ...(first ? [{ id: "cc-2", sender: first.name, text: "Good morning!", time: "10:01 AM" }] : []),
    ...(second ? [{ id: "cc-3", sender: second.name, text: "Can you repost the link to today's slides?", time: "10:03 AM" }] : []),
  ];
}

// ---------------------------------------------------------------------------
// Admin <-> Tutor private messaging (Live Now > Msg Tutor) — separate from
// the classroom chat above, which students can see.
// ---------------------------------------------------------------------------

export interface AdminTutorMessage {
  id: string;
  sender: "admin" | "tutor";
  text: string;
  time: string;
}

export function defaultAdminTutorThread(tutorFirstName: string): AdminTutorMessage[] {
  return [
    { id: "at-1", sender: "tutor", text: `Hi! ${tutorFirstName} here, the class is running smoothly so far, no issues.`, time: "9:58 AM" },
  ];
}
