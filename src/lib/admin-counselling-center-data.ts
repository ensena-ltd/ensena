export interface AiCounsellingRecommendation {
  id: string;
  student: string;
  image: string;
  priority: "High" | "Medium" | "Low";
  level: string;
  subject: string;
  reason: string;
  recommendedAction: string;
}

export const aiCounsellingRecommendations: AiCounsellingRecommendation[] = [
  { id: "air-1", student: "Sarah Johnson", image: "/teacher-4.jpg.png", priority: "High", level: "WAEC", subject: "Mathematics", reason: "Attendance dropped from 95% to 70% in the last 2 weeks.", recommendedAction: "Academic Counselling" },
  { id: "air-2", student: "David Okoro", image: "/teacher-1.jpg.png", priority: "Medium", level: "JAMB", subject: "Physics", reason: "Changed tutors 3 times in the last month.", recommendedAction: "Study Plan Review" },
  { id: "air-3", student: "Mary Bello", image: "/teacher-2.jpg.png", priority: "Medium", level: "SS 2", subject: "English Language", reason: "Homework completion is 31% this month.", recommendedAction: "Motivation & Study Habits" },
  { id: "air-4", student: "James Obi", image: "/teacher-3.jpg.png", priority: "High", level: "WAEC", subject: "Mathematics", reason: "Likely to fail WAEC Mathematics on current trajectory.", recommendedAction: "Intensive Tutoring Plan" },
];

export type RequestPriority = "High" | "Medium" | "Low";
export type RequestCallType = "Video" | "Phone" | "Message";

export interface CounsellingRequest {
  id: string;
  student: string;
  image: string;
  level: string;
  reason: string;
  callType: RequestCallType;
  preferredTime: string;
  submitted: string;
  priority: RequestPriority;
}

export const requestPriorityStyles: Record<RequestPriority, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

export const initialCounsellingRequests: CounsellingRequest[] = [
  { id: "req-1", student: "Chidera Eze", image: "/teacher-1.jpg.png", level: "JAMB", reason: "Struggling with Maths", callType: "Video", preferredTime: "Today, 4:00 PM", submitted: "2 hours ago", priority: "High" },
  { id: "req-2", student: "Victoria Obi", image: "/teacher-4.jpg.png", level: "WAEC", reason: "Exam Preparation", callType: "Video", preferredTime: "Tomorrow, 10:00 AM", submitted: "5 hours ago", priority: "High" },
  { id: "req-3", student: "Ibrahim Bello", image: "/teacher-3.jpg.png", level: "SS 3", reason: "Subjects Combination", callType: "Phone", preferredTime: "May 26, 11:00 AM", submitted: "Yesterday", priority: "Medium" },
  { id: "req-4", student: "Grace Williams", image: "/teacher-2.jpg.png", level: "University", reason: "Career Guidance", callType: "Video", preferredTime: "May 27, 2:00 PM", submitted: "Yesterday", priority: "Low" },
  { id: "req-5", student: "Daniel Brown", image: "/teacher-1.jpg.png", level: "SS 2", reason: "Study Habits", callType: "Message", preferredTime: "May 27, 4:30 PM", submitted: "2 days ago", priority: "Low" },
];

export type CaseStatus = "Active" | "Monitoring" | "Improved" | "Closed";
export type RiskLevel = "High" | "Medium" | "Low";

export interface TimelineStep {
  label: string;
  done: boolean;
}

export interface CounsellingSessionRecord {
  date: string;
  duration: string;
  type: RequestCallType;
  notes: string;
  outcome: string;
}

export interface ActionPlanItem {
  task: string;
  status: "Completed" | "Pending" | "Overdue";
}

export interface OutcomeSnapshot {
  attendanceBefore: number;
  attendanceAfter: number;
  homeworkBefore: number;
  homeworkAfter: number;
  scoreBefore: number;
  scoreAfter: number;
  outcome: string;
}

export interface AiIntakeSummary {
  examTrack: string;
  weakSubject: string;
  dreamCourse: string;
  budget: string;
  tutorPreference: string;
  learningStyle: string;
  motivation: "High" | "Medium" | "Low";
  confidence: number;
}

export interface StudentCase {
  id: string;
  student: string;
  image: string;
  level: string;
  primaryGoal: string;
  lastSession: string;
  nextSession: string;
  aiScore: number;
  risk: RiskLevel;
  status: CaseStatus;
  subjects: string[];
  attendancePct: number;
  homeworkPct: number;
  timeline: TimelineStep[];
  history: CounsellingSessionRecord[];
  privateNotes: string[];
  actionPlan: ActionPlanItem[];
  outcome?: OutcomeSnapshot;
  intake?: AiIntakeSummary;
}

export const riskStyles: Record<RiskLevel, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

export const caseStatusStyles: Record<CaseStatus, string> = {
  Active: "bg-blue-100 text-blue-700",
  Monitoring: "bg-amber-100 text-amber-700",
  Improved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-ensena-bg-soft text-ensena-muted",
};

