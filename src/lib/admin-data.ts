// "Warning" and "UnderReview" can be set automatically by the moderation
// engine (moderation-store.ts) as well as by an admin; "Restricted" and
// "Suspended" always carry a real expiration (see account-status-store.ts)
// — "Restricted" blocks new bookings only, "Suspended" additionally removes
// the tutor from public search/discovery. "Banned" is permanent removal.
export type AdminTutorStatus = "Active" | "Warning" | "UnderReview" | "Restricted" | "Suspended" | "Banned";
// "Resubmission Required" is a real, distinct verification outcome (the
// admin asked the tutor to fix/re-upload something) — separate from
// "Pending" (never yet reviewed). Added here rather than reusing Pending so
// the two real workflows (first review vs. re-review after a fix request)
// don't collapse into one status.
export type AdminVerificationStatus = "Verified" | "Pending" | "Rejected" | "Resubmission Required";

export interface AdminTutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  status: AdminTutorStatus;
  verification: AdminVerificationStatus;
  rating: number;
  reviews: number;
  lessonsCompleted: number;
  earnings: number;
  joined: string;
  suspendReason?: string;
  banReason?: string;
  // Set when verification is "Rejected" or "Resubmission Required" — the
  // admin's own explanation, shown back to the tutor.
  verificationNote?: string;
  resubmissionFields?: string[];
}

export const adminTutorStatusStyles: Record<AdminTutorStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  UnderReview: "bg-orange-100 text-orange-700",
  Restricted: "bg-orange-100 text-orange-700",
  Suspended: "bg-rose-100 text-rose-700",
  Banned: "bg-rose-200 text-rose-800",
};

export const adminVerificationStyles: Record<AdminVerificationStatus, string> = {
  Verified: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Resubmission Required": "bg-amber-100 text-amber-700",
};

export const rejectionReasons = [
  "Documents invalid",
  "Qualification insufficient",
  "Identity could not be verified",
  "Information inconsistent",
  "Other",
];

export const resubmissionFieldOptions = ["Government ID", "Academic Certificate", "Teaching Qualification", "Profile Information", "Other"];

export const suspendReasons = [
  "Multiple student complaints",
  "Missed scheduled lessons",
  "Payment / withdrawal irregularity",
  "Verification documents under review",
  "Other",
];

export const banReasons = [
  "Fraudulent activity",
  "Fake credentials",
  "Inappropriate conduct",
  "Repeated policy violations",
  "Other",
];

export const initialAdminTutors: AdminTutor[] = [
  { id: "t-1", name: "Adaeze Okonkwo", email: "adaeze.o@example.com", subjects: ["Mathematics", "Physics"], status: "Active", verification: "Verified", rating: 4.98, reviews: 215, lessonsCompleted: 342, earnings: 2450000, joined: "January 2021" },
  { id: "t-2", name: "Michael Adewale", email: "michael.a@example.com", subjects: ["Chemistry", "Biology"], status: "Active", verification: "Verified", rating: 4.92, reviews: 189, lessonsCompleted: 286, earnings: 1980000, joined: "March 2021" },
  { id: "t-3", name: "John Emmanuel", email: "john.e@example.com", subjects: ["English", "Literature"], status: "Suspended", verification: "Verified", rating: 4.7, reviews: 98, lessonsCompleted: 120, earnings: 680000, joined: "June 2021", suspendReason: "Multiple student complaints" },
  { id: "t-4", name: "Blessing Nwosu", email: "blessing.n@example.com", subjects: ["French", "English"], status: "Banned", verification: "Rejected", rating: 0, reviews: 0, lessonsCompleted: 0, earnings: 0, joined: "August 2020", banReason: "Fake credentials" },
  { id: "t-5", name: "Tunde Adebayo", email: "tunde.a@example.com", subjects: ["Mathematics"], status: "Active", verification: "Verified", rating: 4.9, reviews: 320, lessonsCompleted: 410, earnings: 3120000, joined: "January 2021" },
  { id: "t-6", name: "Zainab Yusuf", email: "zainab.y@example.com", subjects: ["Biology"], status: "Active", verification: "Pending", rating: 4.8, reviews: 153, lessonsCompleted: 201, earnings: 1450000, joined: "February 2022" },
  { id: "t-7", name: "Faruk Musa", email: "faruk.m@example.com", subjects: ["Mathematics"], status: "Active", verification: "Resubmission Required", rating: 4.7, reviews: 98, lessonsCompleted: 88, earnings: 520000, joined: "October 2022", verificationNote: "Please upload a clearer copy of your teaching qualification.", resubmissionFields: ["Teaching Qualification"] },
  { id: "t-8", name: "Ibrahim Suleiman", email: "ibrahim.s@example.com", subjects: ["Biology"], status: "Suspended", verification: "Verified", rating: 4.6, reviews: 64, lessonsCompleted: 70, earnings: 310000, joined: "March 2023", suspendReason: "Missed scheduled lessons" },
];

