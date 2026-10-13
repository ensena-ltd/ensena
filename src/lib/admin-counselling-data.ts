// Admin -> Counselling. Rebuilt around the direct-booking-with-Benny flow:
// a student completes intake, picks a real open slot on Benny's schedule,
// and the booking lands here for review. One shared array of appointments
// is the single source of truth — Students, Intake Forms and Action Plans
// are all derived views over it rather than separate mock datasets.
import { tutorListings } from "@/lib/tutors";
import { buildBookingReference } from "@/lib/booking-reference";

// Seed recommendations reference a real tutor entity (never a duplicated
// copy of their details) — looked up once here the same way the UI itself
// does when Benny picks a tutor to recommend.
const seedMathTutor = tutorListings.find((t) => t.subject === "Mathematics" && t.name === "Tunde Adebayo") ?? tutorListings.find((t) => t.subject === "Mathematics");

export type CounsellingStatus =
  | "New Booking"
  | "Upcoming"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Follow-up";

export const counsellingStatusStyles: Record<CounsellingStatus, string> = {
  "New Booking": "bg-amber-100 text-amber-700",
  Upcoming: "bg-blue-100 text-blue-700",
  "In Progress": "bg-emerald-100 text-emerald-700",
  Completed: "bg-ensena-bg-soft text-ensena-muted",
  Cancelled: "bg-rose-100 text-rose-700",
  "Follow-up": "bg-purple-100 text-purple-700",
};

export const concernOptions = [
  "Subject difficulty",
  "Exam preparation",
  "Choosing subjects or courses",
  "Finding a tutor",
  "Study planning",
  "Talking through an academic challenge",
  "I'm not sure what I need",
  "Other",
] as const;

export const supportPreferenceOptions = [
  "Understand my options",
  "Create a study plan",
  "Find the right tutor/class",
  "Prepare for an exam",
  "Talk through a challenge",
  "Not sure yet",
] as const;

// Session Outcome — what actually came out of the call. The options shown
// to Benny depend on what the student originally said they needed (see
// outcomeOptionsFor), so she isn't picking from a list of irrelevant
// actions every time.
export type SessionOutcome =
  | "Academic guidance provided"
  | "Tutor recommended"
  | "Group class recommended"
  | "Study plan recommended"
  | "Follow-up required"
  | "Further counselling needed"
  | "No further action";

const outcomeOptionsByConcern: Record<string, SessionOutcome[]> = {
  "Subject difficulty": ["Tutor recommended", "Group class recommended", "Study plan recommended", "Follow-up required", "No further action"],
  "Exam preparation": ["Tutor recommended", "Group class recommended", "Study plan recommended", "Follow-up required", "No further action"],
  "Finding a tutor": ["Tutor recommended", "Group class recommended", "Follow-up required", "No further action"],
  "Study planning": ["Study plan recommended", "Tutor recommended", "Follow-up required", "No further action"],
  "Choosing subjects or courses": ["Academic guidance provided", "Follow-up required", "No further action"],
  "Talking through an academic challenge": ["Academic guidance provided", "Further counselling needed", "Follow-up required", "No further action"],
  "I'm not sure what I need": ["Academic guidance provided", "Tutor recommended", "Study plan recommended", "Follow-up required", "No further action"],
  Other: ["Academic guidance provided", "Follow-up required", "No further action"],
};
const defaultOutcomeOptions: SessionOutcome[] = ["Academic guidance provided", "Follow-up required", "No further action"];

export function outcomeOptionsFor(concerns: string[]): SessionOutcome[] {
  const options = new Set<SessionOutcome>();
  for (const concern of concerns) {
    (outcomeOptionsByConcern[concern] ?? defaultOutcomeOptions).forEach((o) => options.add(o));
  }
  return options.size > 0 ? Array.from(options) : defaultOutcomeOptions;
}

// The concrete result of a "Tutor recommended" / "Group class recommended"
// / "Study plan recommended" outcome — always a reference to the real
// tutor/class entity (slug), never a duplicated copy of its details, so the
// student always sees that entity's live profile/listing.
export interface CounsellingRecommendation {
  type: "tutor" | "group-class" | "study-plan";
  message: string;
  tutorSlug?: string;
  groupClassSlug?: string;
}