export const initialStudentCases: StudentCase[] = [
  {
    id: "case-1", student: "Sarah Johnson", image: "/teacher-4.jpg.png", level: "WAEC", primaryGoal: "Pass WAEC with Excellent Grades",
    lastSession: "May 19, 2024", nextSession: "May 25, 2024", aiScore: 91, risk: "High", status: "Active",
    subjects: ["Mathematics", "English"], attendancePct: 70, homeworkPct: 65,
    timeline: [
      { label: "Created Account", done: true }, { label: "Booked Mathematics Tutor", done: true },
      { label: "Attendance Dropped", done: true }, { label: "Recommendation Generated", done: true },
      { label: "Counselling Booked", done: true }, { label: "Action Plan Created", done: false },
      { label: "Improvement", done: false }, { label: "Case Closed", done: false },
    ],
    history: [
      { date: "May 19, 2024", duration: "30 mins", type: "Video", notes: "Discussed drop in attendance; identified transport issues.", outcome: "Follow-up scheduled" },
      { date: "May 5, 2024", duration: "25 mins", type: "Video", notes: "Initial intake: goal setting for WAEC.", outcome: "Action plan created" },
    ],
    privateNotes: ["Student lacks confidence in Mathematics.", "Needs weekly accountability check-ins.", "Parent is supportive and responsive."],
    actionPlan: [
      { task: "Complete Mathematics homework", status: "Pending" },
      { task: "Attend every Physics class", status: "Overdue" },
      { task: "Meet counsellor again in 2 weeks", status: "Pending" },
    ],
    outcome: { attendanceBefore: 62, attendanceAfter: 95, homeworkBefore: 58, homeworkAfter: 92, scoreBefore: 44, scoreAfter: 81, outcome: "Highly Successful" },
    intake: { examTrack: "WAEC Student", weakSubject: "Mathematics", dreamCourse: "Medicine", budget: "₦25,000/month", tutorPreference: "Prefers Female Tutor", learningStyle: "Learns Visually", motivation: "High", confidence: 6 },
  },
  {
    id: "case-2", student: "David Okoro", image: "/teacher-1.jpg.png", level: "JAMB", primaryGoal: "Get 280+ in JAMB",
    lastSession: "May 18, 2024", nextSession: "May 28, 2024", aiScore: 88, risk: "Medium", status: "Monitoring",
    subjects: ["Physics", "Mathematics"], attendancePct: 84, homeworkPct: 80,
    timeline: [
      { label: "Created Account", done: true }, { label: "Booked Physics Tutor", done: true },
      { label: "Changed Tutor 3x", done: true }, { label: "Recommendation Generated", done: true },
      { label: "Counselling Booked", done: true }, { label: "Action Plan Created", done: true },
      { label: "Improvement", done: false }, { label: "Case Closed", done: false },
    ],
    history: [{ date: "May 18, 2024", duration: "20 mins", type: "Phone", notes: "Discussed tutor fit and study plan adjustments.", outcome: "Reassigned to a new tutor" }],
    privateNotes: ["Prefers a more structured, exam-focused teaching style."],
    actionPlan: [
      { task: "Trial lesson with new Physics tutor", status: "Completed" },
      { task: "Weekly past-question practice", status: "Pending" },
    ],
  },
  {
    id: "case-3", student: "Mary Bello", image: "/teacher-2.jpg.png", level: "SS 2", primaryGoal: "Improve English & Confidence",
    lastSession: "May 17, 2024", nextSession: "May 24, 2024", aiScore: 82, risk: "Medium", status: "Active",
    subjects: ["English Language"], attendancePct: 90, homeworkPct: 31,
    timeline: [
      { label: "Created Account", done: true }, { label: "Booked English Tutor", done: true },
      { label: "Homework Completion Dropped", done: true }, { label: "Recommendation Generated", done: true },
      { label: "Counselling Booked", done: true }, { label: "Action Plan Created", done: false },
      { label: "Improvement", done: false }, { label: "Case Closed", done: false },
    ],
    history: [{ date: "May 17, 2024", duration: "30 mins", type: "Video", notes: "Motivational session: set small weekly goals.", outcome: "Follow-up scheduled" }],
    privateNotes: ["Highly capable but low confidence in writing tasks."],
    actionPlan: [{ task: "Submit 1 essay per week", status: "Pending" }],
  },
  {
    id: "case-4", student: "Chinedu Eze", image: "/teacher-1.jpg.png", level: "JAMB", primaryGoal: "Understand Maths Concepts",
    lastSession: "May 16, 2024", nextSession: "May 27, 2024", aiScore: 67, risk: "High", status: "Active",
    subjects: ["Mathematics"], attendancePct: 58, homeworkPct: 40,
    timeline: [
      { label: "Created Account", done: true }, { label: "Booked Mathematics Tutor", done: true },
      { label: "Missed Multiple Lessons", done: true }, { label: "Recommendation Generated", done: true },
      { label: "Counselling Booked", done: false }, { label: "Action Plan Created", done: false },
      { label: "Improvement", done: false }, { label: "Case Closed", done: false },
    ],
    history: [],
    privateNotes: [],
    actionPlan: [],
  },
  {
    id: "case-5", student: "Ibrahim Bello", image: "/teacher-3.jpg.png", level: "SS 3", primaryGoal: "Subjects Combination Help",
    lastSession: "May 15, 2024", nextSession: "May 26, 2024", aiScore: 78, risk: "Low", status: "Improved",
    subjects: ["Government", "Literature"], attendancePct: 96, homeworkPct: 88,
    timeline: [
      { label: "Created Account", done: true }, { label: "Booked Counselling", done: true },
      { label: "Career Guidance Session", done: true }, { label: "Action Plan Created", done: true },
      { label: "Improvement", done: true }, { label: "Case Closed", done: false },
    ],
    history: [{ date: "May 15, 2024", duration: "30 mins", type: "Video", notes: "Reviewed university subject combinations for Law.", outcome: "Plan finalized" }],
    privateNotes: ["Interested in Law. Recommend WAEC Government & Literature focus."],
    actionPlan: [{ task: "Confirm subject combination with school", status: "Completed" }],
  },
];

