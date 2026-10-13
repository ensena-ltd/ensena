"use client";

import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

import { learningPaths } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const statusIcon = { Completed: CheckCircle2, "In Progress": PlayCircle, "Not Started": Circle };
const statusColor = { Completed: "text-ensena-success", "In Progress": "text-ensena-primary", "Not Started": "text-ensena-border" };

export function LearningPathsClient() {
  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Learning Paths</h1>
        <p className="mt-1 text-sm text-ensena-muted">Structured courses to help you reach your learning goals.</p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {learningPaths.map((path) => (
          <div key={path.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-ensena-muted">{path.subject}</p>
                <h2 className="font-heading text-lg font-semibold text-ensena-ink">{path.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-ensena-ink">{path.overallPct}%</p>
                <p className="text-xs text-ensena-muted">Complete</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
              <div className="h-full rounded-full" style={{ width: `${path.overallPct}%`, backgroundColor: path.color }} />
            </div>

            <ul className="mt-4 flex flex-col divide-y divide-ensena-border">
              {path.modules.map((m) => {
                const Icon = statusIcon[m.status];
                return (
                  <li key={m.title} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2.5">
                      <Icon className={cn("size-4.5 shrink-0", statusColor[m.status])} />
                      <span className={cn(m.status === "Not Started" ? "text-ensena-muted" : "text-ensena-ink")}>{m.title}</span>
                    </span>
                    <span className="text-xs font-medium text-ensena-muted">{m.status}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
