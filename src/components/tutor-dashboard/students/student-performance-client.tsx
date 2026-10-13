"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Download,
  Flame,
  Lightbulb,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { generateAiRecommendation } from "@/lib/ai-performance-recommendations";
import { Button } from "@/components/ui/button";
import {
  defaultLearningGoals,
  homeworkStatusStyles,
  initialHomework,
  monthlyImprovementTrend,
  performanceOverviewFor,
  studentAssignments,
  studentLessonHistory,
  subjectProgressFor,
  type LearningGoal,
  type StudentRecord,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentPerformanceClient({ student }: { student: StudentRecord }) {
  const overview = useMemo(() => performanceOverviewFor(student), [student]);
  const progress = useMemo(() => subjectProgressFor(student.id), [student.id]);
  const sortedProgress = [...progress].sort((a, b) => b.percentage - a.percentage);
  const strongest = sortedProgress[0];
  const weakest = sortedProgress[sortedProgress.length - 1];

  const [goals, setGoals] = useState<LearningGoal[]>(defaultLearningGoals[student.id] ?? []);
  const [newGoal, setNewGoal] = useState("");
  const [aiSeed, setAiSeed] = useState(0);
  const [noteQuery, setNoteQuery] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const recommendation = useMemo(() => generateAiRecommendation(student, aiSeed), [student, aiSeed]);

  const lessonHistory = useMemo(() => studentLessonHistory(student.name), [student.name]);
  const lessonNotes = lessonHistory.filter((l) => l.notes);
  const filteredNotes = lessonNotes.filter(
    (l) => noteQuery.trim() === "" || l.notes?.toLowerCase().includes(noteQuery.toLowerCase()) || l.subject.toLowerCase().includes(noteQuery.toLowerCase())
  );

  const homework = initialHomework.filter((h) => h.student === student.name);
  const homeworkSubmitted = homework.filter((h) => h.status === "Submitted" || h.status === "Reviewed").length;
  const homeworkPending = homework.filter((h) => h.status === "Pending Review" || h.status === "Scheduled" || h.status === "Draft").length;
  const homeworkAvg = student.avgScore;

  function addGoal() {
    if (!newGoal.trim()) return;
    setGoals((prev) => [...prev, { id: `g-${Date.now()}`, title: newGoal, done: false }]);
    setNewGoal("");
  }

  function toggleGoal(id: string) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  }

  function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function generateReport() {
    const report = `Ensena Performance Report: ${student.name}
Generated: ${new Date().toLocaleDateString()}

OVERVIEW
Overall Score: ${overview.overallScore}%
Progress: ${overview.progressPct}%
Attendance: ${overview.attendancePct}%
Homework Completion: ${overview.homeworkCompletion}%
Quiz Average: ${overview.quizAverage}%
Assignment Average: ${overview.assignmentAverage}%

RECOMMENDATIONS
${recommendation.learningSummary}
${recommendation.performanceTrend}
${recommendation.predictedExamPerformance}
Exam Readiness Score: ${recommendation.examReadinessScore}/100

PARENT SUMMARY
${recommendation.parentSummary}
`;
    downloadText(report, `${student.name.replace(/\s+/g, "-")}-performance-report.txt`);
  }

  function emailReport() {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 2500);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{student.name}: Performance Manager</h1>
          <p className="mt-1 text-sm text-ensena-muted">{student.level} · {student.subjects.join(", ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateReport} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
            <Download className="size-3.5" /> Generate Report
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
            <Download className="size-3.5" /> Export PDF
          </Button>
          <Button variant="outline" onClick={generateReport} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
            <Download className="size-3.5" /> Download Report
          </Button>
          <Button onClick={emailReport} className="h-9 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-4 text-xs font-semibold text-white">
            <Mail className="size-3.5" /> {emailSent ? "Sent!" : "Email Report"}
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Overall Score</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.overallScore}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Progress</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.progressPct}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Attendance</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.attendancePct}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Homework Completion</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.homeworkCompletion}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Quiz Average</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.quizAverage}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Assignment Average</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.assignmentAverage}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1 text-xs text-ensena-muted"><TrendingUp className="size-3.5 text-ensena-success" /> Monthly Improvement</p>
          <p className="text-xl font-semibold text-ensena-ink">+{overview.monthlyImprovement}%</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1 text-xs text-ensena-muted"><Flame className="size-3.5 text-amber-500" /> Current Streak</p>
          <p className="text-xl font-semibold text-ensena-ink">{overview.currentStreak} lessons</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl bg-ensena-success/10 p-4 text-sm text-ensena-ink">
          <TrendingUp className="size-4 shrink-0 text-ensena-success" />
          Strongest topic: <span className="font-semibold">{strongest?.subject}</span> ({strongest?.percentage}%)
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-ensena-ink">
          <TrendingDown className="size-4 shrink-0 text-amber-600" />
          Weakest topic: <span className="font-semibold">{weakest?.subject}</span> ({weakest?.percentage}%)
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Performance Charts */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Monthly Improvement</h2>
          <svg viewBox="0 0 300 70" className="mt-3 h-20 w-full" preserveAspectRatio="none">
            <polyline
              points={monthlyImprovementTrend
                .map((v, i) => {
                  const max = Math.max(...monthlyImprovementTrend);
                  const min = Math.min(...monthlyImprovementTrend);
                  const x = (i / (monthlyImprovementTrend.length - 1)) * 300;
                  const y = 65 - ((v - min) / (max - min || 1)) * 60;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#6C63FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subject Progress</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {progress.map((p) => (
              <div key={p.subject} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-ensena-muted">{p.subject}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${p.percentage}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right font-medium text-ensena-ink">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Goals */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Target className="size-4.5 text-ensena-primary" /> Learning Goals
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-xl border border-ensena-border p-2.5 text-sm">
                <label className="flex flex-1 items-center gap-2.5">
                  <input type="checkbox" checked={g.done} onChange={() => toggleGoal(g.id)} className="size-4 rounded border-ensena-border accent-ensena-success" />
                  <span className={cn(g.done && "text-ensena-muted line-through")}>{g.title}</span>
                </label>
                <button type="button" onClick={() => removeGoal(g.id)} className="text-xs text-rose-500">
                  Remove
                </button>
              </li>
            ))}
            {goals.length === 0 && <p className="text-sm text-ensena-muted">No goals set yet.</p>}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="e.g. Master Fractions"
              className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-sm"
            />
            <button type="button" onClick={addGoal} aria-label="Add goal" className="flex size-9 items-center justify-center rounded-full bg-ensena-primary text-white">
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Homework + Assignments */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Homework &amp; Assignments</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-ensena-border p-3">
              <p className="text-lg font-semibold text-ensena-ink">{homeworkSubmitted}</p>
              <p className="text-[11px] text-ensena-muted">Submitted</p>
            </div>
            <div className="rounded-xl border border-ensena-border p-3">
              <p className="text-lg font-semibold text-ensena-ink">{homeworkPending}</p>
              <p className="text-[11px] text-ensena-muted">Pending</p>
            </div>
            <div className="rounded-xl border border-ensena-border p-3">
              <p className="text-lg font-semibold text-ensena-ink">{homeworkAvg}%</p>
              <p className="text-[11px] text-ensena-muted">Average</p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {homework.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-lg border border-ensena-border p-2.5 text-xs">
                <span className="font-medium text-ensena-ink">{h.title}</span>
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", homeworkStatusStyles[h.status])}>{h.status}</span>
              </li>
            ))}
            {homework.length === 0 && <p className="text-sm text-ensena-muted">No homework recorded yet.</p>}
          </ul>
          <p className="mt-3 text-xs font-semibold text-ensena-ink">Assignments (all subjects)</p>
          <ul className="mt-1 flex flex-col gap-1.5">
            {studentAssignments.map((a) => (
              <li key={a.title} className="flex items-center justify-between text-xs text-ensena-muted">
                <span>{a.title}</span>
                <span>{a.status}{a.grade ? ` · ${a.grade}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lesson Notes */}
      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Lesson Notes</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={noteQuery}
              onChange={(e) => setNoteQuery(e.target.value)}
              placeholder="Search notes…"
              className="h-9 w-56 rounded-full border border-ensena-border pl-9 pr-3 text-sm"
            />
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {filteredNotes.map((l, i) => (
            <li key={i} className="rounded-xl border border-ensena-border p-3 text-sm">
              <p className="text-xs font-semibold text-ensena-ink">{l.date} · {l.subject}</p>
              <p className="mt-1 text-ensena-muted">{l.notes}</p>
            </li>
          ))}
          {filteredNotes.length === 0 && <p className="py-4 text-center text-sm text-ensena-muted">No lesson notes found.</p>}
        </ul>
      </div>

      {/* Performance Recommendations */}
      <div className="mt-5 rounded-2xl border border-ensena-cta-from/30 bg-gradient-to-br from-ensena-cta-from/5 to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Lightbulb className="size-4.5 text-ensena-cta-to" /> Recommendations
          </h2>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ensena-ink shadow-sm">
              Exam Readiness: {recommendation.examReadinessScore}/100
            </span>
            <button
              type="button"
              onClick={() => setAiSeed((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <RefreshCcw className="size-3.5" /> Regenerate
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Learning Summary</p>
            <p className="mt-1 text-sm text-ensena-muted">{recommendation.learningSummary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Performance Trend</p>
            <p className="mt-1 text-sm text-ensena-muted">{recommendation.performanceTrend}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Predicted Exam Performance</p>
            <p className="mt-1 text-sm text-ensena-muted">{recommendation.predictedExamPerformance}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Recommended Lesson Frequency</p>
            <p className="mt-1 text-sm text-ensena-muted">{recommendation.recommendedLessonFrequency}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Strengths</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ensena-muted">
              {recommendation.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Weaknesses</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ensena-muted">
              {recommendation.weaknesses.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Suggested Homework</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ensena-muted">
              {recommendation.suggestedHomework.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-ensena-ink">Weekly Action Plan</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ensena-muted">
              {recommendation.weeklyActionPlan.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-ensena-ink shadow-sm">
          <Award className="mt-0.5 size-4 shrink-0 text-amber-500" />
          {recommendation.motivationalFeedback}
        </div>

        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-ensena-muted shadow-sm">
          <p className="text-xs font-semibold text-ensena-ink">Parent Summary</p>
          {recommendation.parentSummary}
        </div>
      </div>
    </div>
  );
}
