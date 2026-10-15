"use client";

import Link from "next/link";
import { Award, TrendingDown, TrendingUp } from "lucide-react";

import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import type { StudentLearningSnapshot } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import { useLiveNow } from "./live-shared";
import { computeProgress } from "./progress-utils";

// /student-dashboard/progress with a real account — same layout as the demo
// page, every figure computed from the student's own lessons and study tasks
// (see progress-utils.ts for what each number means).
export function ProgressReal({ data }: { data: StudentLearningSnapshot }) {
  const me = useStudentIdentity();
  const nowMs = useLiveNow(data.generatedAtMs);
  const p = computeProgress(data, data.studyTasks, me.subjects, nowMs);

  const stats = [
    { label: "Lessons Completed", value: String(p.lessonsCompleted) },
    { label: "Active Tutors", value: String(p.activeTutors) },
    { label: "Group Classes", value: String(p.groupClasses) },
    { label: "Learning Streak", value: `${p.streakDays} ${p.streakDays === 1 ? "Day" : "Days"}` },
    { label: "Average Score", value: p.averageScore === null ? "—" : `${p.averageScore}%` },
  ];

  const max = Math.max(...p.monthly.map((m) => m.value));
  const min = Math.min(...p.monthly.map((m) => m.value));
  const spread = max - min || 1;
  const points = p.monthly.map((m, i) => `${(i / (p.monthly.length - 1)) * 300},${max === 0 ? 65 : 70 - ((m.value - min) / spread) * 65}`).join(" ");

  const weakest = p.weak[0];

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Progress</h1>
        <p className="mt-1 text-sm text-ensena-muted">A full picture of how you&apos;re doing across all your subjects.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">{stat.label}</p>
            <p className="text-xl font-semibold text-ensena-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Monthly Improvement</h2>
          <p className="text-xs text-ensena-muted">Lessons completed, last six months</p>
          <svg viewBox="0 0 300 70" className="mt-3 h-24 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`Lessons completed: ${p.monthly.map((m) => `${m.label} ${m.value}`).join(", ")}`}>
            <polyline points={points} fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-ensena-muted">
            {p.monthly.map((m) => (
              <span key={m.label} className="flex flex-col items-center">
                <span>{m.label}</span>
                <span className="font-semibold text-ensena-ink">{m.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subject Progress</h2>
          {p.subjects.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">
              Book a lesson or add study tasks for a subject to see your progress here.{" "}
              <Link href="/student-dashboard/find-a-tutor" className="font-semibold text-ensena-primary hover:underline">Find a tutor</Link>
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {p.subjects.map((s) => (
                <div key={s.subject} className="flex items-center gap-3 text-sm" title={`${s.done} of ${s.planned} lessons and tasks done`}>
                  <span className="w-24 shrink-0 truncate text-ensena-muted">{s.subject}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium text-ensena-ink">{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <TrendingUp className="size-4.5 text-ensena-success" /> Strong Subjects
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.strong.length === 0 ? (
              <span className="text-sm text-ensena-muted">Subjects where you&apos;ve done 70% or more of what you planned will show here.</span>
            ) : (
              p.strong.map((s) => <span key={s} className="rounded-full bg-ensena-success/10 px-3 py-1.5 text-sm font-medium text-ensena-success">{s}</span>)
            )}
          </div>
          <h2 className="mt-4 flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <TrendingDown className="size-4.5 text-amber-600" /> Needs Improvement
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.weak.length === 0 ? (
              <span className="text-sm text-ensena-muted">Nothing falling behind. Nice work.</span>
            ) : (
              p.weak.map((s) => <span key={s} className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">{s}</span>)
            )}
          </div>
          <p className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
            {weakest ? (
              <>
                Recommendation: Book an extra {weakest} lesson this week, or add a few {weakest} study tasks to your{" "}
                <Link href="/student-dashboard/lessons?tab=Study%20Planner" className="font-semibold text-ensena-primary hover:underline">planner</Link>.
              </>
            ) : p.subjects.length === 0 ? (
              "Recommendation: Book your first lesson to start building your progress."
            ) : (
              "Recommendation: Keep up your routine. Plan next week's study tasks to stay on track."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Award className="size-4.5 text-amber-500" /> Achievements
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {p.achievements.map((a) => (
              <li key={a.title} className={cn("flex items-center justify-between rounded-xl border p-3 text-sm", a.earned ? "border-ensena-border" : "border-dashed border-ensena-border opacity-50")}>
                <span className="text-ensena-ink">{a.title}</span>
                {a.earned && <span className="text-xs font-semibold text-ensena-success">Earned</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
