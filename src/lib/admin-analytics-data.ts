// Admin -> Analytics. A decision-making dashboard, not a BI system: how many
// people are signing up, who they are, and where they're from. Platform-scale
// totals (thousands of users) can't be literally computed from this app's
// small curated demo casts, so — consistent with counsellingDashboardStats,
// groupClassStats and admin-bookings-data.ts's own pendingApproval pattern —
// the big aggregate numbers are a curated stand-in for a mature platform,
// while sub-widgets that already have a real computed source (Counselling,
// Group Classes) read from those directly instead of duplicating them here.

export type AnalyticsRange = "7d" | "30d" | "90d";

export interface AnalyticsOverview {
  totalSignups: number;
  totalSignupsDeltaPct: number;
  students: number;
  studentsDeltaPct: number;
  tutors: number;
  tutorsDeltaPct: number;
  newThisWeek: number;
  newThisWeekDeltaPct: number;
  newThisMonth: number;
  newThisMonthDeltaPct: number;
}

export interface SignupActivityRow {
  label: string;
  students: number;
  tutors: number;
}

export interface AnalyticsRangeData {
  overview: AnalyticsOverview;
  signupActivity: SignupActivityRow[];
  signupActivityGranularity: "Daily" | "Weekly";
}

export const analyticsRangeLabels: Record<AnalyticsRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

export const analyticsDataByRange: Record<AnalyticsRange, AnalyticsRangeData> = {
  "30d": {
    overview: {
      totalSignups: 1367,
      totalSignupsDeltaPct: 12,
      students: 1240,
      studentsDeltaPct: 10,
      tutors: 127,
      tutorsDeltaPct: 18,
      newThisWeek: 48,
      newThisWeekDeltaPct: 8,
      newThisMonth: 186,
      newThisMonthDeltaPct: 14,
    },
    signupActivity: [
      { label: "Today", students: 15, tutors: 3 },
      { label: "Aug 26, 2026", students: 12, tutors: 2 },
      { label: "Aug 25, 2026", students: 9, tutors: 1 },
      { label: "Aug 24, 2026", students: 18, tutors: 2 },
      { label: "Aug 23, 2026", students: 11, tutors: 1 },
      { label: "Aug 22, 2026", students: 8, tutors: 1 },
      { label: "Aug 21, 2026", students: 7, tutors: 0 },
    ],
    signupActivityGranularity: "Daily",
  },
  "7d": {
    overview: {
      totalSignups: 90,
      totalSignupsDeltaPct: 6,
      students: 79,
      studentsDeltaPct: 5,
      tutors: 11,
      tutorsDeltaPct: 10,
      newThisWeek: 90,
      newThisWeekDeltaPct: 8,
      newThisMonth: 186,
      newThisMonthDeltaPct: 14,
    },
    signupActivity: [
      { label: "Today", students: 15, tutors: 3 },
      { label: "Aug 26, 2026", students: 12, tutors: 2 },
      { label: "Aug 25, 2026", students: 9, tutors: 1 },
      { label: "Aug 24, 2026", students: 18, tutors: 2 },
      { label: "Aug 23, 2026", students: 11, tutors: 1 },
      { label: "Aug 22, 2026", students: 8, tutors: 1 },
      { label: "Aug 21, 2026", students: 7, tutors: 0 },
    ],
    signupActivityGranularity: "Daily",
  },
  "90d": {
    overview: {
      totalSignups: 3820,
      totalSignupsDeltaPct: 22,
      students: 3460,
      studentsDeltaPct: 19,
      tutors: 360,
      tutorsDeltaPct: 27,
      newThisWeek: 48,
      newThisWeekDeltaPct: 8,
      newThisMonth: 186,
      newThisMonthDeltaPct: 14,
    },
    // 3-month view aggregates by week rather than ~90 tiny daily rows.
    signupActivity: [
      { label: "Week of Aug 24", students: 90, tutors: 12 },
      { label: "Week of Aug 17", students: 84, tutors: 9 },
      { label: "Week of Aug 10", students: 76, tutors: 10 },
      { label: "Week of Aug 3", students: 71, tutors: 8 },
      { label: "Week of Jul 27", students: 68, tutors: 7 },
      { label: "Week of Jul 20", students: 64, tutors: 6 },
    ],
    signupActivityGranularity: "Weekly",
  },
};

export interface UserStatusRow {
  status: string;
  count: number;
  pct: number;
  tone: "success" | "warning" | "danger" | "muted";
}