export const platformStats = {
  totalUsers: 12458,
  totalUsersDelta: 12.5,
  totalTutors: 2356,
  totalTutorsDelta: 8.3,
  totalStudents: 10102,
  totalStudentsDelta: 14.6,
  activeLessonsToday: 432,
  activeLessonsTodayDelta: 9.2,
  groupClassesToday: 18,
  groupClassesTodayDelta: 5.6,
  // legacy aliases kept for existing consumers (admin-ai-insights.ts, admin-analytics-client.tsx)
  activeTutors: 2356,
  activeTutorsDelta: 8.3,
  activeStudents: 10102,
  activeStudentsDelta: 14.6,
  lessonsCompleted: 432,
  lessonsCompletedDelta: 9.2,
  revenueThisMonth: 24560850,
  revenueDelta: 18.7,
  revenueLastMonth: 19345200,
  totalRevenueAllTime: 205245600,
  totalRefunds: 5215650,
  amountInEscrow: 8234500,
  escrowDelta: 0,
  pendingWithdrawals: 3456200,
  pendingWithdrawalsDelta: 6.1,
  pendingVerifications: 34,
  pendingVerificationsDelta: -4,
  activeDisputes: 7,
  activeDisputesDelta: -2,
};

export const revenueTrend = [8.2, 9.5, 11.8, 10.6, 13.2, 15.4, 14.1, 16.8, 18.9, 17.5, 20.1, 22.4, 24.56, 21.8, 23.6, 26.2, 28.4, 27.1, 29.8];

export const revenueSplit = [
  { label: "Private Lessons", pct: 65, color: "#F80248" },
  { label: "Group Classes", pct: 20, color: "#3B82F6" },
  { label: "Counselling", pct: 10, color: "#8B5CF6" },
  { label: "Other", pct: 5, color: "#94A3B8" },
];

export interface AdminBooking {
  id: string;
  name: string;
  studentImage: string;
  subject: string;
  date: string;
  type: "Private Lesson" | "Group Class" | "Counselling";
  amount: number;
}

export const recentBookings: AdminBooking[] = [
  { id: "bk-1", name: "Sarah Johnson", studentImage: "/teacher-4.jpg.png", subject: "Mathematics", date: "May 26, 10:00 AM", type: "Private Lesson", amount: 5000 },
  { id: "bk-2", name: "David Okonkwo", studentImage: "/teacher-1.jpg.png", subject: "Physics", date: "May 26, 2:00 PM", type: "Private Lesson", amount: 6000 },
  { id: "bk-3", name: "French Beginners Group", studentImage: "/teacher-3.jpg.png", subject: "May 27, 4:00 PM · 10 students", date: "", type: "Group Class", amount: 10000 },
  { id: "bk-4", name: "Chemistry WAEC Class", studentImage: "/teacher-2.jpg.png", subject: "May 28, 6:00 PM · 12 students", date: "", type: "Group Class", amount: 12000 },
  { id: "bk-5", name: "Career Guidance Session", studentImage: "/teacher-4.jpg.png", subject: "May 29, 11:00 AM", date: "", type: "Counselling", amount: 0 },
];

export const adminBookingTypeStyles: Record<AdminBooking["type"], string> = {
  "Private Lesson": "bg-ensena-primary/10 text-ensena-primary",
  "Group Class": "bg-blue-100 text-blue-700",
  Counselling: "bg-amber-100 text-amber-700",
};

export interface SystemAlert {
  id: string;
  label: string;
  detail: string;
  tone: "warning" | "danger" | "info" | "success";
}