export interface CounsellingIntake {
  concerns: string[];
  message: string;
  academicLevel: string;
  subjects: string[];
  examGoal: string;
  goalText: string;
  supportPreferences: string[];
}

// A summary Benny can read before the call, not an automated decision.
export interface CounsellingAiSummary {
  summary: string;
  suggestedTopics: string[];
}

// Benny's private write-up of the call — never shown to the student.
export interface CounsellingSessionNotes {
  discussed: string;
}

export interface CounsellingFollowUp {
  needed: boolean;
  date?: string;
  /** The real follow-up appointment created for that date, once booked. */
  appointmentId?: string;
}

export interface CounsellingActionPlanTask {
  label: string;
  status: "In Progress" | "Upcoming" | "Done";
  dueDate?: string;
  completedDate?: string;
}

export interface CounsellingActionPlan {
  title: string;
  createdDate: string;
  tasks: CounsellingActionPlanTask[];
}

// A real academic resource Benny attaches for the student — a link to an
// existing page elsewhere in the app (never a fabricated document/PDF this
// app has no way to host). Optional and typically absent; only shown when
// Benny has actually attached one.
export interface CounsellingResource {
  title: string;
  description: string;
  url: string;
}

export interface CounsellingAppointment {
  id: string;
  student: string;
  studentImage: string;
  level: string;
  exam: string;
  dateISO: string;
  dateLabel: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  status: CounsellingStatus;
  bookedLabel: string;
  bookedAgo: string;
  intake: CounsellingIntake;
  aiSummary: CounsellingAiSummary;
  intakeReviewed: boolean;
  sessionNotes?: CounsellingSessionNotes;
  outcome?: SessionOutcome;
  recommendation?: CounsellingRecommendation;
  followUp?: CounsellingFollowUp;
  actionPlan?: CounsellingActionPlan;
  /** Benny's student-facing write-up of what was discussed and decided — shown on the student's own session summary page. Distinct from sessionNotes (Benny's private notes) and aiSummary (Benny's pre-call prep brief), which are never shown to the student. */
  sessionSummary?: string;
  /** Real academic resources Benny attached for the student, if any. */
  resources?: CounsellingResource[];
  /** Private to Benny — never shown to the student. */
  counsellorNotes?: string;
  // Basic contact facts for the "About" strip on the student profile — kept
  // optional and minimal by design (see the profile's own "don't turn this
  // into a CRM" scope note); simply omitted when not on file.
  studentEmail?: string;
  studentPhone?: string;
  studentLocation?: string;
  studentMemberSince?: string;
}

// Real start/end epoch-ms for a counselling appointment's entry window.
// Deliberately does NOT route dateISO through parseLegacyDateTime
// (class-entry-access.ts) — `new Date("2026-09-05")` parses a date-only
// ISO string as UTC midnight per spec, and reading .getFullYear()/.getDate()
// back off that in a negative-UTC-offset timezone rolls it back a full day.
// Splitting the ISO string manually and building a LOCAL Date (the same
// pattern used for `fromISO` elsewhere in this app, e.g.
// my-lessons-hub-client.tsx) avoids that off-by-one-day trap.
export function getCounsellingTimeRange(appt: Pick<CounsellingAppointment, "dateISO" | "time" | "endTime">): { startMs: number; endMs: number } | null {
  const [y, m, d] = appt.dateISO.split("-").map(Number);
  if (!y || !m || !d) return null;
  function atTime(timeStr: string): number | null {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
    return new Date(y, m - 1, d, hours, minutes).getTime();
  }
  const startMs = atTime(appt.time);
  const endMs = atTime(appt.endTime);
  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}

export function studentSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Same CNS reference code shown by the Virtual Classroom for a counselling
// appointment (classroom-data.ts's buildFromCounsellingAppointment) — a
// counselling appointment is not a Booking, so it keeps its own CNS-coded
// identity rather than being forced into the booking system.
export function formatCounsellingDisplayId(id: string): string {
  return buildBookingReference("counselling", id);
}

