"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supportTypeOptions, type SupportTypeId } from "@/lib/academic-support-types";
import { formatNaira } from "@/lib/format";
import {
  academicLevelFilterOptions,
  availabilityFilterOptions,
  classSizeOptions,
  subjectFilterOptions,
} from "@/lib/group-classes-data";
import { allClassGrades, classGradeOptionsFor } from "@/lib/class-grade-taxonomy";

export interface GroupClassFiltersState {
  supportTypes: SupportTypeId[];
  levels: string[];
  grades: string[];
  subjects: string[];
  maxPrice: number;
  classSizeMax: number | null;
  availability: string[];
}

export const defaultGroupClassFilters: GroupClassFiltersState = {
  supportTypes: [],
  levels: [],
  grades: [],
  subjects: [],
  maxPrice: 3000,
  classSizeMax: null,
  availability: [],
};

// Contextual to the selected Educational Level(s) — picking "Senior
// Secondary" narrows this to SS1–SS3 rather than showing every grade
// across every level. No level selected shows every real grade so a
// visitor can filter by grade first if that's how they think about it.
export function gradeOptionsForLevels(levels: string[]): string[] {
  if (levels.length === 0) return allClassGrades;
  const seen = new Set<string>();
  const options: string[] = [];
  for (const level of levels) {
    for (const grade of classGradeOptionsFor(level)) {
      if (!seen.has(grade)) {
        seen.add(grade);
        options.push(grade);
      }
    }
  }
  return options;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ensena-border py-5 first:pt-0 last:border-0">
      <h3 className="text-sm font-semibold text-ensena-ink">{title}</h3>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ensena-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-ensena-border accent-ensena-primary"
      />
      {label}
    </label>
  );
}

export function GroupClassesFilters({
  filters,
  onChange,
}: {
  filters: GroupClassFiltersState;
  onChange: (filters: GroupClassFiltersState) => void;
}) {
  const [subjectQuery, setSubjectQuery] = useState("");
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const visibleSubjects = subjectFilterOptions
    .filter((s) => s.toLowerCase().includes(subjectQuery.toLowerCase()))
    .slice(0, showAllSubjects || subjectQuery ? undefined : 7);

  const gradeOptions = gradeOptionsForLevels(filters.levels);

  const isEmpty =
    filters.supportTypes.length === 0 &&
    filters.levels.length === 0 &&
    filters.grades.length === 0 &&
    filters.subjects.length === 0 &&
    filters.maxPrice === defaultGroupClassFilters.maxPrice &&
    filters.classSizeMax === null &&
    filters.availability.length === 0;

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Filters</h2>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => onChange(defaultGroupClassFilters)}
            className="text-sm font-medium text-ensena-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="What do you need help with?">
        {supportTypeOptions.map((option) => (
          <CheckboxRow
            key={option.id}
            label={option.label}
            checked={filters.supportTypes.includes(option.id)}
            onChange={() => onChange({ ...filters, supportTypes: toggle(filters.supportTypes, option.id) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Education Level">
        {academicLevelFilterOptions.map((level) => (
          <CheckboxRow
            key={level}
            label={level}
            checked={filters.levels.includes(level)}
            onChange={() => {
              const nextLevels = toggle(filters.levels, level);
              // Selecting/deselecting a level can invalidate a previously
              // chosen grade that no longer belongs to any checked level.
              const validGrades = gradeOptionsForLevels(nextLevels);
              onChange({ ...filters, levels: nextLevels, grades: filters.grades.filter((g) => validGrades.includes(g)) });
            }}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Class / Grade">
        {gradeOptions.map((grade) => (
          <CheckboxRow
            key={grade}
            label={grade}
            checked={filters.grades.includes(grade)}
            onChange={() => onChange({ ...filters, grades: toggle(filters.grades, grade) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Subject">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ensena-muted" />
          <Input
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            placeholder="Search subjects"
            className="h-8 rounded-lg border-ensena-border pl-8 text-sm"
          />
        </div>
        {visibleSubjects.map((subject) => (
          <CheckboxRow
            key={subject}
            label={subject}
            checked={filters.subjects.includes(subject)}
            onChange={() => onChange({ ...filters, subjects: toggle(filters.subjects, subject) })}
          />
        ))}
        {!subjectQuery && !showAllSubjects && subjectFilterOptions.length > 7 && (
          <button
            type="button"
            onClick={() => setShowAllSubjects(true)}
            className="self-start text-sm font-medium text-ensena-primary hover:underline"
          >
            Show more
          </button>
        )}
      </FilterGroup>

      <FilterGroup title="Price Range (per session)">
        <Slider
          min={500}
          max={3000}
          step={100}
          value={filters.maxPrice}
          onValueChange={(value) => onChange({ ...filters, maxPrice: value as number })}
        />
        <div className="flex items-center justify-between text-xs text-ensena-muted">
          <span>{formatNaira(500)}</span>
          <span>
            Up to {filters.maxPrice >= 3000 ? formatNaira(3000) + "+" : formatNaira(filters.maxPrice)}
          </span>
        </div>
      </FilterGroup>

      <FilterGroup title="Class Size">
        {classSizeOptions.map((option) => (
          <CheckboxRow
            key={option.label}
            label={option.label}
            checked={filters.classSizeMax === option.max}
            onChange={() =>
              onChange({
                ...filters,
                classSizeMax: filters.classSizeMax === option.max ? null : option.max,
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Availability">
        {availabilityFilterOptions.map((slot) => (
          <CheckboxRow
            key={slot}
            label={slot}
            checked={filters.availability.includes(slot)}
            onChange={() => onChange({ ...filters, availability: toggle(filters.availability, slot) })}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}
