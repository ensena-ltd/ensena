import { initialAdminStudents, initialAdminTutors, type AdminStudent } from "@/lib/admin-data";

export interface StudentTutorLink {
  name: string;
  image: string;
  subject: string;
  lessonsCompleted: number;
  nextLesson: string;
  rating: number;
  attendanceTogetherPct: number;
  averageScorePct: number;
}

export type StudentLessonStatus = "Upcoming" | "Completed" | "Cancelled" | "Missed";

export interface StudentLessonRow {
  id: string;
  tutor: string;
  subject: string;
  date: string;
  type: "Private" | "Group";
  status: StudentLessonStatus;
}

export type StudentHomeworkStatus = "Pending" | "Submitted" | "Late" | "Reviewed" | "Completed";

export interface StudentHomeworkRow {
  id: string;
  assignment: string;
  subject: string;
  tutor: string;
  status: StudentHomeworkStatus;
  score?: number;
  due: string;
}

export const studentLessonStatusStyles: Record<StudentLessonStatus, string> = {
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Missed: "bg-rose-100 text-rose-700",
};

export const studentHomeworkStatusStyles: Record<StudentHomeworkStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Submitted: "bg-blue-100 text-blue-700",
  Late: "bg-rose-100 text-rose-700",
  Reviewed: "bg-purple-100 text-purple-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

export interface StudentProfile {
  studentId: string;
  image: string;
  school: string;
  country: string;
  state: string;
  age: number;
  languages: string[];
  learningGoals: string[];
  preferredLearningStyle: string;
  currentSubjects: string[];
  counsellorAssigned: string;
  lastLogin: string;

  completedLessons: number;
  upcomingLessons: number;
  groupClassesCount: number;
  homeworkCompletionPct: number;
  attendancePct: number;
  averageScorePct: number;
  studyHours: number;
  progressLabel: "Excellent" | "Good" | "Needs Attention" | "At Risk";

  aiLearningScore: number;
  aiBreakdown: { label: string; pct: number }[];
  aiSummary: string[];

  tutors: StudentTutorLink[];
  lessons: StudentLessonRow[];
  homework: StudentHomeworkRow[];

  attendanceTrend: number[];
  attendanceInsight: string;

  counsellingUpcoming: { date: string; topic: string }[];
  counsellingCompleted: { date: string; topic: string; notes: string }[];

  payments: { totalPaid: number; privateLessons: number; groupClasses: number; counselling: number };
  escrow: { lesson: string; tutor: string; amount: number; status: string; releaseDate: string }[];

  activityLog: { time: string; action: string }[];

  riskLevel: "Low" | "Medium" | "High";
  riskFlags: string[];
}

const studentImages = ["/teacher-4.jpg.png", "/teacher-1.jpg.png", "/teacher-2.jpg.png", "/teacher-3.jpg.png"];
const tutorImages = ["/teacher-2.jpg.png", "/teacher-3.jpg.png", "/teacher-1.jpg.png"];