export const initialCounsellingAppointments: CounsellingAppointment[] = [
  // Today's confirmed schedule (already reviewed).
  {
    id: "cns-1",
    student: "Cynthia Ejie",
    studentImage: "/teacher-4.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-08-27",
    dateLabel: "Aug 27, 2026",
    time: "4:00 PM",
    endTime: "4:30 PM",
    durationMinutes: 30,
    status: "Completed",
    bookedLabel: "Aug 20 · 6:40 PM",
    bookedAgo: "1 week ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Subject difficulty", "Exam preparation"],
      message: "I've been struggling with Mathematics, especially algebra, and I'm worried about my WAEC preparation.",
      academicLevel: "SSS2",
      subjects: ["Mathematics", "Physics"],
      examGoal: "WAEC 2026",
      goalText: "Improve my WAEC Mathematics performance and gain confidence.",
      supportPreferences: ["Find the right tutor/class", "Create a study plan", "Prepare for an exam"],
    },
    aiSummary: {
      summary: "Student is seeking Mathematics support while preparing for WAEC. They are particularly struggling with Algebra and would like help finding appropriate learning support.",
      suggestedTopics: ["Current Mathematics challenges", "Study routine", "Exam preparation", "Appropriate tutor/class options"],
    },
    sessionNotes: {
      discussed: "Reviewed her recent Algebra test and agreed she needs a Mathematics tutor and a structured revision plan before WAEC.",
    },
    outcome: "Follow-up required",
    sessionSummary: "We talked through the Algebra topics you're finding difficult and agreed on next steps to get you ready for WAEC, including finding the right Mathematics tutor.",
    followUp: { needed: true, date: "Aug 29, 2026", appointmentId: "cns-13" },
  },
  {
    id: "cns-2",
    student: "David O.",
    studentImage: "/teacher-1.jpg.png",
    level: "SSS3",
    exam: "WAEC",
    dateISO: "2026-08-27",
    dateLabel: "Today",
    time: "5:00 PM",
    endTime: "5:30 PM",
    durationMinutes: 30,
    status: "Upcoming",
    bookedLabel: "Aug 27 · 5:00 PM",
    bookedAgo: "1 hour ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Finding a tutor"],
      message: "I need help finding the right Mathematics tutor before WAEC.",
      academicLevel: "SSS3",
      subjects: ["Mathematics"],
      examGoal: "WAEC",
      goalText: "Find a tutor who can help me catch up before the exam.",
      supportPreferences: ["Find the right tutor/class"],
    },
    aiSummary: {
      summary: "Student is looking for general support choosing the right tutor ahead of WAEC.",
      suggestedTopics: ["What's made past tutors a poor fit", "Preferred teaching style", "Tutor/class options"],
    },
  },
  {
    id: "cns-3",
    student: "Amaka N.",
    studentImage: "/teacher-2.jpg.png",
    level: "100 Level",
    exam: "—",
    dateISO: "2026-08-27",
    dateLabel: "Today",
    time: "6:00 PM",
    endTime: "6:30 PM",
    durationMinutes: 30,
    status: "Upcoming",
    bookedLabel: "Aug 27 · 6:00 PM",
    bookedAgo: "2 hours ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Study planning"],
      message: "I'm finding it hard to manage my time between courses this semester.",
      academicLevel: "100 Level",
      subjects: ["General Studies"],
      examGoal: "No specific exam",
      goalText: "Build a study routine I can actually stick to.",
      supportPreferences: ["Create a study plan"],
    },
    aiSummary: {
      summary: "Student is a university first-year looking for help with time management and study planning.",
      suggestedTopics: ["Current weekly routine", "Biggest time drains", "A realistic study schedule"],
    },
  },
  {
    id: "cns-4",
    student: "Joshua A.",
    studentImage: "/teacher-3.jpg.png",
    level: "SSS1",
    exam: "WAEC",
    dateISO: "2026-08-27",
    dateLabel: "Today",
    time: "7:00 PM",
    endTime: "7:30 PM",
    durationMinutes: 30,
    status: "Upcoming",
    bookedLabel: "Aug 27 · 7:00 PM",
    bookedAgo: "3 hours ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Subject difficulty"],
      message: "Physics is confusing me this term, especially the topics on forces.",
      academicLevel: "SSS1",
      subjects: ["Physics"],
      examGoal: "School examination",
      goalText: "Understand Physics well enough to stop dreading the subject.",
      supportPreferences: ["Understand my options"],
    },
    aiSummary: {
      summary: "Student is a junior secondary student struggling specifically with Physics.",
      suggestedTopics: ["Which Physics topics feel hardest", "Classroom pace", "Whether a tutor or group class fits better"],
    },
  },

  // New bookings, not yet reviewed.
  {
    id: "cns-5",
    student: "Chidera Eze",
    studentImage: "/teacher-1.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-08-29",
    dateLabel: "Aug 29, 2026",
    time: "4:00 PM",
    endTime: "4:30 PM",
    durationMinutes: 30,
    status: "New Booking",
    bookedLabel: "Aug 27 · 4:00 PM",
    bookedAgo: "10 minutes ago",
    intakeReviewed: false,
    intake: {
      concerns: ["Subject difficulty", "Exam preparation"],
      message: "I've been struggling with Mathematics, especially algebra, and I'm worried about my WAEC preparation.",
      academicLevel: "SSS2",
      subjects: ["Mathematics"],
      examGoal: "WAEC",
      goalText: "Improve my Mathematics grade and know what I should focus on before the exam.",
      supportPreferences: ["Find the right tutor/class"],
    },
    aiSummary: {
      summary: "Student is seeking Mathematics support while preparing for WAEC. They are particularly struggling with Algebra and would like help finding appropriate learning support.",
      suggestedTopics: ["Current Mathematics challenges", "Study routine", "Exam preparation", "Appropriate tutor/class options"],
    },
  },
  {
    id: "cns-6",
    student: "Victoria Obi",
    studentImage: "/teacher-4.jpg.png",
    level: "SSS3",
    exam: "WAEC",
    dateISO: "2026-08-28",
    dateLabel: "Aug 28, 2026",
    time: "5:00 PM",
    endTime: "5:30 PM",
    durationMinutes: 30,
    status: "New Booking",
    bookedLabel: "Aug 27 · 6:15 PM",
    bookedAgo: "45 minutes ago",
    intakeReviewed: false,
    intake: {
      concerns: ["Finding a tutor"],
      message: "I need guidance on choosing the right Mathematics tutor.",
      academicLevel: "SSS3",
      subjects: ["Mathematics"],
      examGoal: "WAEC",
      goalText: "Find a tutor whose teaching style actually works for me.",
      supportPreferences: ["Find the right tutor/class"],
    },
    aiSummary: {
      summary: "Student wants guidance choosing the right Mathematics tutor ahead of WAEC.",
      suggestedTopics: ["What hasn't worked with tutors before", "Learning style", "Tutor/class shortlist"],
    },
  },
  {
    id: "cns-7",
    student: "Grace Williams",
    studentImage: "/teacher-2.jpg.png",
    level: "100 Level",
    exam: "—",
    dateISO: "2026-08-28",
    dateLabel: "Aug 28, 2026",
    time: "6:00 PM",
    endTime: "6:30 PM",
    durationMinutes: 30,
    status: "New Booking",
    bookedLabel: "Aug 27 · 4:30 PM",
    bookedAgo: "2 hours ago",
    intakeReviewed: false,
    intake: {
      concerns: ["Study planning"],
      message: "I need help with study planning and time management this semester.",
      academicLevel: "100 Level",
      subjects: ["General Studies"],
      examGoal: "No specific exam",
      goalText: "Get a study routine in place before exams pile up.",
      supportPreferences: ["Create a study plan"],
    },
    aiSummary: {
      summary: "Student is looking for a workable study plan and better time management as a first-year.",
      suggestedTopics: ["Current weekly routine", "Course load", "A realistic study schedule"],
    },
  },

  // Completed sessions with follow-up due, feeding Students / Follow-ups.
  {
    id: "cns-8",
    student: "Cynthia Ejie",
    studentImage: "/teacher-4.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-08-15",
    dateLabel: "Aug 15, 2026",
    time: "3:30 PM",
    endTime: "4:00 PM",
    durationMinutes: 30,
    status: "Follow-up",
    bookedLabel: "Aug 13 · 2:00 PM",
    bookedAgo: "2 weeks ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Subject difficulty", "Exam preparation"],
      message: "I've been struggling with Mathematics, especially Algebra, and I'm worried about my WAEC preparation.",
      academicLevel: "SSS2",
      subjects: ["Mathematics", "Physics"],
      examGoal: "WAEC",
      goalText: "Improve my Mathematics grade and know what I should focus on before the exam.",
      supportPreferences: ["Find the right tutor/class", "Create a study plan", "Prepare for an exam"],
    },
    aiSummary: {
      summary: "Student is seeking Mathematics support while preparing for WAEC. Main difficulty is Algebra. Student would like help finding appropriate learning support.",
      suggestedTopics: ["Current Mathematics level", "Algebra difficulties", "Study routine", "WAEC preparation", "Tutor/class options"],
    },
    sessionNotes: {
      discussed: "Student discussed difficulty with Mathematics and preparation for WAEC. Student needs structured Algebra revision and additional support.",
    },
    outcome: "Tutor recommended",
    sessionSummary: "We discussed the areas of Mathematics you're finding challenging, especially Algebra, and looked at ways to build your confidence ahead of WAEC. I've recommended a tutor who specializes in this area.",
    recommendation: seedMathTutor
      ? { type: "tutor", message: `${seedMathTutor.name} specializes in Mathematics for WAEC and has strong reviews helping students strengthen Algebra before exams.`, tutorSlug: seedMathTutor.slug }
      : undefined,
    followUp: { needed: true, date: "Aug 29, 2026", appointmentId: "cns-13" },
    actionPlan: {
      title: "Cynthia's Action Plan",
      createdDate: "Aug 15, 2026",
      tasks: [
        { label: "Review Algebra basics", status: "Done", completedDate: "Aug 26, 2026" },
        { label: "Practise WAEC past questions", status: "Upcoming", dueDate: "Aug 31, 2026" },
        { label: "Follow up with Benny", status: "Upcoming", dueDate: "Sept 5, 2026" },
      ],
    },
    counsellorNotes: "Student appears motivated but needs help creating a consistent study routine. Recommend weekly check-ins until WAEC.",
    studentEmail: "cynthiaejie@gmail.com",
    studentPhone: "+234 801 234 5678",
    studentLocation: "Lagos, Nigeria",
    studentMemberSince: "May 16, 2026",
  },
  {
    id: "cns-9",
    student: "David O.",
    studentImage: "/teacher-1.jpg.png",
    level: "SSS3",
    exam: "WAEC",
    dateISO: "2026-08-20",
    dateLabel: "Aug 20, 2026",
    time: "3:00 PM",
    endTime: "3:30 PM",
    durationMinutes: 30,
    status: "Follow-up",
    bookedLabel: "Aug 18 · 11:00 AM",
    bookedAgo: "1 week ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Finding a tutor"],
      message: "Not sure which Mathematics tutor to choose.",
      academicLevel: "SSS3",
      subjects: ["Mathematics"],
      examGoal: "WAEC",
      goalText: "Choose a tutor and start lessons.",
      supportPreferences: ["Find the right tutor/class"],
    },
    aiSummary: {
      summary: "Student needed help narrowing down a Mathematics tutor before WAEC.",
      suggestedTopics: ["Shortlist of tutors", "Trial lesson", "Schedule fit"],
    },
    sessionNotes: {
      discussed: "Walked through two tutor profiles that fit his schedule and budget. He'll book a trial lesson this week.",
    },
    outcome: "Tutor recommended",
    sessionSummary: "We went through a couple of Mathematics tutors who fit your schedule and budget, and I've recommended one with strong experience preparing students for WAEC.",
    recommendation: seedMathTutor
      ? { type: "tutor", message: `${seedMathTutor.name} fits your schedule and has strong experience preparing students for WAEC Mathematics.`, tutorSlug: seedMathTutor.slug }
      : undefined,
    followUp: { needed: true, date: "Aug 30, 2026" },
  },
  {
    id: "cns-10",
    student: "Amaka N.",
    studentImage: "/teacher-2.jpg.png",
    level: "100 Level",
    exam: "—",
    dateISO: "2026-08-15",
    dateLabel: "Aug 15, 2026",
    time: "1:00 PM",
    endTime: "1:30 PM",
    durationMinutes: 30,
    status: "Follow-up",
    bookedLabel: "Aug 13 · 9:00 AM",
    bookedAgo: "2 weeks ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Study planning"],
      message: "Struggling to balance coursework this semester.",
      academicLevel: "100 Level",
      subjects: ["General Studies"],
      examGoal: "No specific exam",
      goalText: "Build a study routine.",
      supportPreferences: ["Create a study plan"],
    },
    aiSummary: {
      summary: "Student needed a realistic weekly study plan as a first-year university student.",
      suggestedTopics: ["Course load", "Weekly schedule", "Progress check-in"],
    },
    sessionNotes: {
      discussed: "Built a weekly study block schedule together. She'll try it for two weeks before the next check-in.",
    },
    outcome: "Study plan recommended",
    sessionSummary: "We built a weekly study schedule together to help you balance your coursework this semester, and agreed to check back in on how it's working for you.",
    recommendation: { type: "study-plan", message: "Follow this weekly study schedule for two weeks, then we'll check how it's working for you." },
    followUp: { needed: true, date: "Sep 2, 2026" },
    actionPlan: {
      title: "Amaka's Action Plan",
      createdDate: "Aug 15, 2026",
      tasks: [
        { label: "Follow the new weekly study schedule", status: "In Progress" },
        { label: "Track time spent per course for 2 weeks", status: "In Progress" },
        { label: "Review progress with Benny", status: "Upcoming" },
      ],
    },
  },

  // A couple of fully closed cases, no follow-up needed, for realistic totals.
  {
    id: "cns-11",
    student: "Ibrahim Bello",
    studentImage: "/teacher-3.jpg.png",
    level: "SSS3",
    exam: "WAEC",
    dateISO: "2026-08-12",
    dateLabel: "Aug 12, 2026",
    time: "10:00 AM",
    endTime: "10:30 AM",
    durationMinutes: 30,
    status: "Completed",
    bookedLabel: "Aug 10 · 4:00 PM",
    bookedAgo: "2 weeks ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Choosing subjects or courses"],
      message: "Unsure which subject combination to pick for university applications.",
      academicLevel: "SSS3",
      subjects: ["Government", "Literature"],
      examGoal: "WAEC",
      goalText: "Settle on a subject combination for Law.",
      supportPreferences: ["Understand my options"],
    },
    aiSummary: {
      summary: "Student wanted guidance choosing a subject combination for a Law application.",
      suggestedTopics: ["University requirements", "Current subject strengths", "Final combination"],
    },
    sessionNotes: {
      discussed: "Reviewed university subject requirements for Law and confirmed Government and Literature as his strongest fit.",
    },
    outcome: "No further action",
    sessionSummary: "We reviewed university subject requirements for Law and confirmed that Government and Literature are a strong fit for what you're aiming for.",
    followUp: { needed: false },
  },
  {
    id: "cns-12",
    student: "Mary Bello",
    studentImage: "/teacher-2.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-08-08",
    dateLabel: "Aug 8, 2026",
    time: "2:00 PM",
    endTime: "2:30 PM",
    durationMinutes: 30,
    status: "Completed",
    bookedLabel: "Aug 6 · 1:00 PM",
    bookedAgo: "3 weeks ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Talking through an academic challenge"],
      message: "Losing confidence in English Language after a poor test result.",
      academicLevel: "SSS2",
      subjects: ["English Language"],
      examGoal: "School examination",
      goalText: "Feel more confident writing essays.",
      supportPreferences: ["Talk through a challenge"],
    },
    aiSummary: {
      summary: "Student needed a confidence check-in after a difficult English Language test result.",
      suggestedTopics: ["What went wrong on the test", "Small, achievable writing goals"],
    },
    sessionNotes: {
      discussed: "Talked through the test result and agreed on a small weekly writing goal to rebuild confidence.",
    },
    outcome: "No further action",
    sessionSummary: "We talked through your recent English Language test result and agreed on a small weekly writing goal to help rebuild your confidence.",
    followUp: { needed: false },
  },

  // The real follow-up appointment created from cns-8's "Follow-up required"
  // outcome — referenced by cns-8.followUp.appointmentId, not a duplicate.
  {
    id: "cns-13",
    student: "Cynthia Ejie",
    studentImage: "/teacher-4.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-08-29",
    dateLabel: "Aug 29, 2026",
    time: "4:00 PM",
    endTime: "4:30 PM",
    durationMinutes: 30,
    status: "Upcoming",
    bookedLabel: "Aug 18 · 4:30 PM",
    bookedAgo: "1 week ago",
    intakeReviewed: true,
    intake: {
      concerns: ["Subject difficulty", "Exam preparation"],
      message: "Follow-up on Mathematics progress ahead of WAEC.",
      academicLevel: "SSS2",
      subjects: ["Mathematics", "Physics"],
      examGoal: "WAEC",
      goalText: "Check progress on Algebra revision and the Mathematics tutor recommendation.",
      supportPreferences: ["Find the right tutor/class", "Create a study plan", "Prepare for an exam"],
    },
    aiSummary: {
      summary: "Follow-up session booked from Cynthia's Aug 15 counselling session to check progress on Algebra revision and her Mathematics tutor search.",
      suggestedTopics: ["Progress since last session", "Tutor fit", "Remaining WAEC timeline"],
    },
    followUp: { needed: true, date: "Sept 5, 2026", appointmentId: "cns-14" },
  },

  // A second, further-out follow-up already on the books beyond cns-13 —
  // referenced by cns-13.followUp.appointmentId, not a duplicate.
  {
    id: "cns-14",
    student: "Cynthia Ejie",
    studentImage: "/teacher-4.jpg.png",
    level: "SSS2",
    exam: "WAEC",
    dateISO: "2026-09-05",
    dateLabel: "Sept 5, 2026",
    time: "4:00 PM",
    endTime: "4:30 PM",
    durationMinutes: 30,
    status: "Upcoming",
    bookedLabel: "Aug 29 · 4:30 PM",
    bookedAgo: "Just booked",
    intakeReviewed: true,
    intake: {
      concerns: ["Subject difficulty"],
      message: "I find algebra and word problems very difficult.",
      academicLevel: "SSS2",
      subjects: ["Mathematics"],
      examGoal: "WAEC 2026",
      goalText: "Improve my WAEC Mathematics performance and gain confidence.",
      supportPreferences: ["Find the right tutor/class", "Create a study plan", "Prepare for an exam"],
    },
    aiSummary: {
      summary: "Second follow-up booked from Cynthia's Aug 29 counselling session to review progress with her Mathematics tutor and continue Algebra revision ahead of WAEC.",
      suggestedTopics: ["Progress with recommended tutor", "Algebra revision progress", "Remaining WAEC timeline"],
    },
  },
];

