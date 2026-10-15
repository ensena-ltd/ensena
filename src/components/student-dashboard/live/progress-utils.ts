// Progress figures for the live student dashboard and /student-dashboard/progress,
// all derived from the student's own bookings, completed lessons and study
// tasks — nothing estimated. "Progress" in a subject is how much of the
// learning planned for it is done: completed lessons + finished study tasks,
// out of every lesson booked (not cancelled) + every study task for it.
import type { LearningSession, StudentLearningSnapshot, StudyTaskRow } from "@/lib/student-learning-server";

import { addDaysISO, platformISODate, weekBounds } from "./learning-utils";

export const SUBJECT_COLORS = ["#6C63FF", "#E8833A", "#22A06B", "#E0457B", "#9B6BD6", "#2F9BE0", "#D4A72C"];

export interface SubjectProgress {
  subject: string;
  pct: number;
  done: number;
  planned: number;
  color: string;
}

export interface Achievement {
  title: string;
  earned: boolean;
}

export interface ProgressSummary {
  overall: number | null;
  weekly: number | null;
  subjects: SubjectProgress[];
  lessonsCompleted: number;
  activeTutors: number;
  groupClasses: number;
  streakDays: number;
  averageScore: number | null;
  /** Cumulative lessons completed at the end of each of the last six months. */
  monthly: { label: string; value: number }[];
  strong: string[];
  weak: string[];
  achievements: Achievement[];
}

const norm = (s: string) => s.trim().toLowerCase();

function isLesson(s: LearningSession) {
  return s.kind === "private" || s.kind === "group";
}

function isDone(s: LearningSession, nowMs: number) {
  return s.status === "completed" || (s.status === "scheduled" && s.endMs <= nowMs);
}

export function computeProgress(data: StudentLearningSnapshot, tasks: StudyTaskRow[], profileSubjects: string[], nowMs: number): ProgressSummary {
  const lessons = data.sessions.filter((s) => isLesson(s) && s.status !== "cancelled");

  // Subjects: the student's own (profile) first, then any they've booked or planned.
  const names = new Map<string, string>();
  for (const s of [...profileSubjects, ...lessons.map((l) => l.subject), ...tasks.flatMap((t) => (t.subject ? [t.subject] : []))]) {
    if (s && !names.has(norm(s))) names.set(norm(s), s);
  }

  const subjects: SubjectProgress[] = [];
  for (const [key, label] of names) {
    const subjectLessons = lessons.filter((l) => norm(l.subject) === key);
    const subjectTasks = tasks.filter((t) => t.subject && norm(t.subject) === key);
    const planned = subjectLessons.length + subjectTasks.length;
    if (planned === 0) continue;
    const done = subjectLessons.filter((l) => isDone(l, nowMs)).length + subjectTasks.filter((t) => t.done).length;
    subjects.push({ subject: label, pct: Math.round((done / planned) * 100), done, planned, color: "" });
  }
  subjects.sort((a, b) => b.planned - a.planned || a.subject.localeCompare(b.subject));
  subjects.forEach((s, i) => (s.color = SUBJECT_COLORS[i % SUBJECT_COLORS.length]));

  const totalPlanned = lessons.length + tasks.length;
  const totalDone = lessons.filter((l) => isDone(l, nowMs)).length + tasks.filter((t) => t.done).length;
  const overall = totalPlanned ? Math.round((totalDone / totalPlanned) * 100) : null;

  // This Mon–Sun: lessons scheduled this week + study tasks due this week.
  const todayISO = platformISODate(nowMs);
  const week = weekBounds(todayISO);
  const weekLessons = lessons.filter((l) => {
    const d = platformISODate(l.startMs);
    return d >= week.start && d <= week.end;
  });
  const weekTasks = tasks.filter((t) => t.dueDate !== null && t.dueDate >= week.start && t.dueDate <= week.end);
  const weekPlanned = weekLessons.length + weekTasks.length;
  const weekly = weekPlanned ? Math.round(((weekLessons.filter((l) => isDone(l, nowMs)).length + weekTasks.filter((t) => t.done).length) / weekPlanned) * 100) : null;

  // Learning streak: consecutive days, ending today (or yesterday if nothing
  // yet today), with a lesson completed or a study task finished.
  const activeDays = new Set<string>([
    ...data.completed.map((c) => platformISODate(c.completedAtMs)),
    ...lessons.filter((l) => isDone(l, nowMs)).map((l) => platformISODate(l.startMs)),
    ...tasks.filter((t) => t.done && t.dueDate && t.dueDate <= todayISO).map((t) => t.dueDate!),
  ]);
  let day = activeDays.has(todayISO) ? todayISO : addDaysISO(todayISO, -1);
  let streakDays = 0;
  while (activeDays.has(day)) {
    streakDays++;
    day = addDaysISO(day, -1);
  }

  const lessonsCompleted = data.completed.length;
  const upcomingOrRecent = lessons.filter((l) => l.endMs > nowMs - 30 * 86_400_000);
  const activeTutors = new Set(upcomingOrRecent.flatMap((l) => (l.personId ? [l.personId] : []))).size;
  const groupClasses = new Set(lessons.filter((l) => l.kind === "group" && l.groupClassId).map((l) => l.groupClassId)).size;
  const averageScore = data.homeworkScores.length ? Math.round(data.homeworkScores.reduce((a, b) => a + b, 0) / data.homeworkScores.length) : null;

  // Six month buckets in platform time, cumulative.
  const monthly: { label: string; value: number }[] = [];
  const [y, m] = todayISO.split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const value = data.completed.filter((c) => platformISODate(c.completedAtMs).slice(0, 7) <= key).length;
    monthly.push({ label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), value });
  }

  const measured = subjects.filter((s) => s.planned >= 2);
  const strong = measured.filter((s) => s.pct >= 70).map((s) => s.subject);
  const weak = measured.filter((s) => s.pct < 50).map((s) => s.subject);
  const reviewsGiven = data.completed.filter((c) => c.review).length;
  const tasksDone = tasks.filter((t) => t.done).length;

  const achievements: Achievement[] = [
    { title: "First Lesson Completed", earned: lessonsCompleted >= 1 },
    { title: "10 Lessons Completed", earned: lessonsCompleted >= 10 },
    { title: "7-Day Study Streak", earned: streakDays >= 7 },
    { title: "30-Day Study Streak", earned: streakDays >= 30 },
    { title: "Joined a Group Class", earned: groupClasses >= 1 },
    { title: "10 Study Tasks Done", earned: tasksDone >= 10 },
    { title: "First Tutor Review", earned: reviewsGiven >= 1 },
  ];

  return { overall, weekly, subjects, lessonsCompleted, activeTutors, groupClasses, streakDays, averageScore, monthly, strong, weak, achievements };
}
