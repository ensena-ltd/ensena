import { initialAdminStudents, initialAdminTutors, type AdminTutor } from "@/lib/admin-data";
import { splitEarnings } from "@/lib/commission";

export interface AssignedStudent {
  name: string;
  image: string;
  level: string;
  subject: string;
  progressPct: number;
  attendancePct: number;
  lastLesson: string;
  nextLesson: string;
  homeworkCompletionPct: number;
}

export type TutorLessonStatus = "Upcoming" | "Completed" | "Cancelled" | "Missed" | "Rescheduled";

export interface TutorLessonRow {
  id: string;
  student: string;
  subject: string;
  date: string;
  duration: string;
  status: TutorLessonStatus;
  payment: number;
}

export const tutorLessonStatusStyles: Record<TutorLessonStatus, string> = {
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Missed: "bg-rose-100 text-rose-700",
  Rescheduled: "bg-amber-100 text-amber-700",
};

export interface VerificationDocument {
  submitted: boolean;
  submittedAt?: string;
  fileName?: string;
}

export interface VerificationDocuments {
  idDocument: VerificationDocument;
  qualifications: VerificationDocument;
  certificates: VerificationDocument;
  teachingVideo: VerificationDocument;
}

export interface TutorProfile {
  tutorId: string;
  image: string;
  bio: string;
  verificationDocuments: VerificationDocuments;
  education: string;
  experienceYears: number;
  languages: string[];
  country: string;
  state: string;
  timezone: string;
  teachingMode: "Online" | "Physical" | "Hybrid";
  subjectsByLevel: { subject: string; levels: string[] }[];
  hourlyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  responseTimeMinutes: number;
  completionRatePct: number;
  cancellationRatePct: number;
  homeworkCompletionPct: number;
  retentionPct: number;
  attendancePct: number;
  lateStarts: number;
  cancelledLessons: number;
  privateLessonsCount: number;
  groupClassesCount: number;
  nextAvailable: string;
  aiTeachingScore: number;
  aiBreakdown: { label: string; pct: number }[];
  aiSuggestions: string[];
  riskAnalysis: { burnout: string; cancellation: string; ratingDecline: string };
  earnings: { lifetime: number; thisMonth: number };
  escrowHeld: number;
  pendingWithdrawal: number;
  assignedStudents: AssignedStudent[];
  lessons: TutorLessonRow[];
  activityLog: { time: string; action: string }[];
  reviewHighlights: { positive: string[]; complaints: string[]; aiSummary: string };
}

const studentImages = ["/teacher-1.jpg.png", "/teacher-2.jpg.png", "/teacher-3.jpg.png", "/teacher-4.jpg.png"];
const tutorImages = ["/teacher-2.jpg.png", "/teacher-3.jpg.png", "/teacher-1.jpg.png", "/teacher-4.jpg.png"];