// Drives the student dashboard's Counselling nav item and dashboard card —
// visible once a student has any real, non-cancelled counselling record
// (a "New Booking" already means they successfully scheduled with Benny;
// review is just internal admin housekeeping, not a gate on visibility).
export function hasCounsellingRecords(studentName: string): boolean {
  return initialCounsellingAppointments.some((a) => a.student === studentName && a.status !== "Cancelled");
}

// Whether the nav item should show its small "needs attention" badge — an
// upcoming session is the clearest, least ambiguous signal.
export function hasUpcomingCounsellingSession(studentName: string): boolean {
  return initialCounsellingAppointments.some(
    (a) => a.student === studentName && (a.status === "New Booking" || a.status === "Upcoming" || a.status === "In Progress")
  );
}

export const counsellingDashboardStats = {
  todaysAppointments: 3,
  newBookings: 3,
  upcomingNext7Days: 8,
  completedThisMonth: 32,
  followUpsDue: 3,
};

export type RecentActivityType = "booking" | "intake" | "session" | "action-plan";

export interface RecentCounsellingActivity {
  id: string;
  type: RecentActivityType;
  title: string;
  description: string;
  time: string;
}

export const recentCounsellingActivity: RecentCounsellingActivity[] = [
  { id: "rca-1", type: "booking", title: "New counselling session booked by Cynthia Ejie", description: "Mathematics difficulty · Aug 27, 4:00 PM", time: "10 minutes ago" },
  { id: "rca-2", type: "intake", title: "Intake form submitted by David O.", description: "Needs help finding the right tutor", time: "45 minutes ago" },
  { id: "rca-3", type: "session", title: "Counselling session completed with Amaka N.", description: "Study planning", time: "2 hours ago" },
  { id: "rca-4", type: "action-plan", title: "Action plan updated for Joshua A.", description: "Subject difficulty, Physics", time: "3 hours ago" },
];
