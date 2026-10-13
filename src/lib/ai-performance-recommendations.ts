import type { StudentRecord } from "@/lib/tutor-dashboard-data";
import { subjectProgressFor } from "@/lib/tutor-dashboard-data";

export interface AiRecommendation {
  learningSummary: string;
  performanceTrend: string;
  predictedExamPerformance: string;
  examReadinessScore: number;
  strengths: string[];
  weaknesses: string[];
  topicsToRevise: string[];
  suggestedHomework: string[];
  suggestedExercises: string[];
  recommendedLessonFrequency: string;
  studyRecommendations: string[];
  recommendedVideos: string[];
  recommendedGroupClasses: string[];
  weeklyActionPlan: string[];
  motivationalFeedback: string;
  parentSummary: string;
}

function scoreLabel(pct: number): "strong" | "developing" | "weak" {
  if (pct >= 80) return "strong";
  if (pct >= 60) return "developing";
  return "weak";
}

export function generateAiRecommendation(student: StudentRecord, seedOffset = 0): AiRecommendation {
  const progress = subjectProgressFor(student.id);
  const sorted = [...progress].sort((a, b) => b.percentage - a.percentage);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const overall = Math.round((student.progressPct + student.attendancePct + student.avgScore) / 3);
  const readiness = Math.max(35, Math.min(98, overall + seedOffset - 3));

  const trendWord = student.progressPct >= 70 ? "improving steadily" : student.progressPct >= 45 ? "showing gradual progress" : "still building momentum";

  const attendanceLabel = scoreLabel(student.attendancePct);
  const homeworkLabel = scoreLabel(student.avgScore);

  return {
    learningSummary: `${student.name} is currently at ${student.progressPct}% overall progress across ${student.subjects.join(" and ")}, with ${student.lessonsCompleted} lessons completed to date.`,
    performanceTrend: `Performance has been ${trendWord} over the last month, with the strongest gains in ${strongest?.subject ?? student.subjects[0]}.`,
    predictedExamPerformance: readiness >= 80
      ? "On current trajectory, likely to score in the top grade band."
      : readiness >= 60
        ? "On current trajectory, likely to pass comfortably with room to reach a higher grade band with focused revision."
        : "Currently at risk of underperforming without additional revision. Early intervention recommended.",
    examReadinessScore: readiness,
    strengths: [
      `${strongest?.subject ?? "Core concepts"} (${strongest?.percentage ?? student.avgScore}%)`,
      attendanceLabel !== "weak" ? `Consistent attendance (${student.attendancePct}%)` : "Willingness to engage during lessons",
    ],
    weaknesses: [
      `${weakest?.subject ?? "Needs more practice"} (${weakest?.percentage ?? 50}%)`,
      homeworkLabel === "weak" ? "Homework completion needs improvement" : "Occasional gaps in exam-technique speed",
    ],
    topicsToRevise: progress.filter((p) => p.percentage < 75).map((p) => p.subject),
    suggestedHomework: [
      `${weakest?.subject ?? student.subjects[0]} practice set (10 questions)`,
      "Past-question review from the last mock test",
    ],
    suggestedExercises: [
      `Timed drills on ${weakest?.subject ?? student.subjects[0]}`,
      "Weekly recap quiz covering the last 2 lessons",
    ],
    recommendedLessonFrequency: student.attendancePct < 85 ? "3x per week to rebuild consistency" : "2x per week is sufficient at the current pace",
    studyRecommendations: [
      "15 minutes of daily review after each lesson",
      `Extra focus on ${weakest?.subject ?? "weaker topics"} before the next mock test`,
    ],
    recommendedVideos: [`${weakest?.subject ?? student.subjects[0]} fundamentals: Ensena video library`],
    recommendedGroupClasses: [`WAEC Revision Bootcamp (${student.subjects[0]} focus)`],
    weeklyActionPlan: [
      `Mon: Review ${weakest?.subject ?? student.subjects[0]} notes`,
      "Wed: Complete assigned homework",
      "Fri: Timed practice quiz",
      "Sun: Parent progress check-in",
    ],
    motivationalFeedback: overall >= 75
      ? `${student.name.split(" ")[0]} is doing great! Keep up the consistent effort!`
      : `${student.name.split(" ")[0]} has real potential. A bit more consistency will make a big difference.`,
    parentSummary: `${student.name} completed ${student.lessonsCompleted} lessons with ${student.attendancePct}% attendance and a ${student.avgScore}% average score this term. ${trendWord === "improving steadily" ? "Progress has been consistent and encouraging." : "We recommend a short additional revision session to build momentum."}`,
  };
}