export interface ScheduleSession {
  id: string;
  time: string;
  duration: string;
  student: string;
  image: string;
  level: string;
  subject: string;
  callType: RequestCallType;
}

export const todaysCounsellingSchedule: ScheduleSession[] = [
  { id: "sch-1", time: "10:00 AM", duration: "30m", student: "John Emmanuel", image: "/teacher-1.jpg.png", level: "WAEC", subject: "Mathematics", callType: "Video" },
  { id: "sch-2", time: "11:30 AM", duration: "45m", student: "Fatima Bello", image: "/teacher-4.jpg.png", level: "JAMB", subject: "Chemistry", callType: "Video" },
  { id: "sch-3", time: "2:00 PM", duration: "60m", student: "Sarah Johnson", image: "/teacher-4.jpg.png", level: "WAEC", subject: "Mathematics", callType: "Video" },
  { id: "sch-4", time: "3:30 PM", duration: "30m", student: "David Okoro", image: "/teacher-1.jpg.png", level: "JAMB", subject: "Physics", callType: "Phone" },
  { id: "sch-5", time: "5:00 PM", duration: "30m", student: "Mercy Afolabi", image: "/teacher-2.jpg.png", level: "SS 2", subject: "English", callType: "Video" },
];

export interface FollowUpDue {
  id: string;
  student: string;
  image: string;
  topic: string;
  due: string;
  urgency: "Due Tomorrow" | "Due in 2 days" | "Due in 3 days" | "Due in 5 days" | "Overdue";
}

export const followUpsDue: FollowUpDue[] = [
  { id: "fu-1", student: "Chidera Eze", image: "/teacher-1.jpg.png", topic: "Follow-up on Study Plan", due: "Tomorrow", urgency: "Due Tomorrow" },
  { id: "fu-2", student: "Mary Bello", image: "/teacher-2.jpg.png", topic: "Motivation Check-in", due: "2 days", urgency: "Due in 2 days" },
  { id: "fu-3", student: "Daniel Brown", image: "/teacher-1.jpg.png", topic: "Review Homework Progress", due: "3 days", urgency: "Due in 3 days" },
  { id: "fu-4", student: "Grace Williams", image: "/teacher-2.jpg.png", topic: "Career Path Discussion", due: "5 days", urgency: "Due in 5 days" },
];

export const upcomingFollowUpsThisWeek = [
  { student: "Sarah Johnson", image: "/teacher-4.jpg.png", date: "May 25, 2024 · 10:00 AM", tag: "Follow-up", level: "WAEC · Mathematics" },
  { student: "David Okoro", image: "/teacher-1.jpg.png", date: "May 26, 2024 · 2:00 PM", tag: "Follow-up", level: "JAMB · Physics" },
  { student: "Mercy Afolabi", image: "/teacher-2.jpg.png", date: "May 28, 2024 · 11:00 AM", tag: "Check-in", level: "SS 2 · English" },
];

export const counsellingResources = [
  { title: "WAEC Preparation Guide", type: "PDF", size: "2.4 MB", category: "WAEC Tips" },
  { title: "Study Plan Template", type: "PDF", size: "1.1 MB", category: "Study Planners" },
  { title: "Time Management Tips", type: "PDF", size: "1.6 MB", category: "Time Management" },
  { title: "Exam Anxiety Guide", type: "PDF", size: "1.3 MB", category: "Exam Anxiety" },
  { title: "JAMB Score Booster Guide", type: "PDF", size: "2.1 MB", category: "JAMB Guides" },
  { title: "Weekly Study Timetable", type: "PDF", size: "0.8 MB", category: "Study Planners" },
  { title: "Staying Motivated: Video", type: "Video", size: "12 min", category: "Motivation" },
  { title: "Choosing a University Course", type: "PDF", size: "1.9 MB", category: "University Advice" },
  { title: "Careers in STEM Guide", type: "PDF", size: "2.6 MB", category: "Career Guides" },
];

export const counsellingCenterStats = {
  todaysSessions: todaysCounsellingSchedule.length,
  upcomingSessions: 6,
  pendingRequests: initialCounsellingRequests.length + 7,
  followUpsDue: followUpsDue.length + 8,
  highPriorityAi: aiCounsellingRecommendations.filter((r) => r.priority === "High").length + 6,
  completedThisMonth: 82,
  avgSatisfaction: 4.95,
  noShows: 3,
};

