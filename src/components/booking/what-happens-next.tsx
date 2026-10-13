import type { LucideIcon } from "lucide-react";

export interface WhatsNextStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function WhatHappensNext({ title, steps }: { title: string; steps: WhatsNextStep[] }) {
  return (
    <div className="rounded-2xl border border-ensena-border p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{step.title}</p>
                <p className="mt-0.5 text-xs text-ensena-muted">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
