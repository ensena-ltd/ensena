import { initialAdminCounsellors, initialAdminStudents, initialAdminTutors } from "@/lib/admin-data";
import { teacherPhotos } from "@/lib/data";

export type PlatformUserRole = "Student" | "Tutor" | "Counsellor" | "Admin";
export type PlatformUserStatus = "Active" | "Suspended" | "Banned" | "Pending Verification" | "Deleted";

export interface ActivityEntry {
  time: string;
  action: string;
}

export interface LoginEvent {
  time: string;
  device: string;
  location: string;
  result: "Success" | "Failed";
}

export interface PlatformUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  role: PlatformUserRole;
  status: PlatformUserStatus;
  restrictReason?: string;
  banReason?: string;
  verified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  dob: string;
  country: string;
  state: string;
  academicLevel?: string;
  joined: string;
  lastLogin: string;
  lastDevice: string;
  lastIp: string;
  isOnline: boolean;
  totalBookings: number;
  totalLessons: number;
  totalPayments: number;
  totalRefunds: number;
  walletBalance: number;
  escrowBalance: number;
  pendingWithdrawal: number;
  pendingPayments: number;
  reviewsCount: number;
  avgRating: number;
  filesUploaded: number;
  activity: ActivityEntry[];
  loginHistory: LoginEvent[];
  adminNotes: string[];
  aiSummary: string;
}

export const platformUserStatusStyles: Record<PlatformUserStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Suspended: "bg-amber-100 text-amber-700",
  Banned: "bg-rose-100 text-rose-700",
  "Pending Verification": "bg-blue-100 text-blue-700",
  Deleted: "bg-ensena-bg-soft text-ensena-muted",
};

// The public-facing label for "Suspended" is "Restricted" (temporary/limited
// access, distinct from a full "Banned" block) — a display-only relabel, the
// underlying PlatformUserStatus stays "Suspended" so every other admin page
// that reads this status keeps working unchanged.
export const platformUserStatusLabel: Record<PlatformUserStatus, string> = {
  Active: "Active",
  Suspended: "Restricted",
  Banned: "Banned",
  "Pending Verification": "Pending",
  Deleted: "Deleted",
};

export const platformUserStatusDot: Record<PlatformUserStatus, string> = {
  Active: "bg-emerald-500",
  Suspended: "bg-orange-500",
  Banned: "bg-rose-500",
  "Pending Verification": "bg-amber-500",
  Deleted: "bg-slate-400",
};

const nigerianStates = ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Enugu", "Kaduna"];

function mockActivity(role: PlatformUserRole): ActivityEntry[] {
  const base: ActivityEntry[] = [
    { time: "2 hours ago", action: "Logged in from Chrome on Windows" },
    { time: "1 day ago", action: role === "Tutor" ? "Completed a lesson" : role === "Student" ? "Booked a lesson" : "Viewed dashboard" },
    { time: "3 days ago", action: "Updated profile information" },
  ];
  if (role === "Tutor") base.splice(1, 0, { time: "5 hours ago", action: "Requested a withdrawal" });
  if (role === "Student") base.splice(1, 0, { time: "6 hours ago", action: "Left a review for a tutor" });
  return base;
}

function mockLoginHistory(state: string): LoginEvent[] {
  return [
    { time: "2 hours ago", device: "Chrome · Windows", location: state, result: "Success" },
    { time: "Yesterday", device: "Android App", location: state, result: "Success" },
    { time: "3 days ago", device: "Chrome · Windows", location: state, result: "Success" },
    { time: "5 days ago", device: "Safari · iPhone", location: state, result: "Failed" },
  ];
}

function aiSummaryFor(role: PlatformUserRole, avgRating: number): string {
  if (role === "Tutor") {
    return avgRating >= 4.9
      ? "Consistently starts lessons on time. Student satisfaction is high. Recommend featuring on homepage."
      : avgRating > 0
        ? "Attendance and punctuality are solid, but rating has room to improve. Monitor over the next few weeks."
        : "Not enough completed lessons yet to generate a reliable teaching score.";
  }
  if (role === "Student") {
    return "Has attended most recent lessons and shows steady subject progress. Risk of churn: Low.";
  }
  if (role === "Counsellor") {
    return "Maintains a healthy session completion rate with positive student feedback.";
  }
  return "Platform administrator account.";
}

function photoFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % teacherPhotos.length;
  return teacherPhotos[hash];
}