export interface AvailabilityDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export const initialAvailability: AvailabilityDay[] = [
  { day: "Monday", enabled: true, start: "4:00 PM", end: "7:00 PM" },
  { day: "Tuesday", enabled: true, start: "4:00 PM", end: "7:00 PM" },
  { day: "Wednesday", enabled: false, start: "9:00 AM", end: "5:00 PM" },
  { day: "Thursday", enabled: true, start: "4:00 PM", end: "7:00 PM" },
  { day: "Friday", enabled: true, start: "4:00 PM", end: "6:00 PM" },
  { day: "Saturday", enabled: true, start: "10:00 AM", end: "2:00 PM" },
  { day: "Sunday", enabled: false, start: "9:00 AM", end: "5:00 PM" },
];

export interface BlockedDate {
  date: string;
  reason: string;
  allDay: boolean;
  startTime?: string; // 12h display, e.g. "9:00 AM" — only set when allDay is false
  endTime?: string;
}

export const initialBlockedDates: BlockedDate[] = [
  { date: "2026-08-31", reason: "Unavailable", allDay: true },
];

// A one-off override for a specific date, on top of the normal weekly
// schedule above — e.g. Benny opening up a Saturday she doesn't usually
// work. Applies instead of (not in addition to) that date's weekly hours.
export interface SpecialAvailabilityDate {
  date: string;
  start: string; // 12h display, matching AvailabilityDay's convention
  end: string;
}

export const initialSpecialAvailability: SpecialAvailabilityDate[] = [
  { date: "2026-09-05", start: "10:00 AM", end: "1:00 PM" },
];

export interface CounsellorSessionSettings {
  sessionType: "Video Call";
  durationMinutes: number;
  cost: "Free";
  minimumBookingNoticeHours: number;
  maxSessionsPerDay: number;
  // Captured as a real preference but not yet enforced as a scheduling
  // buffer — see the note on getDaySlots in counsellor-data.ts.
  allowBackToBack: boolean;
}

export const initialCounsellorSessionSettings: CounsellorSessionSettings = {
  sessionType: "Video Call",
  durationMinutes: 30,
  cost: "Free",
  minimumBookingNoticeHours: 2,
  maxSessionsPerDay: 6,
  allowBackToBack: false,
};

export const weeklyCalendar = [
  { day: "Mon", date: "May 20", sessions: [{ time: "10:00 AM", student: "John Emmanuel", type: "Video" as RequestCallType }] },
  { day: "Tue", date: "May 21", sessions: [{ time: "2:00 PM", student: "Fatima Bello", type: "Video" as RequestCallType }, { time: "4:00 PM", student: "Chidera Eze", type: "Video" as RequestCallType }] },
  { day: "Wed", date: "May 22", sessions: [] },
  { day: "Thu", date: "May 23", sessions: [{ time: "11:00 AM", student: "Ibrahim Bello", type: "Phone" as RequestCallType }] },
  { day: "Fri", date: "May 24", sessions: [{ time: "10:00 AM", student: "Sarah Johnson", type: "Video" as RequestCallType }, { time: "2:00 PM", student: "Grace Williams", type: "Video" as RequestCallType }] },
  { day: "Sat", date: "May 25", sessions: [{ time: "10:00 AM", student: "Sarah Johnson", type: "Video" as RequestCallType }] },
  { day: "Sun", date: "May 26", sessions: [] },
];

function keywordMatch(query: string, words: string[]) {
  const q = query.toLowerCase();
  return words.some((w) => q.includes(w));
}

