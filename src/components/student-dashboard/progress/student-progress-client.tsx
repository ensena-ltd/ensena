"use client";

import { useMemo } from "react";
import { Award, TrendingDown, TrendingUp } from "lucide-react";

import {
  progressAchievements,
  progressMonthlyTrend,
  studentOverallProgress,
  studentQuickStats,
  weakStrongSubjects,
} from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

export function StudentProgressClient() {
  const sparklinePoints = useMemo(() => {
    const max = Math.max(...progressMonthlyTrend);
    const min = Math.min(...progressMonthlyTrend);
    const spread = max - min || 1;
    return progressMonthlyTrend.map((v, i) => `${(i / (progressMonthlyTrend.length - 1)) * 300},${70 - ((v - min) / spread) * 65}`).join(" ");
  }, []);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Progress</h1>
        <p className="mt-1 text-sm text-ensena-muted">A full picture of how you&apos;re doing across all your subjects.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {studentQuickStats.slice(0, 5).map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">{stat.label}</p>
            <p className="text-xl font-semibold text-ensena-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Monthly Improvement</h2>
          <svg viewBox="0 0 300 70" className="mt-3 h-24 w-full" preserveAspectRatio="none">
            <polyline points={sparklinePoints} fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subject Progress</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {studentOverallProgress.subjects.map((s) => (
              <div key={s.subject} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-ensena-muted">{s.subject}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                </div>
                <span className="w-10 shrink-0 text-right font-medium text-ensena-ink">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <TrendingUp className="size-4.5 text-ensena-success" /> Strong Subjects
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {weakStrongSubjects.strong.map((s) => (
              <span key={s} className="rounded-full bg-ensena-success/10 px-3 py-1.5 text-sm font-medium text-ensena-success">{s}</span>
            ))}
          </div>
          <h2 className="mt-4 flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <TrendingDown className="size-4.5 text-amber-600" /> Needs Improvement
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {weakStrongSubjects.weak.map((s) => (
              <span key={s} className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">{s}</span>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
            Recommendation: Book an extra French lesson this week to build conversation confidence.
          </p>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Award className="size-4.5 text-amber-500" /> Achievements
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {progressAchievements.map((a) => (
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