function toPlatformUser(partial: {
  id: string;
  name: string;
  email: string;
  role: PlatformUserRole;
  status: PlatformUserStatus;
  restrictReason?: string;
  banReason?: string;
  verified: boolean;
  joined: string;
  academicLevel?: string;
  totalBookings?: number;
  totalLessons?: number;
  totalPayments?: number;
  totalRefunds?: number;
  walletBalance?: number;
  escrowBalance?: number;
  pendingWithdrawal?: number;
  pendingPayments?: number;
  reviewsCount?: number;
  avgRating?: number;
  isOnline?: boolean;
}): PlatformUser {
  const stateIdx = partial.name.length % nigerianStates.length;
  const state = nigerianStates[stateIdx];
  return {
    id: partial.id,
    username: partial.email.split("@")[0],
    name: partial.name,
    email: partial.email,
    phone: `+234 8${(1000000 + partial.name.length * 137).toString().slice(0, 9)}`,
    image: photoFor(partial.id),
    role: partial.role,
    status: partial.status,
    restrictReason: partial.restrictReason,
    banReason: partial.banReason,
    verified: partial.verified,
    emailVerified: true,
    phoneVerified: partial.verified,
    twoFactorEnabled: partial.role === "Admin" || partial.role === "Tutor",
    dob: "March 14, 1998",
    country: "Nigeria",
    state,
    academicLevel: partial.academicLevel,
    joined: partial.joined,
    lastLogin: "2 hours ago",
    lastDevice: "Chrome · Windows 11",
    lastIp: `102.89.${(partial.name.length * 7) % 255}.${(partial.name.length * 13) % 255}`,
    isOnline: partial.isOnline ?? false,
    totalBookings: partial.totalBookings ?? 0,
    totalLessons: partial.totalLessons ?? 0,
    totalPayments: partial.totalPayments ?? 0,
    totalRefunds: partial.totalRefunds ?? 0,
    walletBalance: partial.walletBalance ?? 0,
    escrowBalance: partial.escrowBalance ?? 0,
    pendingWithdrawal: partial.pendingWithdrawal ?? 0,
    pendingPayments: partial.pendingPayments ?? 0,
    reviewsCount: partial.reviewsCount ?? 0,
    avgRating: partial.avgRating ?? 0,
    filesUploaded: partial.role === "Tutor" ? 4 : 1,
    activity: mockActivity(partial.role),
    loginHistory: mockLoginHistory(state),
    adminNotes: partial.role === "Tutor" && (partial.avgRating ?? 0) >= 4.95 ? ["High-performing tutor: consider for homepage feature."] : [],
    aiSummary: aiSummaryFor(partial.role, partial.avgRating ?? 0),
  };
}

function tutorStatusToUserStatus(status: string, verification: string): PlatformUserStatus {
  if (status === "Banned") return "Banned";
  if (status === "Suspended") return "Suspended";
  if (verification === "Pending" || verification === "Resubmission Required") return "Pending Verification";
  return "Active";
}

export const platformUsers: PlatformUser[] = [
  ...initialAdminTutors.map((t, i) =>
    toPlatformUser({
      id: `usr-${t.id}`,
      name: t.name,
      email: t.email,
      role: "Tutor",
      status: tutorStatusToUserStatus(t.status, t.verification),
      restrictReason: t.suspendReason,
      banReason: t.banReason,
      verified: t.verification === "Verified",
      joined: t.joined,
      totalBookings: t.lessonsCompleted,
      totalLessons: t.lessonsCompleted,
      totalPayments: t.earnings,
      walletBalance: Math.round(t.earnings * 0.08),
      escrowBalance: Math.round(t.earnings * 0.02),
      pendingWithdrawal: t.status === "Active" ? Math.round(t.earnings * 0.015) : 0,
      reviewsCount: t.reviews,
      avgRating: t.rating,
      isOnline: i === 0,
    })
  ),
  ...initialAdminStudents.map((s) =>
    toPlatformUser({
      id: `usr-${s.id}`,
      name: s.name,
      email: s.email,
      role: "Student",
      status: s.status === "Banned" ? "Banned" : s.status === "Suspended" ? "Suspended" : "Active",
      verified: true,
      joined: s.joined,
      academicLevel: s.level,
      totalBookings: s.lessonsCompleted,
      totalLessons: s.lessonsCompleted,
      totalPayments: s.totalSpent,
      totalRefunds: s.status === "Banned" ? 9000 : 0,
      walletBalance: Math.round(s.totalSpent * 0.03),
      pendingPayments: s.status === "Active" ? 8000 : 0,
    })
  ),
  ...initialAdminCounsellors.map((c) =>
    toPlatformUser({
      id: `usr-${c.id}`,
      name: c.name,
      email: c.email,
      role: "Counsellor",
      status: c.status === "Suspended" ? "Suspended" : c.status === "Pending" ? "Pending Verification" : "Active",
      verified: c.status !== "Pending",
      joined: c.joined,
      totalBookings: c.sessionsThisMonth,
      totalLessons: c.sessionsThisMonth,
      reviewsCount: c.studentsHelped,
      avgRating: c.rating,
    })
  ),
  toPlatformUser({
    id: "usr-admin-1",
    name: "Cynthia Ejie",
    email: "ensenahq@gmail.com",
    role: "Admin",
    status: "Active",
    verified: true,
    joined: "January 2021",
    isOnline: true,
  }),
];