function buildProfile(s: AdminStudent, i: number, overrides: Partial<StudentProfile> = {}): StudentProfile {
  const tutorPool = initialAdminTutors.filter((t) => t.status !== "Banned").slice(0, 2 + (i % 2));
  const subjects = s.level.split(" · ").length > 1 ? s.level.split(" · ") : [tutorPool[0]?.subjects[0] ?? "Mathematics"];
  const attendancePct = s.status === "Banned" ? 40 : 82 + (i * 3) % 18;
  const homeworkCompletionPct = s.status === "Banned" ? 30 : 75 + (i * 5) % 25;
  const averageScorePct = s.status === "Banned" ? 45 : 70 + (i * 4) % 28;
  const aiLearningScore = Math.round((attendancePct + homeworkCompletionPct + averageScorePct) / 3);
  const progressLabel: StudentProfile["progressLabel"] = aiLearningScore >= 88 ? "Excellent" : aiLearningScore >= 75 ? "Good" : aiLearningScore >= 60 ? "Needs Attention" : "At Risk";
  const riskLevel: StudentProfile["riskLevel"] = attendancePct < 70 || s.status !== "Active" ? "High" : attendancePct < 88 ? "Medium" : "Low";

  const tutors: StudentTutorLink[] = tutorPool.map((t, j) => ({
    name: t.name,
    image: tutorImages[j % tutorImages.length],
    subject: t.subjects[0],
    lessonsCompleted: Math.round(s.lessonsCompleted / tutorPool.length) + j,
    nextLesson: j === 0 ? "Today, 4:00 PM" : `${j + 2} days from now`,
    rating: t.rating,
    attendanceTogetherPct: attendancePct - j * 2,
    averageScorePct: averageScorePct + j,
  }));

  const lessons: StudentLessonRow[] = [
    { id: `${s.id}-l1`, tutor: tutors[0]?.name ?? "Tutor", subject: subjects[0], date: "Today, 4:00 PM", type: "Private", status: "Upcoming" },
    { id: `${s.id}-l2`, tutor: tutors[0]?.name ?? "Tutor", subject: subjects[0], date: "Yesterday", type: "Private", status: "Completed" },
    { id: `${s.id}-l3`, tutor: tutors[1]?.name ?? "Tutor", subject: subjects[subjects.length - 1], date: "3 days ago", type: "Group", status: "Completed" },
    { id: `${s.id}-l4`, tutor: tutors[0]?.name ?? "Tutor", subject: subjects[0], date: "1 week ago", type: "Private", status: s.status === "Banned" ? "Missed" : "Cancelled" },
  ];

  const homework: StudentHomeworkRow[] = [
    { id: `${s.id}-h1`, assignment: `${subjects[0]} Practice Set`, subject: subjects[0], tutor: tutors[0]?.name ?? "Tutor", status: "Pending", due: "Tomorrow" },
    { id: `${s.id}-h2`, assignment: `${subjects[0]} Past Questions`, subject: subjects[0], tutor: tutors[0]?.name ?? "Tutor", status: "Reviewed", score: averageScorePct, due: "3 days ago" },
    { id: `${s.id}-h3`, assignment: `${subjects[subjects.length - 1]} Worksheet`, subject: subjects[subjects.length - 1], tutor: tutors[1]?.name ?? "Tutor", status: "Completed", score: averageScorePct + 4, due: "1 week ago" },
  ];

  const riskFlags: string[] = [];
  if (attendancePct < 75) riskFlags.push("Attendance below 75%");
  if (homework.some((h) => h.status === "Pending")) riskFlags.push("Homework overdue");
  if (s.status === "Suspended" || s.status === "Banned") riskFlags.push("Account under restriction");

  return {
    studentId: s.id,
    image: studentImages[i % studentImages.length],
    school: "Greenwood Secondary School",
    country: "Nigeria",
    state: ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Enugu"][i % 6],
    age: 14 + (i % 6),
    languages: i % 2 === 0 ? ["English"] : ["English", "Yoruba"],
    learningGoals: [`Score 300+ in JAMB`, `Improve ${subjects[0]} grade`],
    preferredLearningStyle: i % 2 === 0 ? "Visual" : "Practice-based",
    currentSubjects: subjects,
    counsellorAssigned: "Cynthia Ejie",
    lastLogin: "2 hours ago",
    completedLessons: s.lessonsCompleted,
    upcomingLessons: 2 + (i % 3),
    groupClassesCount: i % 3,
    homeworkCompletionPct,
    attendancePct,
    averageScorePct,
    studyHours: Math.round(s.lessonsCompleted * 1.1),
    progressLabel,
    aiLearningScore,
    aiBreakdown: [
      { label: "Attendance", pct: attendancePct },
      { label: "Homework", pct: homeworkCompletionPct },
      { label: "Engagement", pct: Math.max(0, averageScorePct - 3) },
      { label: "Improvement", pct: Math.min(99, averageScorePct + 3) },
      { label: "Quiz Results", pct: averageScorePct },
      { label: "Lesson Completion", pct: Math.min(99, attendancePct + 2) },
      { label: "Consistency", pct: Math.min(99, (attendancePct + homeworkCompletionPct) / 2) },
    ],
    aiSummary: [
      `${s.name.split(" ")[0]} learns best through ${i % 2 === 0 ? "visual explanations" : "hands-on practice"}.`,
      `${subjects[0]} performance has ${averageScorePct > 80 ? "improved" : "shown mixed results"} over the last month.`,
      riskFlags.length > 0 ? "Recommend a weekly counselling check-in." : "No intervention needed at this time.",
    ],
    tutors,
    lessons,
    homework,
    attendanceTrend: [attendancePct - 8, attendancePct - 4, attendancePct - 6, attendancePct - 2, attendancePct, attendancePct + 1, attendancePct].map((v) => Math.max(0, Math.min(100, v))),
    attendanceInsight: attendancePct < 85 ? `Attendance dropped in recent weeks. ${s.name.split(" ")[0]} frequently misses Monday lessons. Recommend adjusting the schedule.` : "Attendance is consistent with no notable pattern of missed lessons.",
    counsellingUpcoming: s.status === "Active" && i % 3 === 0 ? [{ date: "May 30, 2024 · 1:00 PM", topic: "Study plan review" }] : [],
    counsellingCompleted: [{ date: "April 12, 2024", topic: "Academic goal setting", notes: "Discussed WAEC prep timeline and subject prioritization." }],
    payments: {
      totalPaid: s.totalSpent,
      privateLessons: Math.round(s.totalSpent * 0.6),
      groupClasses: Math.round(s.totalSpent * 0.3),
      counselling: Math.round(s.totalSpent * 0.1),
    },
    escrow: s.status === "Active" ? [{ lesson: subjects[0], tutor: tutors[0]?.name ?? "Tutor", amount: 5000, status: "Held", releaseDate: "In 22h" }] : [],
    activityLog: [
      { time: s.joined, action: "Created account" },
      { time: s.joined, action: `Booked ${subjects[0]} tutor` },
      { time: "3 weeks ago", action: "Joined a group class" },
      { time: "1 week ago", action: "Completed homework" },
      { time: "5 days ago", action: "Booked counselling session" },
      { time: "2 days ago", action: "Completed a mock test" },
    ],
    riskLevel,
    riskFlags,
    ...overrides,
  };
}

export const studentProfiles: Record<string, StudentProfile> = Object.fromEntries(
  initialAdminStudents.map((s, i) => {
    if (s.id === "s-2") {
      return [
        s.id,
        buildProfile(s, i, {
          currentSubjects: ["Mathematics", "WAEC"],
          attendancePct: 96,
          aiLearningScore: 91,
          progressLabel: "Excellent",
          riskLevel: "Low",
          riskFlags: [],
        }),
      ];
    }
    return [s.id, buildProfile(s, i)];
  })
);
