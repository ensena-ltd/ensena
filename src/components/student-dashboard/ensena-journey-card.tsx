import { Check } from "lucide-react";

import { studentEnsenaJourney, studentNextMilestone } from "@/lib/milestones-data";

export function EnsenaJourneyCard() {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Ensena Journey</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {studentEnsenaJourney.map((step) => (
          <li key={step.label} className="flex items-center gap-2.5 text-sm">
            <span className={step.done ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-success text-white" : "flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft"}>
              {step.done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="text-ensena-ink">{step.label}</span>
            {step.date && <span className="ml-auto text-xs text-ensena-muted">{step.date}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl bg-ensena-primary/5 px-3 py-2.5 text-sm text-ensena-ink">
        Next milestone: <span className="font-semibold">{studentNextMilestone}</span>
      </div>
    </div>
  );
}
