export const counsellorSidebarNavItems = [
  { label: "Dashboard", href: "/counsellor-dashboard" },
  { label: "Appointments", href: "/counsellor-dashboard/appointments" },
  { label: "Students", href: "/counsellor-dashboard/students" },
  { label: "Intake Forms", href: "/counsellor-dashboard/intake-forms" },
  { label: "Action Plans", href: "/counsellor-dashboard/action-plans" },
  { label: "Messages", href: "/counsellor-dashboard/messages", badge: 8 },
  { label: "Resources", href: "/counsellor-dashboard/resources" },
  { label: "Reports", href: "/counsellor-dashboard/reports" },
  { label: "Feedback", href: "/counsellor-dashboard/feedback" },
  { label: "Profile", href: "/counsellor-dashboard/profile" },
  { label: "Settings", href: "/counsellor-dashboard/settings" },
  { label: "Help Center", href: "/counsellor-dashboard/help" },
];

export const counsellorProfile = {
  name: "Cynthia Ejie",
  role: "Counsellor Dashboard",
  image: "/teacher-2.jpg.png",
};

export interface CounsellorSession {
  id: string;
  time: string;
  student: string;
  studentImage: string;
  level: string;
  reason: string;
  sessionType: "Video Call" | "Phone Call";
  status: "Upcoming" | "Completed";
}

export const todaysSchedule: CounsellorSession[] = [
  { id: "cs-1", time: "10:00 AM", student: "David Okonkwo", studentImage: "/teacher-1.jpg.png", level: "SS3", reason: "JAMB Preparation", sessionType: "Video Call", status: "Upcoming" },
  { id: "cs-2", time: "12:00 PM", student: "Sarah Johnson", studentImage: "/teacher-4.jpg.png", level: "WAEC", reason: "Study Motivation", sessionType: "Phone Call", status: "Upcoming" },
  { id: "cs-3", time: "2:00 PM", student: "Michael Adewale", studentImage: "/teacher-3.jpg.png", level: "University", reason: "Career Guidance", sessionType: "Video Call", status: "Upcoming" },
  { id: "cs-4", time: "4:00 PM", student: "Grace Emmanuel", studentImage: "/teacher-2.jpg.png", level: "JAMB", reason: "Study Plan Review", sessionType: "Video Call", status: "Upcoming" },
];

export interface AppointmentRequest {
  id: string;
  student: string;
  studentImage: string;
  level: string;
  reason: string;
  requestedDate: string;
}

export const appointmentRequests: AppointmentRequest[] = [
  { id: "ar-1", student: "Chidera Nwosu", studentImage: "/teacher-1.jpg.png", level: "SS2", reason: "Academic Performance", requestedDate: "May 28, 2024 · 10:30 AM" },
  { id: "ar-2", student: "Hannah Bassey", studentImage: "/teacher-4.jpg.png", level: "WAEC", reason: "Study Plan", requestedDate: "May 28, 2024 · 11:00 AM" },
  { id: "ar-3", student: "Peter Obi", studentImage: "/teacher-3.jpg.png", level: "University", reason: "Career Guidance", requestedDate: "May 28, 2024 · 2:00 PM" },
];

export const studentLevelBreakdown = [
  { label: "JAMB/UTME", value: 38, color: "#6C63FF" },
  { label: "WAEC/NECO", value: 24, color: "#F5A623" },
  { label: "Secondary", value: 18, color: "#1FA971" },
  { label: "University", value: 12, color: "#F80248" },
  { label: "Other", value: 4, color: "#94A3B8" },
];

export interface RecentMessage {
  id: string;
  student: string;
  studentImage: string;
  preview: string;
  time: string;
  unread?: number;
}

export const recentCounsellorMessages: RecentMessage[] = [
  { id: "rm-1", student: "David Okonkwo", studentImage: "/teacher-1.jpg.png", preview: "Thank you for the study tips...", time: "10:25 AM", unread: 2 },
  { id: "rm-2", student: "Sarah Johnson", studentImage: "/teacher-4.jpg.png", preview: "I have a question about our next...", time: "Yesterday", unread: 1 },
  { id: "rm-3", student: "Michael Adewale", studentImage: "/teacher-3.jpg.png", preview: "Can we reschedule tomorrow's s...", time: "Yesterday" },
  { id: "rm-4", student: "Grace Emmanuel", studentImage: "/teacher-2.jpg.png", preview: "I've completed the assignments...", time: "May 26" },
];

export const upcomingFollowUps = [
  { student: "Chidera Nwosu", date: "May 30, 10:00 AM" },
  { student: "Hannah Bassey", date: "May 30, 1:00 PM" },
  { student: "Peter Obi", date: "May 31, 11:00 AM" },
];

export const topConcernsThisMonth = [
  { label: "Lack of Motivation", value: 28 },
  { label: "Time Management", value: 24 },
  { label: "Exam Anxiety", value: 19 },
  { label: "Subject Difficulties", value: 15 },
];

export const actionPlansOverview = {
  progressPct: 68,
  inProgress: 65,
  totalStudents: 96,
  completedThisWeek: 12,
  overdue: 8,
  updatesNeeded: 15,
  noPlanYet: 11,
};
