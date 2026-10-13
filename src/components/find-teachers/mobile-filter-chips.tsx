"use client";

import { ChevronDown } from "lucide-react";

import type { FiltersState } from "@/components/find-teachers/teacher-filters";

// Compact summary of the current filter state — every chip taps into the
// same filter sheet (no separate mini-pickers). All three read from
// `filters` (not the desktop hero's separate single-select level/mode),
// since the sheet's "Academic Level" section is the multi-select
// filters.levels checkboxes, and binding the chip to a different field
// than what the sheet edits would be confusing.
function summarize(values: string[], emptyLabel: string): string {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return values[0];
  return `${values.length} selected`;
}

export function MobileFilterChips({
  filters,
  onOpenSheet,
}: {
  filters: FiltersState;
  onOpenSheet: () => void;
}) {
  const chips = [
    { label: "Level", value: summarize(filters.levels, "All levels") },
    { label: "Type", value: summarize(filters.tutorTypes, "Any type") },
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