export function answerCounsellorQuestion(query: string): string {
  const q = query.toLowerCase();

  if (keywordMatch(q, ["most at risk", "at risk", "risk level"])) {
    const highRisk = initialStudentCases.filter((c) => c.risk === "High");
    if (highRisk.length === 0) return "No students are currently flagged as High risk.";
    return `${highRisk.length} students are High risk: ${highRisk.map((c) => `${c.student} (Risk Score ${c.aiScore}%, ${c.primaryGoal})`).join("; ")}.`;
  }

  if (keywordMatch(q, ["haven't attended", "havent attended", "missed", "this week"])) {
    const lowAttendance = initialStudentCases.filter((c) => c.attendancePct < 75);
    if (lowAttendance.length === 0) return "All active cases have attendance above 75% this week.";
    return `${lowAttendance.map((c) => `${c.student} (${c.attendancePct}% attendance)`).join(", ")} have low attendance this week. Worth a check-in.`;
  }

  if (keywordMatch(q, ["new tutor", "change tutor", "need a tutor", "tutor change"])) {
    return "David Okoro has changed tutors 3 times in the last month, flagged for a tutor-fit review. No other cases show frequent tutor changes right now.";
  }

  if (keywordMatch(q, ["recommend tutor", "tutor for sarah", "tutor for"])) {
    const nameMatch = initialStudentCases.find((c) => q.includes(c.student.split(" ")[0].toLowerCase()));
    if (nameMatch) {
      return `For ${nameMatch.student} (${nameMatch.subjects.join(", ")}): recommend Adaeze Okonkwo, Ensena's top-rated tutor in ${nameMatch.subjects[0]}, given the current focus on ${nameMatch.primaryGoal.toLowerCase()}.`;
    }
    return "Tell me which student, e.g. \"Recommend tutors for Sarah\", and I'll match them against subject strength and rating.";
  }

  if (keywordMatch(q, ["study plan for", "create a study plan"])) {
    const nameMatch = initialStudentCases.find((c) => q.includes(c.student.split(" ")[0].toLowerCase()));
    if (nameMatch) {
      return `Draft study plan for ${nameMatch.student}: focus on ${nameMatch.subjects[0]} twice weekly, 15-minute daily review, and a progress check-in at the next session on ${nameMatch.nextSession}.`;
    }
    return "Tell me which student, e.g. \"Create a study plan for James\", and I'll draft one from their case data.";
  }

  if (keywordMatch(q, ["summarize today", "today's sessions", "todays sessions", "summary of today"])) {
    if (todaysCounsellingSchedule.length === 0) return "No sessions are scheduled for today.";
    return `Today: ${todaysCounsellingSchedule.length} sessions: ${todaysCounsellingSchedule.map((s) => `${s.student} at ${s.time} (${s.subject})`).join("; ")}.`;
  }

  if (keywordMatch(q, ["no show", "no-show"])) {
    return `${counsellingCenterStats.noShows} no-shows recorded this month (${counsellingReports.noShowRatePct}% no-show rate).`;
  }

  return "I can help with risk levels, attendance gaps, tutor recommendations, study plans, and daily session summaries. Try \"Which students are most at risk?\" or \"Summarize today's counselling sessions.\"";
}

// ---------- Dashboard (v2) ----------

export const counsellingDashboardStats = {
  todaysAppointments: 8,
  upcomingThisWeek: 31,
  upcomingThisWeekDeltaPct: 22,
  pendingIntakeForms: 12,
  studentsUnderMonitoring: 84,
  studentsUnderMonitoringDelta: 8,
  highRiskStudents: 9,
  followUpsDueToday: 6,
  completedThisMonth: 132,
  completedThisMonthDeltaPct: 16,
  avgSatisfaction: 4.98,
  avgSatisfactionReviews: 246,
  avgImprovementPct: 18,
};

export type ActivityType = "booking" | "intake" | "action-plan" | "missed" | "improvement";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
}

export const recentStudentActivity: RecentActivity[] = [
  { id: "act-1", type: "booking", title: "New Appointment Booked", description: "Fatima Bello booked a session", time: "Yesterday, 8:45 PM" },
  { id: "act-2", type: "intake", title: "Intake Form Submitted", description: "Chinedu Eze submitted intake form", time: "Yesterday, 6:20 PM" },
  { id: "act-3", type: "action-plan", title: "Action Plan Updated", description: "Sarah Johnson completed 2 tasks", time: "Yesterday, 5:15 PM" },
  { id: "act-4", type: "missed", title: "Missed Appointment", description: "Daniel Brown missed appointment", time: "Yesterday, 4:30 PM" },
  { id: "act-5", type: "improvement", title: "Improvement Detected", description: "Mercy Afolabi improved in Mathematics", time: "Yesterday, 3:10 PM" },
];

// ---------- Appointments ----------

export type AppointmentStatus = "Confirmed" | "Upcoming" | "Completed" | "Rescheduled" | "Cancelled";

