"use client";

import { ChevronDown } from "lucide-react";

import type { GroupClassFiltersState } from "@/components/group-classes-page/group-classes-filters";

// Same summarized-chip pattern as MobileFilterChips (find-teachers) — every
// chip opens the same filter sheet, no separate mini-pickers.
function summarize(values: string[], emptyLabel: string): string {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return values[0];
  return `${values.length} selected`;
}

export function MobileGroupClassFilterChips({
  filters,
  onOpenSheet,
}: {
  filters: GroupClassFiltersState;
  onOpenSheet: () => void;
}) {
  const chips = [
    { label: "Level", value: summarize(filters.levels, "All levels") },
    { label: "Class", value: summarize(filters.grades, "All classes") },
    { label: "When", value: summarize(filters.availability, "Anytime") },
  ];

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={onOpenSheet}
          className="flex shrink-0 flex-col items-start gap-0 rounded-2xl border border-ensena-border bg-ensena-surface px-3.5 py-2 text-left"
        >
          <span className="flex items-center gap-1 text-[11px] text-ensena-muted">
            {chip.label}
            <ChevronDown className="size-3" />
          </span>
          <span className="text-sm font-semibold text-ensena-ink">{chip.value}</span>
        </button>
      ))}
    </div>
  );
}