export const systemAlerts: SystemAlert[] = [
  { id: "al-1", label: "18 tutors pending verification", detail: "Requires your review", tone: "warning" },
  { id: "al-2", label: "12 tutors flagged", detail: "For review or action", tone: "danger" },
  { id: "al-3", label: "7 pending payouts", detail: "Awaiting release", tone: "info" },
  { id: "al-4", label: "3 open disputes", detail: "Require your attention", tone: "warning" },
  { id: "al-5", label: "System health", detail: "All systems operational", tone: "success" },
];

export const topSubjects = [
  { label: "Mathematics", count: 1245, color: "#F80248" },
  { label: "English", count: 980, color: "#3B82F6" },
  { label: "Physics", count: 654, color: "#8B5CF6" },
  { label: "Chemistry", count: 432, color: "#F59E0B" },
  { label: "Biology", count: 321, color: "#22C55E" },
];

export const userManagementShortcuts = [
  { label: "Tutors", count: 1243, href: "/admin/tutors" },
  { label: "Students", count: 18452, href: "/admin/students" },
  { label: "Counsellors", count: 4, href: "/admin/counsellors" },
  { label: "Banned Users", count: 23, href: "/admin/tutors" },
];

// ---------- Students ----------

// Same ladder as AdminTutorStatus — see the matching comment above it.
export type AdminStudentStatus = "Active" | "Warning" | "UnderReview" | "Restricted" | "Suspended" | "Banned";

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  level: string;
  status: AdminStudentStatus;
  lessonsCompleted: number;
  totalSpent: number;
  joined: string;
}

export const adminStudentStatusStyles: Record<AdminStudentStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  UnderReview: "bg-orange-100 text-orange-700",
  Restricted: "bg-orange-100 text-orange-700",
  Suspended: "bg-rose-100 text-rose-700",
  Banned: "bg-rose-200 text-rose-800",
};

export const initialAdminStudents: AdminStudent[] = [
  { id: "s-1", name: "Cynthia Ejie", email: "cynthia.e@example.com", level: "WAEC", status: "Active", lessonsCompleted: 42, totalSpent: 168000, joined: "January 2024" },
  { id: "s-2", name: "Sarah Johnson", email: "sarah.j@example.com", level: "Mathematics · WAEC", status: "Active", lessonsCompleted: 28, totalSpent: 112000, joined: "March 2024" },
  { id: "s-3", name: "David Okonkwo", email: "david.o@example.com", level: "JAMB/UTME", status: "Active", lessonsCompleted: 35, totalSpent: 140000, joined: "February 2024" },
  { id: "s-4", name: "Grace Emmanuel", email: "grace.e@example.com", level: "JAMB/UTME", status: "Suspended", lessonsCompleted: 12, totalSpent: 48000, joined: "April 2024" },
  { id: "s-5", name: "Peter Obi", email: "peter.o@example.com", level: "University", status: "Active", lessonsCompleted: 19, totalSpent: 95000, joined: "May 2024" },
  { id: "s-6", name: "Hannah Bassey", email: "hannah.b@example.com", level: "WAEC", status: "Active", lessonsCompleted: 8, totalSpent: 32000, joined: "June 2024" },
  { id: "s-7", name: "Chidera Nwosu", email: "chidera.n@example.com", level: "Secondary", status: "Banned", lessonsCompleted: 3, totalSpent: 9000, joined: "January 2024" },
];

// ---------- Counsellors ----------

export type AdminCounsellorStatus = "Active" | "Pending" | "Suspended";

export interface AdminCounsellor {
  id: string;
  name: string;
  email: string;
  status: AdminCounsellorStatus;
  studentsHelped: number;
  rating: number;
  sessionsThisMonth: number;
  joined: string;
}

export const adminCounsellorStatusStyles: Record<AdminCounsellorStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Suspended: "bg-rose-100 text-rose-700",
};

export const initialAdminCounsellors: AdminCounsellor[] = [
  { id: "c-1", name: "Cynthia Ejie", email: "cynthia.e@ensena.co", status: "Active", studentsHelped: 96, rating: 4.98, sessionsThisMonth: 42, joined: "January 2021" },
  { id: "c-2", name: "Amaka Chukwu", email: "amaka.c@ensena.co", status: "Pending", studentsHelped: 0, rating: 0, sessionsThisMonth: 0, joined: "June 2024" },
  { id: "c-3", name: "Yusuf Bello", email: "yusuf.b@ensena.co", status: "Active", studentsHelped: 54, rating: 4.85, sessionsThisMonth: 21, joined: "March 2023" },
];