export const appointmentStatusStyles: Record<AppointmentStatus, string> = {
  Confirmed: "bg-blue-100 text-blue-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Rescheduled: "bg-amber-100 text-amber-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

export interface Appointment {
  id: string;
  student: string;
  image: string;
  level: string;
  reason: string;
  tag: string;
  tagColor: string;
  dateLabel: string;
  dateISO: string;
  time: string;
  duration: string;
  type: RequestCallType;
  status: AppointmentStatus;
  meetingLink?: string;
  notes: string;
  previousSessionSummary?: string;
  aiSummary?: string;
}

export const initialAppointments: Appointment[] = [
  { id: "apt-1", student: "Sarah Johnson", image: "/teacher-4.jpg.png", level: "WAEC · Grade 12", reason: "Choosing the right career path", tag: "Career Guidance", tagColor: "bg-blue-100 text-blue-700", dateLabel: "Today", dateISO: "2024-05-22", time: "9:00 AM", duration: "60 min", type: "Video", status: "Confirmed", meetingLink: "https://ensena.co/call/sj-0522", notes: "Wants to discuss Medicine vs Engineering track.", previousSessionSummary: "Discussed subject combination for university applications.", aiSummary: "Sarah's attendance dropped from 92% to 64% in the last 3 weeks. Recommend addressing motivation alongside career guidance." },
  { id: "apt-2", student: "James Bello", image: "/teacher-1.jpg.png", level: "JAMB · Grade 12", reason: "Building consistency", tag: "Study Motivation", tagColor: "bg-purple-100 text-purple-700", dateLabel: "Today", dateISO: "2024-05-22", time: "10:30 AM", duration: "45 min", type: "Video", status: "Confirmed", meetingLink: "https://ensena.co/call/jb-0522", notes: "Follow-up on last week's study schedule.", previousSessionSummary: "Set a daily 1-hour study goal.", aiSummary: "James has completed homework consistently for 2 weeks. Trending positive." },
  { id: "apt-3", student: "Grace Adebayo", image: "/teacher-2.jpg.png", level: "WAEC · Grade 11", reason: "Managing exam stress", tag: "Exam Anxiety", tagColor: "bg-amber-100 text-amber-700", dateLabel: "Today", dateISO: "2024-05-22", time: "2:00 PM", duration: "60 min", type: "Video", status: "Confirmed", meetingLink: "https://ensena.co/call/ga-0522", notes: "Second session on exam anxiety coping strategies.", previousSessionSummary: "Introduced breathing techniques and study-break structure.", aiSummary: "Grace reports feeling calmer before mock tests. Continue current plan." },
  { id: "apt-4", student: "David Okoro", image: "/teacher-1.jpg.png", level: "WAEC · Grade 12", reason: "Subject combination & strategy", tag: "WAEC Planning", tagColor: "bg-indigo-100 text-indigo-700", dateLabel: "Today", dateISO: "2024-05-22", time: "4:30 PM", duration: "45 min", type: "Video", status: "Confirmed", meetingLink: "https://ensena.co/call/do-0522", notes: "Review WAEC subject registration.", previousSessionSummary: "Discussed tutor reassignment after 3 tutor changes.", aiSummary: "David cancelled 4 lessons this month. Performance declining in Mathematics." },
  { id: "apt-5", student: "Mercy Afolabi", image: "/teacher-2.jpg.png", level: "SS 2", reason: "English confidence building", tag: "Study Motivation", tagColor: "bg-purple-100 text-purple-700", dateLabel: "Tomorrow", dateISO: "2024-05-23", time: "10:00 AM", duration: "30 min", type: "Video", status: "Upcoming", notes: "First follow-up since homework completion improved.", aiSummary: "Homework completion rose from 31% to 58% this month." },
  { id: "apt-6", student: "Ibrahim Bello", image: "/teacher-3.jpg.png", level: "SS 3", reason: "Subjects combination help", tag: "Career Guidance", tagColor: "bg-blue-100 text-blue-700", dateLabel: "Tomorrow", dateISO: "2024-05-23", time: "11:00 AM", duration: "30 min", type: "Phone", status: "Upcoming", notes: "Confirm subject combination with school." },
  { id: "apt-7", student: "Chidera Eze", image: "/teacher-1.jpg.png", level: "JAMB", reason: "Struggling with Maths", tag: "Academic Counselling", tagColor: "bg-rose-100 text-rose-700", dateLabel: "May 24, 2024", dateISO: "2024-05-24", time: "4:00 PM", duration: "45 min", type: "Video", status: "Upcoming", notes: "Intake form flagged high motivation but weak Mathematics foundation." },
  { id: "apt-8", student: "Fatima Bello", image: "/teacher-4.jpg.png", level: "JAMB", reason: "Time management", tag: "Study Motivation", tagColor: "bg-purple-100 text-purple-700", dateLabel: "May 20, 2024", dateISO: "2024-05-20", time: "3:00 PM", duration: "30 min", type: "Video", status: "Completed", notes: "Completed: set weekly planner routine.", aiSummary: "Session completed successfully. Student engaged well." },
  { id: "apt-9", student: "Tunde Fashola", image: "/teacher-3.jpg.png", level: "WAEC", reason: "Study plan review", tag: "Study Plan", tagColor: "bg-teal-100 text-teal-700", dateLabel: "May 19, 2024", dateISO: "2024-05-19", time: "1:00 PM", duration: "30 min", type: "Video", status: "Rescheduled", notes: "Rescheduled at student's request. New date pending." },
  { id: "apt-10", student: "Halima Sani", image: "/teacher-2.jpg.png", level: "SS 1", reason: "Mental burnout check-in", tag: "Academic Counselling", tagColor: "bg-rose-100 text-rose-700", dateLabel: "May 18, 2024", dateISO: "2024-05-18", time: "10:00 AM", duration: "30 min", type: "Phone", status: "Cancelled", notes: "Student cancelled. Will follow up next week." },
];

// ---------- Intake Forms ----------

export type IntakeFormStatus = "Pending" | "Submitted" | "Reviewed" | "Archived";

export const intakeFormStatusStyles: Record<IntakeFormStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Submitted: "bg-blue-100 text-blue-700",
  Reviewed: "bg-emerald-100 text-emerald-700",
  Archived: "bg-ensena-bg-soft text-ensena-muted",
};

export const intakeGoalOptions = [
  "Career Guidance",
  "Exam Preparation",
  "Low Motivation",
  "Study Plan",
  "Choosing Tutors",
  "Mental Burnout",
  "Time Management",
];

export interface IntakeFormAiSummary {
  examTrack: string;
  dreamCourse: string;
  weakSubject: string;
  budget: string;
  tutorPreference: string;
  motivation: "High" | "Medium" | "Low";
  needsAccountability: boolean;
}