function buildProfile(t: AdminTutor, i: number, overrides: Partial<TutorProfile> = {}): TutorProfile {
  const lifetime = t.earnings;
  const thisMonth = Math.round(lifetime * 0.12);
  const students = initialAdminStudents.slice(0, 3).map((s, j) => ({
    name: s.name,
    image: studentImages[j % studentImages.length],
    level: s.level,
    subject: t.subjects[j % t.subjects.length] ?? t.subjects[0],
    progressPct: 65 + ((i + j) * 7) % 30,
    attendancePct: 80 + ((i + j) * 5) % 20,
    lastLesson: `${2 + j} days ago`,
    nextLesson: j === 0 ? "Today, 4:00 PM" : `${j + 1} days from now`,
    homeworkCompletionPct: 70 + ((i + j) * 6) % 30,
  }));

  const lessons: TutorLessonRow[] = [
    { id: `${t.id}-l1`, student: students[0]?.name ?? "Student", subject: t.subjects[0], date: "Today, 4:00 PM", duration: "60 mins", status: "Upcoming", payment: 5000 },
    { id: `${t.id}-l2`, student: students[1]?.name ?? "Student", subject: t.subjects[0], date: "Yesterday, 2:00 PM", duration: "60 mins", status: "Completed", payment: 5000 },
    { id: `${t.id}-l3`, student: students[2]?.name ?? "Student", subject: t.subjects[t.subjects.length - 1], date: "3 days ago", duration: "45 mins", status: "Completed", payment: 3800 },
    { id: `${t.id}-l4`, student: students[0]?.name ?? "Student", subject: t.subjects[0], date: "1 week ago", duration: "60 mins", status: t.status === "Suspended" ? "Missed" : "Cancelled", payment: 0 },
  ];

  // Verified tutors have every document on file; Pending tutors realistically
  // have some submitted and some still outstanding; Rejected tutors only got
  // as far as the ID document before being turned down.
  const verificationDocuments: VerificationDocuments =
    t.verification === "Verified"
      ? {
          idDocument: { submitted: true, submittedAt: t.joined, fileName: "national-id.pdf" },
          qualifications: { submitted: true, submittedAt: t.joined, fileName: "degree-certificate.pdf" },
          certificates: { submitted: true, submittedAt: t.joined, fileName: "teaching-certificate.pdf" },
          teachingVideo: { submitted: true, submittedAt: t.joined, fileName: "demo-lesson.mp4" },
        }
      : t.verification === "Rejected"
        ? {
            idDocument: { submitted: true, submittedAt: t.joined, fileName: "national-id.pdf" },
            qualifications: { submitted: false },
            certificates: { submitted: false },
            teachingVideo: { submitted: false },
          }
        : {
            idDocument: { submitted: true, submittedAt: "2 days ago", fileName: "national-id.pdf" },
            qualifications: { submitted: true, submittedAt: "2 days ago", fileName: "degree-certificate.pdf" },
            certificates: { submitted: false },
            teachingVideo: { submitted: false },
          };

  return {
    verificationDocuments,
    tutorId: t.id,
    image: tutorImages[i % tutorImages.length],
    bio: `Experienced ${t.subjects[0]} tutor specializing in secondary and WAEC/JAMB preparation. Passionate about helping students achieve excellence.`,
    education: `B.Sc. ${t.subjects[0]}, University of Lagos`,
    experienceYears: 3 + (i % 6),
    languages: i % 3 === 0 ? ["English", "Yoruba"] : i % 3 === 1 ? ["English", "Hausa"] : ["English", "French"],
    country: "Nigeria",
    state: ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano"][i % 5],
    timezone: "WAT (UTC+1)",
    teachingMode: i % 4 === 0 ? "Hybrid" : "Online",
    subjectsByLevel: t.subjects.map((s) => ({ subject: s, levels: ["SS", "JAMB", "WAEC"] })),
    hourlyRate: 3000 + i * 250,
    weeklyRate: (3000 + i * 250) * 4,
    monthlyRate: (3000 + i * 250) * 14,
    responseTimeMinutes: 3 + (i % 10),
    completionRatePct: t.status === "Banned" ? 0 : 92 + (i % 7),
    cancellationRatePct: t.status === "Suspended" ? 8 : 1 + (i % 4),
    homeworkCompletionPct: 85 + (i % 10),
    retentionPct: 80 + (i % 15),
    attendancePct: t.status === "Banned" ? 0 : 95 + (i % 5),
    lateStarts: i % 3,
    cancelledLessons: (i % 5),
    privateLessonsCount: Math.round(t.lessonsCompleted * 0.75),
    groupClassesCount: Math.round(t.lessonsCompleted * 0.02) || (i % 3),
    nextAvailable: t.status === "Active" ? "Today, 2:00 PM" : "Unavailable",
    aiTeachingScore: t.status === "Banned" ? 0 : Math.min(99, 88 + (i % 10)),
    aiBreakdown: [
      { label: "Communication", pct: 90 + (i % 9) },
      { label: "Punctuality", pct: 95 + (i % 5) },
      { label: "Homework Quality", pct: 88 + (i % 10) },
      { label: "Student Engagement", pct: 90 + (i % 8) },
      { label: "Whiteboard Usage", pct: 85 + (i % 12) },
      { label: "Student Retention", pct: 82 + (i % 15) },
      { label: "Lesson Completion", pct: 94 + (i % 6) },
      { label: "Response Time", pct: 90 + (i % 9) },
    ],
    aiSuggestions: [
      "Students respond very well to visual explanations.",
      "Try increasing homework frequency to reinforce lesson content.",
      i % 2 === 0 ? "Recommend featuring tutor on the homepage." : "Consider pairing with more WAEC-focused students.",
    ],
    riskAnalysis: {
      burnout: t.lessonsCompleted > 300 ? "Medium" : "Low",
      cancellation: t.status === "Suspended" ? "High" : "Low",
      ratingDecline: t.rating > 0 && t.rating < 4.75 ? "Watch" : "None",
    },
    earnings: { lifetime, thisMonth },
    escrowHeld: Math.round(lifetime * 0.02),
    pendingWithdrawal: t.status === "Active" ? Math.round(lifetime * 0.015) : 0,
    assignedStudents: students,
    lessons,
    activityLog: [
      { time: t.joined, action: "Created account" },
      { time: t.joined, action: "Uploaded certificates" },
      { time: t.verification === "Verified" ? t.joined : "Pending", action: "Verification reviewed" },
      { time: "2 weeks ago", action: "Created a group class" },
      { time: "3 days ago", action: "Completed a lesson" },
      { time: "2 days ago", action: "Requested a withdrawal" },
      { time: "1 day ago", action: "Payment released" },
    ],
    reviewHighlights: {
      positive: ["explanation style", "patience", "punctuality"],
      complaints: t.status === "Suspended" ? ["late starts", "rescheduling"] : ["wants more practice exercises"],
      aiSummary: `Students frequently praise ${t.name.split(" ")[0]}'s explanation style. Average response time is excellent. Some students request more practice exercises.`,
    },
    ...overrides,
  };
}

export const tutorProfiles: Record<string, TutorProfile> = Object.fromEntries(
  initialAdminTutors.map((t, i) => {
    if (t.id === "t-1") {
      return [
        t.id,
        buildProfile(t, i, {
          bio: "Experienced Mathematics and Physics tutor specializing in secondary and JAMB/WAEC preparation. Passionate about helping students achieve excellence.",
          education: "B.Sc. Mathematics, University of Lagos",
          experienceYears: 5,
          languages: ["English", "Yoruba"],
          state: "Lagos",
          teachingMode: "Online",
          subjectsByLevel: [
            { subject: "Mathematics", levels: ["JS", "SS", "JAMB", "WAEC"] },
            { subject: "Physics", levels: ["SS", "JAMB", "WAEC"] },
            { subject: "Further Mathematics", levels: ["SS", "JAMB"] },
            { subject: "Basic Technology", levels: ["JS", "SS"] },
          ],
          responseTimeMinutes: 4,
          completionRatePct: 99,
          cancellationRatePct: 2,
          nextAvailable: "Today, 2:00 PM",
        }),
      ];
    }
    return [t.id, buildProfile(t, i)];
  })
);

export function tutorNetEarnings(gross: number) {
  return splitEarnings(gross);
}