export const userStatusBreakdown: UserStatusRow[] = [
  { status: "Active", count: 1288, pct: 90.0, tone: "success" },
  { status: "Pending", count: 47, pct: 3.2, tone: "warning" },
  { status: "Restricted", count: 22, pct: 1.5, tone: "danger" },
  { status: "Banned", count: 10, pct: 0.7, tone: "muted" },
];

export interface PlatformActivityRow {
  label: string;
  thisWeek: number;
  thisMonth: number;
}

export const platformActivityRows: PlatformActivityRow[] = [
  { label: "New Students", thisWeek: 42, thisMonth: 165 },
  { label: "New Tutors", thisWeek: 6, thisMonth: 21 },
  { label: "Tutor Verification Requests", thisWeek: 8, thisMonth: 27 },
  { label: "Group Classes Submitted", thisWeek: 5, thisMonth: 18 },
  { label: "Group Classes Approved", thisWeek: 4, thisMonth: 15 },
  { label: "Private Bookings", thisWeek: 31, thisMonth: 126 },
  { label: "Group Class Enrollments", thisWeek: 24, thisMonth: 91 },
  { label: "Counselling Sessions Booked", thisWeek: 7, thisMonth: 29 },
];

export type AnalyticsUserType = "All Users" | "Students" | "Tutors";

export interface CountryRow {
  country: string;
  flag: string;
  users: number;
  pct: number;
}

export const countriesBreakdown: CountryRow[] = [
  { country: "Nigeria", flag: "🇳🇬", users: 1240, pct: 90.6 },
  { country: "Ghana", flag: "🇬🇭", users: 85, pct: 6.2 },
  { country: "United Kingdom", flag: "🇬🇧", users: 42, pct: 3.1 },
  { country: "United States", flag: "🇺🇸", users: 31, pct: 2.3 },
  { country: "Others", flag: "🌍", users: 9, pct: 0.8 },
];

// Regions per country — only Nigeria needs to be rich to match the approved
// design; the rest are small plausible breakdowns so the country selector is
// genuinely functional rather than only working for one option.
export const statesByCountry: Record<string, { name: string; users: number }[]> = {
  Nigeria: [
    { name: "Lagos", users: 420 },
    { name: "Abuja", users: 180 },
    { name: "Rivers", users: 95 },
    { name: "Oyo", users: 72 },
    { name: "Enugu", users: 61 },
  ],
  Ghana: [
    { name: "Greater Accra", users: 52 },
    { name: "Ashanti", users: 18 },
    { name: "Western", users: 15 },
  ],
  "United Kingdom": [
    { name: "London", users: 24 },
    { name: "Manchester", users: 10 },
    { name: "Birmingham", users: 8 },
  ],
  "United States": [
    { name: "New York", users: 12 },
    { name: "California", users: 9 },
    { name: "Texas", users: 10 },
  ],
  Others: [],
};

// Rough share of each user type within the platform total, used to scale the
// location breakdown when the "Students" / "Tutors" filter is applied
// (there's no separately-modelled per-type location dataset at this scale).
export const userTypeShare: Record<Exclude<AnalyticsUserType, "All Users">, number> = {
  Students: 1240 / 1367,
  Tutors: 127 / 1367,
};

export interface RecentSignupRow {
  name: string;
  image: string;
  type: "Student" | "Tutor";
  location: string;
  joinedAgo: string;
}

// Real personas already used elsewhere in this app (admin-counselling-data,
// tutorListings) rather than inventing new fake names.
export const recentSignups: RecentSignupRow[] = [
  { name: "Cynthia Ejie", image: "/teacher-4.jpg.png", type: "Student", location: "Lagos, Nigeria", joinedAgo: "10 min ago" },
  { name: "Tunde Adebayo", image: "/teacher-1.jpg.png", type: "Tutor", location: "Lagos, Nigeria", joinedAgo: "25 min ago" },
  { name: "Amaka N.", image: "/teacher-2.jpg.png", type: "Student", location: "Abuja, Nigeria", joinedAgo: "42 min ago" },
  { name: "David O.", image: "/teacher-1.jpg.png", type: "Tutor", location: "Ibadan, Nigeria", joinedAgo: "1 hour ago" },
  { name: "Joshua A.", image: "/teacher-3.jpg.png", type: "Student", location: "Port Harcourt, Nigeria", joinedAgo: "2 hours ago" },
];