export interface IntakeForm {
  id: string;
  student: string;
  image: string;
  level: string;
  status: IntakeFormStatus;
  submittedDate: string;
  goals: string[];
  aiSummary: IntakeFormAiSummary;
}

export const initialIntakeForms: IntakeForm[] = [
  { id: "intake-1", student: "Chinedu Eze", image: "/teacher-1.jpg.png", level: "WAEC", status: "Pending", submittedDate: "Yesterday, 6:20 PM", goals: ["Exam Preparation", "Low Motivation"], aiSummary: { examTrack: "WAEC Student", dreamCourse: "Medicine", weakSubject: "Mathematics", budget: "₦20,000/month", tutorPreference: "Prefers Female Tutor", motivation: "High", needsAccountability: true } },
  { id: "intake-2", student: "Tobi Ogundele", image: "/teacher-2.jpg.png", level: "JAMB", status: "Pending", submittedDate: "Today, 9:10 AM", goals: ["Career Guidance", "Choosing Tutors"], aiSummary: { examTrack: "JAMB Candidate", dreamCourse: "Computer Science", weakSubject: "Physics", budget: "₦15,000/month", tutorPreference: "No preference", motivation: "Medium", needsAccountability: false } },
  { id: "intake-3", student: "Amina Yusuf", image: "/teacher-4.jpg.png", level: "SS 2", status: "Pending", submittedDate: "Today, 11:40 AM", goals: ["Mental Burnout", "Time Management"], aiSummary: { examTrack: "SS 2 Student", dreamCourse: "Undecided", weakSubject: "English Language", budget: "₦12,000/month", tutorPreference: "Prefers Male Tutor", motivation: "Low", needsAccountability: true } },
  { id: "intake-4", student: "Fatima Bello", image: "/teacher-4.jpg.png", level: "JAMB", status: "Submitted", submittedDate: "2 days ago", goals: ["Study Plan", "Time Management"], aiSummary: { examTrack: "JAMB Candidate", dreamCourse: "Law", weakSubject: "Mathematics", budget: "₦18,000/month", tutorPreference: "No preference", motivation: "High", needsAccountability: false } },
  { id: "intake-5", student: "Ibrahim Bello", image: "/teacher-3.jpg.png", level: "SS 3", status: "Reviewed", submittedDate: "1 week ago", goals: ["Career Guidance"], aiSummary: { examTrack: "SS 3 Student", dreamCourse: "Law", weakSubject: "Government", budget: "₦20,000/month", tutorPreference: "No preference", motivation: "High", needsAccountability: false } },
  { id: "intake-6", student: "Grace Williams", image: "/teacher-2.jpg.png", level: "University", status: "Archived", submittedDate: "3 weeks ago", goals: ["Career Guidance"], aiSummary: { examTrack: "University Student", dreamCourse: "N/A", weakSubject: "N/A", budget: "₦25,000/month", tutorPreference: "No preference", motivation: "Medium", needsAccountability: false } },
];

// ---------- Action Plans ----------

export type ActionPlanStatus = "On Track" | "At Risk" | "Completed" | "Overdue";

export const actionPlanStatusStyles: Record<ActionPlanStatus, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Completed: "bg-blue-100 text-blue-700",
  Overdue: "bg-rose-100 text-rose-700",
};

export interface ActionPlanTask {
  label: string;
  done: boolean;
}

export interface FollowUpWeek {
  week: string;
  label: string;
  status: "Done" | "Upcoming" | "Pending";
}

export interface CompletionReport {
  before: { attendance: number; score: number; homework: number };
  after: { attendance: number; score: number; homework: number };
  status: string;
}

export interface ActionPlanRecord {
  id: string;
  student: string;
  image: string;
  goal: string;
  progressPct: number;
  dueDate: string;
  status: ActionPlanStatus;
  metric: { label: string; before: number; current: number; target: number };
  tasks: ActionPlanTask[];
  aiTracking: { homework: string; attendance: string; studyTime: string; tutorFeedback: string; overall: string };
  followUpSchedule: FollowUpWeek[];
  completionReport?: CompletionReport;
}