// ---------- Group Classes (platform-wide) ----------

export type AdminGroupClassStatus = "Live" | "Submitted" | "Completed" | "Cancelled";

export interface AdminGroupClassRow {
  id: string;
  title: string;
  tutor: string;
  subject: string;
  seatsFilled: number;
  seatsTotal: number;
  status: AdminGroupClassStatus;
  revenue: number;
  schedule: string;
}

export const adminGroupClassStatusStyles: Record<AdminGroupClassStatus, string> = {
  Live: "bg-emerald-100 text-emerald-700",
  Submitted: "bg-amber-100 text-amber-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

export const initialAdminGroupClasses: AdminGroupClassRow[] = [
  { id: "gc-1", title: "French Conversation for Beginners", tutor: "David Martin", subject: "French", seatsFilled: 8, seatsTotal: 10, status: "Live", revenue: 96000, schedule: "Mon, Wed · 6:00 PM" },
  { id: "gc-2", title: "WAEC Revision Bootcamp", tutor: "Adaeze Okonkwo", subject: "Mathematics", seatsFilled: 6, seatsTotal: 12, status: "Submitted", revenue: 72000, schedule: "Tue, Thu, Sat · 8:00 AM" },
  { id: "gc-3", title: "JAMB Physics Crash Class", tutor: "Michael Adewale", subject: "Physics", seatsFilled: 12, seatsTotal: 12, status: "Live", revenue: 144000, schedule: "Daily · 5:00 PM" },
  { id: "gc-4", title: "Primary English Club", tutor: "Fatima Abdullahi", subject: "English", seatsFilled: 5, seatsTotal: 15, status: "Completed", revenue: 45000, schedule: "Sat · 10:00 AM" },
  { id: "gc-5", title: "Chemistry WAEC Class", tutor: "Zainab Yusuf", subject: "Chemistry", seatsFilled: 0, seatsTotal: 10, status: "Cancelled", revenue: 0, schedule: "Fri · 4:00 PM" },
];

// ---------- Payments ----------

export type PaymentMethod = "Paystack" | "Flutterwave" | "Wallet";
export type PaymentType = "Payment" | "Refund" | "Platform Fee" | "Payout";
export type PaymentStatus = "Successful" | "Pending" | "Failed";

export interface AdminTransaction {
  id: string;
  user: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  status: PaymentStatus;
  date: string;
}

export const paymentStatusStyles: Record<PaymentStatus, string> = {
  Successful: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Failed: "bg-rose-100 text-rose-700",
};

export const initialAdminTransactions: AdminTransaction[] = [
  { id: "pay-1", user: "Sarah Johnson", amount: 5000, method: "Paystack", type: "Payment", status: "Successful", date: "May 26, 2024" },
  { id: "pay-2", user: "David Okonkwo", amount: 6000, method: "Flutterwave", type: "Payment", status: "Successful", date: "May 26, 2024" },
  { id: "pay-3", user: "Adaeze Okonkwo", amount: 3120000, method: "Wallet", type: "Payout", status: "Pending", date: "May 25, 2024" },
  { id: "pay-4", user: "Tunde Fashola", amount: 2250, method: "Paystack", type: "Refund", status: "Successful", date: "May 21, 2024" },
  { id: "pay-5", user: "Ensena Platform", amount: 3684000, method: "Wallet", type: "Platform Fee", status: "Successful", date: "May 24, 2024" },
  { id: "pay-6", user: "Grace Adamu", amount: 4500, method: "Flutterwave", type: "Payment", status: "Failed", date: "May 18, 2024" },
];

// ---------- Withdrawals ----------

export type WithdrawalStatus = "Pending" | "Approved" | "Rejected" | "Held";

export interface AdminWithdrawal {
  id: string;
  tutor: string;
  amount: number;
  method: string;
  status: WithdrawalStatus;
  requestedDate: string;
}

export const withdrawalStatusStyles: Record<WithdrawalStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Held: "bg-blue-100 text-blue-700",
};

