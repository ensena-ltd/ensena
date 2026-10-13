"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import {
  defaultGroupClassFilters,
  gradeOptionsForLevels,
  type GroupClassFiltersState,
} from "@/components/group-classes-page/group-classes-filters";
import { supportTypeOptions } from "@/lib/academic-support-types";
import { formatNaira } from "@/lib/format";
import {
  academicLevelFilterOptions,
  availabilityFilterOptions,
  classSizeOptions,
  subjectFilterOptions,
} from "@/lib/group-classes-data";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Same draft-then-commit full-screen sheet as MobileFilterSheet
// (find-teachers) — edits only reach the real filter state when "Show N
// Classes" is tapped.
function OptionRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1 text-base text-ensena-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-5 shrink-0 rounded border-ensena-border text-ensena-primary accent-ensena-primary focus-visible:ring-2 focus-visible:ring-ensena-primary/40"
      />
      {label}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ensena-border py-6 first:pt-0 last:border-0">
      <h3 className="font-heading text-sm font-semibold text-ensena-ink">{title}</h3>
      <div className="mt-3 flex flex-col">{children}</div>
    </div>
  );
}

export function MobileGroupClassFilterSheet({
  onClose,
  filters,
  onApply,
  computeCount,
}: {
  onClose: () => void;
  filters: GroupClassFiltersState;
  onApply: (next: GroupClassFiltersState) => void;
  computeCount: (draft: GroupClassFiltersState) => number;
}) {
  const [draft, setDraft] = useState<GroupClassFiltersState>(filters);
  const [subjectQuery, setSubjectQuery] = useState("");

  const visibleSubjects = subjectFilterOptions.filter((s) => s.toLowerCase().includes(subjectQuery.toLowerCase()));
  const gradeOptions = gradeOptionsForLevels(draft.levels);
  const count = computeCount(draft);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-ensena-border px-4">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">Filters</h2>
        <button
          type="button"
          aria-label="Close filters"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <Section title="What do you need help with?">
          {supportTypeOptions.map((option) => (
            <OptionRow
              key={option.id}
              label={option.label}
              checked={draft.supportTypes.includes(option.id)}
              onChange={() => setDraft({ ...draft, supportTypes: toggle(draft.supportTypes, option.id) })}
            />
          ))}
        </Section>

        <Section title="Education Level">
          {academicLevelFilterOptions.map((level) => (
            <OptionRow
              key={level}
              label={level}
              checked={draft.levels.includes(level)}
              onChange={() => {
                const nextLevels = toggle(draft.levels, level);
                const validGrades = gradeOptionsForLevels(nextLevels);
                setDraft({ ...draft, levels: nextLevels, grades: draft.grades.filter((g) => validGrades.includes(g)) });
              }}
            />
          ))}
        </Section>

        <Section title="Class / Grade">
          {gradeOptions.map((grade) => (
            <OptionRow
              key={grade}
              label={grade}
              checked={draft.grades.includes(grade)}
              onChange={() => setDraft({ ...draft, grades: toggle(draft.grades, grade) })}
            />
          ))}
        </Section>

        <Section title="Subject">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={subjectQuery}
              onChange={(e) => setSubjectQuery(e.target.value)}
              placeholder="Search subjects"
              aria-label="Search subjects"
              className="h-11 w-full rounded-xl border border-ensena-border bg-ensena-surface pl-10 pr-3 text-base text-ensena-ink outline-none placeholder:text-ensena-muted focus-visible:ring-2 focus-visible:ring-ensena-primary/30"
            />
          </div>
          {visibleSubjects.map((subject) => (
            <OptionRow
              key={subject}
              label={subject}
              checked={draft.subjects.includes(subject)}
              onChange={() => setDraft({ ...draft, subjects: toggle(draft.subjects, subject) })}
            />
          ))}
        </Section>

        <Section title="Price Range (per student)">
          <Slider
            min={500}
            max={3000}
            step={100}
            value={draft.maxPrice}
            onValueChange={(value) => setDraft({ ...draft, maxPrice: value as number })}
          />
          <div className="mt-1 flex items-center justify-between text-sm text-ensena-muted">
            <span>{formatNaira(500)}</span>
            <span>Up to {draft.maxPrice >= 3000 ? formatNaira(3000) + "+" : formatNaira(draft.maxPrice)}</span>
          </div>
        </Section>

        <Section title="Class Size">
          {classSizeOptions.map((option) => (
            <OptionRow
              key={option.label}
              label={option.label}
              checked={draft.classSizeMax === option.max}
              onChange={() => setDraft({ ...draft, classSizeMax: draft.classSizeMax === option.max ? null : option.max })}
            />
          ))}
        </Section>

        <Section title="Availability">
          {availabilityFilterOptions.map((slot) => (
            <OptionRow
              key={slot}
              label={slot}
              checked={draft.availability.includes(slot)}
              onChange={() => setDraft({ ...draft, availability: toggle(draft.availability, slot) })}
            />
          ))}
        </Section>
      </div>

      <div
        className="flex shrink-0 items-center gap-3 border-t border-ensena-border px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={() => setDraft(defaultGroupClassFilters)}
          className="h-12 shrink-0 px-2 text-sm font-semibold text-ensena-ink underline underline-offset-2"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
          className="h-12 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Show {count} {count === 1 ? "Class" : "Classes"}
        </button>
      </div>
    </div>
  );
}
