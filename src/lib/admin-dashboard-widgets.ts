export const bookingsOverview = {
  total: 634,
  segments: [
    { label: "Upcoming", count: 244, pct: 38, color: "#F80248" },
    { label: "Completed", count: 298, pct: 47, color: "#3B82F6" },
    { label: "Cancelled", count: 62, pct: 10, color: "#8B5CF6" },
    { label: "Disputed", count: 30, pct: 5, color: "#F59E0B" },
  ],
};

export const platformOverview = {
  serverStatus: "Operational",
  liveLessons: 128,
  onlineTutors: 1256,
  onlineStudents: 3652,
};

export type ActivityTone = "success" | "info" | "purple" | "pink" | "gray";

export interface RecentActivityItem {
  id: string;
  tone: ActivityTone;
  title: string;
  detail: string;
  time: string;
}

export const recentActivity: RecentActivityItem[] = [
  { id: "act-1", tone: "success", title: "Tutor verification approved", detail: "Sarah Johnson was approved as a tutor", time: "2m ago" },
  { id: "act-2", tone: "info", title: "New booking", detail: "Private lesson booked with John Doe", time: "10m ago" },
  { id: "act-3", tone: "purple", title: "Payment received", detail: "₦12,000 from Daniel Adewale", time: "25m ago" },
  { id: "act-4", tone: "pink", title: "Group class approved", detail: "WAEC Mathematics Intensive by Mr. Tunde", time: "1h ago" },
  { id: "act-5", tone: "gray", title: "New support ticket", detail: "Issue with lesson playback", time: "2h ago" },
];

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  tint: "pink" | "blue" | "purple" | "plain";
}

export const dashboardQuickActions: QuickAction[] = [
  { id: "qa-1", label: "Approve Tutor", href: "/admin/tutors", tint: "pink" },
  { id: "qa-2", label: "Approve Group Class", href: "/admin/group-classes", tint: "blue" },
  { id: "qa-3", label: "Release Escrow", href: "/admin/lesson-confirmations", tint: "purple" },
  { id: "qa-4", label: "Send Announcement", href: "/admin/announcements", tint: "pink" },
  { id: "qa-5", label: "Create Coupon", href: "/admin/promotions", tint: "blue" },
  { id: "qa-6", label: "View Reports", href: "/admin/analytics", tint: "plain" },
];

// ---------------------------------------------------------------------------
// Simplified Dashboard home (control-centre overview) — a leaner summary
// than the widgets above, which stay in place for the sections that still
// use them. These are hand-authored platform-level aggregates in the same
// spirit as platformStats/bookingsOverview/topSubjects above, not tied to
// any single bookable record.
// ---------------------------------------------------------------------------

export const overviewCards = {
  students: { total: 6842, newThisMonth: 342, deltaPct: 18.6, spark: [520, 540, 560, 545, 580, 600, 590, 620, 610, 642] },
  tutors: { total: 1256, newThisMonth: 78, deltaPct: 12.4, spark: [92, 98, 95, 104, 110, 106, 116, 120, 118, 125] },
};

export interface PendingActionItem {
  label: string;
  count: number;
  href: string;
  tone: "rose" | "orange" | "amber" | "blue";
  actionLabel: string;
}

export const pendingActionsOverview = {
  total: 24,
  items: [
    { label: "Tutor Verifications", count: 12, href: "/admin/verification", tone: "rose", actionLabel: "Review Now" },
    { label: "Group Class Approvals", count: 6, href: "/admin/group-classes", tone: "orange", actionLabel: "Review Now" },
    { label: "Pending Accounts", count: 4, href: "/admin/users?tab=Pending%20Verification", tone: "amber", actionLabel: "Review Now" },
    { label: "Counselling Appointments", count: 2, href: "/admin/counsellors", tone: "blue", actionLabel: "View Appointments" },
  ] satisfies PendingActionItem[],
};

export const dashboardBookingsOverview = {
  total: 1534,
  segments: [
    { label: "Upcoming", count: 412, color: "#3B82F6" },
    { label: "Completed", count: 1021, color: "#22C55E" },
    { label: "Cancelled", count: 101, color: "#F43F5E" },
  ],
};

// Daily Students vs Tutors signup trend for the current month.
export const userGrowthTrend = {
  labels: ["1 Aug", "6 Aug", "11 Aug", "16 Aug", "21 Aug", "24 Aug"],
  students: [520, 560, 540, 600, 580, 650, 630, 700, 680, 750, 720, 800, 780, 860, 830, 900, 880, 960, 940, 1020, 1080, 1150, 1280, 1420],
  tutors: [180, 200, 190, 220, 210, 250, 240, 270, 260, 300, 290, 330, 320, 360, 350, 400, 390, 430, 420, 470, 520, 580, 650, 780],
};

export const userDistributionTotal = 8098;

export const userDistributionByCountry = [
  { label: "Nigeria", count: 7024, pct: 86.7, color: "#F80248" },
  { label: "Ghana", count: 412, pct: 5.1, color: "#8B5CF6" },
  { label: "United States", count: 198, pct: 2.4, color: "#F59E0B" },
  { label: "United Kingdom", count: 186, pct: 2.3, color: "#3B82F6" },
  { label: "Others", count: 278, pct: 3.4, color: "#94A3B8" },
];

// Nigeria-only breakdown for the "By State" tab — states sum to the
// Nigeria total above (7,024), with an "Other States" bucket for the rest.
export const userDistributionByState = [
  { label: "Lagos", count: 420, pct: 6.0, color: "#F80248" },
  { label: "Abuja (FCT)", count: 180, pct: 2.6, color: "#8B5CF6" },
  { label: "Rivers", count: 95, pct: 1.4, color: "#F59E0B" },
  { label: "Oyo", count: 72, pct: 1.0, color: "#3B82F6" },
  { label: "Other States", count: 6257, pct: 89.0, color: "#94A3B8" },
];

export interface DashboardActivityItem {
  id: string;
  tone: ActivityTone;
  title: string;
  detail: string;
  time: string;
}

export const dashboardRecentActivity: DashboardActivityItem[] = [
  { id: "dact-1", tone: "pink", title: "New tutor verification submitted", detail: "Tunde Adebayo submitted documents", time: "10 mins ago" },
  { id: "dact-2", tone: "purple", title: "New student registered", detail: "SSS2 · Lagos State", time: "20 mins ago" },
  { id: "dact-3", tone: "info", title: "Group class submitted for approval", detail: "WAEC Mathematics Prep by Tunde Adebayo", time: "35 mins ago" },
  { id: "dact-4", tone: "gray", title: "Counselling appointment booked", detail: "Student · Tomorrow, 4:00 PM", time: "1 hour ago" },
  { id: "dact-5", tone: "success", title: "Tutor account approved", detail: "Ibrahim K. is now a verified tutor", time: "2 hours ago" },
];
