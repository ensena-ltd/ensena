export type StudyPlannerView = "Today" | "Week" | "Month";

export type CalendarEventType = "Lesson" | "GroupClass" | "Counselling" | "Assignment" | "StudyTask" | "Exam";

export interface WeekCalendarEvent {
  id: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  time: string;
  title: string;
  subtitle?: string;
  type: CalendarEventType;
  allDay?: boolean;
}

export const eventTypeStyles: Record<CalendarEventType, string> = {
  Lesson: "bg-rose-50 border-rose-200 text-rose-700",
  GroupClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Counselling: "bg-violet-50 border-violet-200 text-violet-700",
  Assignment: "bg-amber-50 border-amber-200 text-amber-700",
  StudyTask: "bg-[#CBEFFF]/50 border-[#9BD9F5] text-[#1E7BA6]",
  Exam: "bg-slate-100 border-slate-300 text-slate-700",
};

export const weekRangeLabel = "May 20 – May 26, 2024";

export const weekCalendarEvents: WeekCalendarEvent[] = [
  { id: "e1", day: "Mon", time: "10:00 – 11:00 AM", title: "Physics Revision", type: "StudyTask" },
  { id: "e2", day: "Mon", time: "4:00 – 5:00 PM", title: "Math Lesson", type: "Lesson" },
  { id: "e3", day: "Mon", time: "8:00 – 9:00 PM", title: "Chemistry Practice", type: "StudyTask" },

  { id: "e4", day: "Tue", time: "Due tomorrow", title: "Essay Writing Assignment", type: "Assignment", allDay: true },
  { id: "e5", day: "Tue", time: "10:00 – 11:30 AM", title: "Biology Group Class", type: "GroupClass" },
  { id: "e6", day: "Tue", time: "5:00 – 6:00 PM", title: "English Lesson", type: "Lesson" },
  { id: "e7", day: "Tue", time: "8:00 – 8:45 PM", title: "Read Chapter 4", type: "StudyTask" },

  { id: "e8", day: "Wed", time: "6:00 – 7:00 PM", title: "Math Revision", type: "StudyTask" },

  { id: "e9", day: "Thu", time: "Due today", title: "Physics Assignment", type: "Assignment", allDay: true },
  { id: "e10", day: "Thu", time: "4:00 – 5:00 PM", title: "Math Lesson", type: "Lesson" },
  { id: "e11", day: "Thu", time: "7:30 – 8:30 PM", title: "Physics Assignment", type: "StudyTask" },

  { id: "e12", day: "Fri", time: "3:00 – 3:45 PM", title: "Counselling Session", type: "Counselling" },

  { id: "e13", day: "Sat", time: "11:00 AM – 12:30 PM", title: "Chemistry Group Class", type: "GroupClass" },
  { id: "e14", day: "Sat", time: "2:00 – 3:00 PM", title: "Practice Questions", type: "StudyTask" },

  { id: "e15", day: "Sun", time: "10:00 – 11:00 AM", title: "Study Plan Review", type: "StudyTask" },
  { id: "e16", day: "Sun", time: "7:00 – 7:30 PM", title: "Plan Next Week", type: "StudyTask" },
];

export interface TodaysPlanTask {
  id: string;
  time: string;
  title: string;
  duration: string;
  subtitle: string;
  actionLabel: string;
  completed: boolean;
  meetingLink?: string;
}

export const todaysPlan: TodaysPlanTask[] = [
  { id: "t1", time: "4:00 PM", title: "Mathematics Lesson with Emeka", duration: "45 min", subtitle: "Quadratic Equations", actionLabel: "Join Classroom", completed: true, meetingLink: "https://ensena.co/room/demo" },
  { id: "t2", time: "6:00 PM", title: "English Essay Writing", duration: "60 min", subtitle: "Improve essay structure and coherence", actionLabel: "Start Study Session", completed: false },
  { id: "t3", time: "8:00 PM", title: "Physics Assignment", duration: "45 min", subtitle: "Work on questions 1 – 5", actionLabel: "Mark Complete", completed: false },
];

export const todaysProgress = {
  pct: 67,
  tasksCompletedLabel: "2 / 3",
  studyTime: "1h 30m",
  lessons: 1,
  assignments: 0,
};

export interface UpcomingDeadline {
  id: string;
  title: string;
  date: string;
  badge: string;
  badgeTint: string;
}

export const upcomingDeadlines: UpcomingDeadline[] = [
  { id: "d1", title: "Physics Assignment", date: "Due today", badge: "Today", badgeTint: "bg-amber-100 text-amber-700" },
  { id: "d2", title: "Essay Writing Assignment", date: "Due tomorrow", badge: "Tomorrow", badgeTint: "bg-[#CBEFFF] text-[#1E7BA6]" },
  { id: "d3", title: "WAEC Mathematics Mock", date: "24 May 2024", badge: "3 days", badgeTint: "bg-ensena-bg-soft text-ensena-muted" },
];

export interface UpcomingLessonPreview {
  id: string;
  tutor: string;
  tutorImage: string;
  subject: string;
  when: string;
  status: "Upcoming";
  actionLabel: "Join" | "View";
}

export const upcomingLessonsPreview: UpcomingLessonPreview[] = [
  { id: "l1", tutor: "Emeka Okafor", tutorImage: "/teacher-3.jpg.png", subject: "Mathematics with Emeka", when: "Tomorrow · 4:00 PM – 5:00 PM", status: "Upcoming", actionLabel: "Join" },
  { id: "l2", tutor: "Zara Bello", tutorImage: "/teacher-1.jpg.png", subject: "English with Zara", when: "Thu, 23 May · 5:00 PM – 6:00 PM", status: "Upcoming", actionLabel: "Join" },
  { id: "l3", tutor: "Adaeze Okonkwo", tutorImage: "/teacher-2.jpg.png", subject: "Biology Group Class", when: "Sat, 25 May · 11:00 AM – 12:30 PM", status: "Upcoming", actionLabel: "View" },
];

export interface TutorAssignment {
  id: string;
  title: string;
  fromTutor: string;
  due: string;
  status: "Pending" | "Submitted";
}

export const tutorAssignments: TutorAssignment[] = [
  { id: "a1", title: "Essay Writing Assignment", fromTutor: "Emeka Okafor", due: "Friday", status: "Pending" },
  { id: "a2", title: "Physics Practice Questions", fromTutor: "Chioma Nwosu", due: "Tomorrow", status: "Pending" },
  { id: "a3", title: "Algebra Worksheet", fromTutor: "Adaeze Okonkwo", due: "May 20", status: "Submitted" },
];

export const learningGoal = {
  title: "WAEC Mathematics",
  target: "Score A",
  examDate: "24 May 2024",
  progressPct: 78,
  focusAreas: ["Algebra", "Geometry", "Statistics", "Trigonometry"],
};

export const weeklyStudyGoal = {
  targetHours: 6,
  studiedHours: 4.5,
  sessions: 5,
};

export interface StudyTaskDraft {
  subject: string;
  title: string;
  date: string;
  startTime: string;
  duration: string;
  priority: "Low" | "Medium" | "High";
  notes: string;
}

export const defaultStudyTaskDraft: StudyTaskDraft = {
  subject: "Mathematics",
  title: "",
  date: "",
  startTime: "",
  duration: "45 min",
  priority: "Medium",
  notes: "",
};