export const initialActionPlans: ActionPlanRecord[] = [
  {
    id: "ap-1", student: "Sarah Johnson", image: "/teacher-4.jpg.png", goal: "Improve Mathematics", progressPct: 75, dueDate: "June 18, 2024", status: "On Track",
    metric: { label: "Mathematics Score", before: 44, current: 61, target: 70 },
    tasks: [
      { label: "Attend all Mathematics lessons", done: true },
      { label: "Complete homework", done: true },
      { label: "Study 1 hour daily", done: true },
      { label: "Join Saturday revision class", done: false },
      { label: "Meet counsellor again in 2 weeks", done: false },
    ],
    aiTracking: { homework: "Completed", attendance: "Excellent", studyTime: "Improving", tutorFeedback: "Positive", overall: "Very Good" },
    followUpSchedule: [
      { week: "Week 1", label: "Check Homework", status: "Done" },
      { week: "Week 2", label: "Meet Counsellor", status: "Upcoming" },
      { week: "Week 3", label: "Review Progress", status: "Pending" },
      { week: "Week 4", label: "Close Case", status: "Pending" },
    ],
  },
  {
    id: "ap-2", student: "David Okoro", image: "/teacher-1.jpg.png", goal: "Rebuild tutor fit & consistency", progressPct: 40, dueDate: "June 10, 2024", status: "At Risk",
    metric: { label: "Lesson Attendance", before: 55, current: 68, target: 90 },
    tasks: [
      { label: "Trial lesson with new Physics tutor", done: true },
      { label: "Weekly past-question practice", done: false },
      { label: "Attend every Physics class", done: false },
      { label: "Meet counsellor again in 2 weeks", done: false },
    ],
    aiTracking: { homework: "Behind", attendance: "Needs Improvement", studyTime: "Inconsistent", tutorFeedback: "Mixed", overall: "At Risk" },
    followUpSchedule: [
      { week: "Week 1", label: "Trial New Tutor", status: "Done" },
      { week: "Week 2", label: "Check Attendance", status: "Upcoming" },
      { week: "Week 3", label: "Review Progress", status: "Pending" },
      { week: "Week 4", label: "Close Case", status: "Pending" },
    ],
  },
  {
    id: "ap-3", student: "Mary Bello", image: "/teacher-2.jpg.png", goal: "Improve English & confidence", progressPct: 55, dueDate: "June 14, 2024", status: "On Track",
    metric: { label: "Homework Completion", before: 31, current: 58, target: 85 },
    tasks: [
      { label: "Submit 1 essay per week", done: true },
      { label: "Read for 20 minutes daily", done: true },
      { label: "Join English group class", done: false },
    ],
    aiTracking: { homework: "Improving", attendance: "Excellent", studyTime: "Improving", tutorFeedback: "Positive", overall: "Good" },
    followUpSchedule: [
      { week: "Week 1", label: "Set Weekly Goals", status: "Done" },
      { week: "Week 2", label: "Check Homework", status: "Upcoming" },
      { week: "Week 3", label: "Review Progress", status: "Pending" },
    ],
  },
  {
    id: "ap-4", student: "Ibrahim Bello", image: "/teacher-3.jpg.png", goal: "Finalize subject combination", progressPct: 100, dueDate: "May 20, 2024", status: "Completed",
    metric: { label: "Confidence Score", before: 45, current: 92, target: 90 },
    tasks: [
      { label: "Confirm subject combination with school", done: true },
      { label: "Review university requirements", done: true },
      { label: "Final counsellor sign-off", done: true },
    ],
    aiTracking: { homework: "Completed", attendance: "Excellent", studyTime: "Excellent", tutorFeedback: "Positive", overall: "Excellent" },
    followUpSchedule: [
      { week: "Week 1", label: "Career Guidance Session", status: "Done" },
      { week: "Week 2", label: "Confirm Combination", status: "Done" },
    ],
    completionReport: { before: { attendance: 62, score: 45, homework: 51 }, after: { attendance: 95, score: 81, homework: 92 }, status: "Completed Successfully" },
  },
];

// ---------- AI Insights (v2) ----------

export interface AiPrediction {
  student: string;
  image: string;
  prediction: string;
  confidence: number;
  tone: "positive" | "warning";
}

export const aiPredictions: AiPrediction[] = [
  { student: "Ibrahim Bello", image: "/teacher-3.jpg.png", prediction: "Likely to pass WAEC with distinction", confidence: 94, tone: "positive" },
  { student: "Sarah Johnson", image: "/teacher-4.jpg.png", prediction: "Needs additional Mathematics tutoring", confidence: 88, tone: "warning" },
  { student: "David Okoro", image: "/teacher-1.jpg.png", prediction: "At risk of dropping out of Physics lessons", confidence: 76, tone: "warning" },
  { student: "Chinedu Eze", image: "/teacher-1.jpg.png", prediction: "May miss upcoming lessons based on attendance trend", confidence: 71, tone: "warning" },
  { student: "Mary Bello", image: "/teacher-2.jpg.png", prediction: "Will need counselling follow-up next month", confidence: 65, tone: "warning" },
];

export const aiRecommendationActions = [
  "Recommend changing tutor.",
  "Recommend weekly Mathematics.",
  "Recommend joining WAEC Bootcamp.",
  "Recommend counselling follow-up.",
  "Recommend reducing workload.",
  "Recommend French Group Class.",
];

export const counsellingReports = {
  studentsHelped: 214,
  averageImprovementPct: 27,
  averageDurationMins: 32,
  noShowRatePct: 4,
  commonStruggles: [
    { label: "Exam Anxiety", pct: 34 },
    { label: "Time Management", pct: 28 },
    { label: "Subject Difficulty", pct: 22 },
    { label: "Motivation", pct: 16 },
  ],
  mostRequestedSubjects: [
    { label: "Mathematics", count: 68 },
    { label: "Physics", count: 41 },
    { label: "English Language", count: 33 },
    { label: "Chemistry", count: 27 },
  ],
  commonGoals: [
    { label: "WAEC", pct: 42 },
    { label: "JAMB", pct: 31 },
    { label: "Career Guidance", pct: 17 },
    { label: "Study Habits", pct: 10 },
  ],
};