export const initialAdminWithdrawals: AdminWithdrawal[] = [
  { id: "wd-1", tutor: "Adaeze Okonkwo", amount: 450000, method: "Bank Transfer: GTBank", status: "Pending", requestedDate: "May 25, 2024" },
  { id: "wd-2", tutor: "Tunde Adebayo", amount: 620000, method: "Bank Transfer: Access Bank", status: "Pending", requestedDate: "May 24, 2024" },
  { id: "wd-3", tutor: "Michael Adewale", amount: 310000, method: "Bank Transfer: Zenith Bank", status: "Approved", requestedDate: "May 20, 2024" },
  { id: "wd-4", tutor: "John Emmanuel", amount: 180000, method: "Bank Transfer: UBA", status: "Held", requestedDate: "May 19, 2024" },
  { id: "wd-5", tutor: "Ibrahim Suleiman", amount: 95000, method: "Bank Transfer: GTBank", status: "Rejected", requestedDate: "May 15, 2024" },
];

// ---------- Announcements ----------

export type AnnouncementChannel = "Push Notification" | "Email" | "Banner";
export type AnnouncementStatus = "Draft" | "Scheduled" | "Sent";

export interface AdminAnnouncement {
  id: string;
  title: string;
  channel: AnnouncementChannel;
  audience: string;
  scheduledFor: string;
  status: AnnouncementStatus;
}

export const announcementStatusStyles: Record<AnnouncementStatus, string> = {
  Draft: "bg-ensena-bg-soft text-ensena-muted",
  Scheduled: "bg-amber-100 text-amber-700",
  Sent: "bg-emerald-100 text-emerald-700",
};

export const initialAdminAnnouncements: AdminAnnouncement[] = [
  { id: "an-1", title: "WAEC Revision Bootcamp: 20% off this week", channel: "Push Notification", audience: "All Students", scheduledFor: "May 27, 2024 · 9:00 AM", status: "Scheduled" },
  { id: "an-2", title: "New commission structure for tutors", channel: "Email", audience: "All Tutors", scheduledFor: "May 22, 2024 · 8:00 AM", status: "Sent" },
  { id: "an-3", title: "Platform maintenance this weekend", channel: "Banner", audience: "Everyone", scheduledFor: "May 30, 2024 · 12:00 AM", status: "Draft" },
];

// ---------- Support Tickets ----------

export type TicketChannel = "Live Chat" | "Email";
export type TicketPriority = "Low" | "Medium" | "High";
export type TicketStatus = "Open" | "Pending" | "Resolved";

export interface AdminSupportTicket {
  id: string;
  user: string;
  subject: string;
  channel: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  updated: string;
}

export const ticketStatusStyles: Record<TicketStatus, string> = {
  Open: "bg-rose-100 text-rose-700",
  Pending: "bg-amber-100 text-amber-700",
  Resolved: "bg-emerald-100 text-emerald-700",
};

export const ticketPriorityStyles: Record<TicketPriority, string> = {
  Low: "bg-ensena-bg-soft text-ensena-muted",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

export const initialAdminTickets: AdminSupportTicket[] = [
  { id: "tk-1", user: "Sarah Johnson", subject: "Payment charged twice for one lesson", channel: "Live Chat", priority: "High", status: "Open", updated: "10 mins ago" },
  { id: "tk-2", user: "Michael Adewale", subject: "Can't withdraw earnings", channel: "Email", priority: "High", status: "Open", updated: "1 hour ago" },
  { id: "tk-3", user: "Grace Emmanuel", subject: "How do I change my subject preferences?", channel: "Email", priority: "Low", status: "Pending", updated: "3 hours ago" },
  { id: "tk-4", user: "Ibrahim Suleiman", subject: "Verification documents rejected. Why?", channel: "Live Chat", priority: "Medium", status: "Resolved", updated: "Yesterday" },
];

// ---------- Content Management ----------

export const contentFaqs = [
  "How do I book a private lesson?",
  "How does the 15% Ensena commission work?",
  "What happens if my tutor cancels?",
  "How do I become a verified tutor?",
];

export const contentSubjects = ["Mathematics", "English Language", "Physics", "Chemistry", "Biology", "French", "Government", "Literature", "Further Mathematics"];

export const contentAcademicLevels = ["Primary", "Secondary", "WAEC/NECO", "JAMB/UTME", "University"];

export const contentBanners = [
  { title: "Find the Perfect Academic Support for Every Level", active: true },
  { title: "WAEC Revision Bootcamp: Enroll Now", active: true },
  { title: "Become a Tutor: Earn on Your Schedule", active: false },
];
