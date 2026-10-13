"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  defaultAcademicStructureFilters,
  departmentOptionsFor,
  courseOptionsFor,
  researchAreaOptionsFor,
  sanitizeAcademicStructure,
  showsGraduateStructure,
  showsUndergraduateStructure,
  type AcademicStructureFilters,
} from "@/lib/academic-structure-filter";
import { supportTypeOptions, type SupportTypeId } from "@/lib/academic-support-types";
import { faculties, researchFields } from "@/lib/academic-taxonomy-data";
import { formatNaira } from "@/lib/format";
import {
  academicLevelFilterOptions,
  availabilityOptions,
  languageOptions,
  subjectOptions,
  tutorTypeOptions,
  type Availability,
  type Language,
  type TutorType,
} from "@/lib/tutors";

export interface FiltersState extends AcademicStructureFilters {
  supportTypes: SupportTypeId[];
  levels: string[];
  subjects: string[];
  tutorTypes: TutorType[];
  languages: Language[];
  availability: Availability[];
  maxPrice: number;
}

export const defaultFilters: FiltersState = {
  ...defaultAcademicStructureFilters,
  supportTypes: [],
  levels: [],
  subjects: [],
  tutorTypes: [],
  languages: [],
  availability: [],
  maxPrice: 10000,
};

// Toggling a Level, Faculty, Department or Field always re-derives every
// dependent selection through sanitizeAcademicStructure — the one place
// "don't allow impossible combinations" is actually enforced, called from
// every checkbox onChange in both this file and mobile-filter-sheet.tsx
// rather than duplicated per-checkbox or per-surface.
export function toggleAndSanitize<K extends keyof AcademicStructureFilters>(
  filters: FiltersState,
  key: K,
  value: string
): FiltersState {
  return sanitizeAcademicStructure({ ...filters, [key]: toggle(filters[key], value) });
}

// Selecting/deselecting an academic Level can hide the Undergraduate or
// Masters/PhD structure sections — clearing their selections too so an
// invisible filter can never keep silently narrowing results. Shared by
// desktop and mobile so the exact same rule applies in both places.
export function toggleLevel(filters: FiltersState, level: string): FiltersState {
  const nextLevels = toggle(filters.levels, level);
  return {
    ...filters,
    levels: nextLevels,
    ...(!showsUndergraduateStructure(nextLevels) ? { facultyIds: [], departmentIds: [], courseIds: [] } : {}),
    ...(!showsGraduateStructure(nextLevels) ? { fieldIds: [], researchAreaIds: [] } : {}),
  };
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-ensena-border py-5 first:pt-0 last:border-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ensena-ink">{title}</h3>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
      {action}
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
        className="size-4 rounded border-ensena-border text-ensena-primary accent-ensena-primary focus-visible:ring-2 focus-visible:ring-ensena-primary/40"
      />
      {label}
    </label>
  );
}

export function TeacherFilters({
  filters,
  onChange,
  onApply,
}: {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onApply: () => void;
}) {
  const [subjectQuery, setSubjectQuery] = useState("");

  const visibleSubjects = subjectOptions.filter((s) =>
    s.toLowerCase().includes(subjectQuery.toLowerCase())
  );

  const isEmpty =
    filters.supportTypes.length === 0 &&
    filters.levels.length === 0 &&
    filters.subjects.length === 0 &&
    filters.facultyIds.length === 0 &&
    filters.departmentIds.length === 0 &&
    filters.courseIds.length === 0 &&
    filters.fieldIds.length === 0 &&
    filters.researchAreaIds.length === 0 &&
    filters.tutorTypes.length === 0 &&
    filters.languages.length === 0 &&
    filters.availability.length === 0 &&
    filters.maxPrice === defaultFilters.maxPrice;

  const departmentOptions = departmentOptionsFor(filters.facultyIds);
  const courseOptions = courseOptionsFor(filters.departmentIds);
  const researchAreaOptions = researchAreaOptionsFor(filters.fieldIds);

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-ensena-border bg-ensena-surface p-6 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Filters</h2>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
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

      <FilterGroup title="Academic Level">
        {academicLevelFilterOptions.map((level) => (
          <CheckboxRow
            key={level}
            label={level}
            checked={filters.levels.includes(level)}
            onChange={() => onChange(toggleLevel(filters, level))}
          />
        ))}
      </FilterGroup>

      {showsUndergraduateStructure(filters.levels) && (
        <>
          <FilterGroup title="Faculty">
            {faculties.filter((f) => f.active).map((f) => (
              <CheckboxRow
                key={f.id}
                label={f.label}
                checked={filters.facultyIds.includes(f.id)}
                onChange={() => onChange(toggleAndSanitize(filters, "facultyIds", f.id))}
              />
            ))}
          </FilterGroup>

          {departmentOptions.length > 0 && (
            <FilterGroup title="Department">
              {departmentOptions.map((d) => (
                <CheckboxRow
                  key={d.id}
                  label={d.label}
                  checked={filters.departmentIds.includes(d.id)}
                  onChange={() => onChange(toggleAndSanitize(filters, "departmentIds", d.id))}
                />
              ))}
            </FilterGroup>
          )}

          {courseOptions.length > 0 && (
            <FilterGroup title="Course / Module">
              {courseOptions.map((c) => (
                <CheckboxRow
                  key={c.id}
                  label={c.label}
                  checked={filters.courseIds.includes(c.id)}
                  onChange={() => onChange(toggleAndSanitize(filters, "courseIds", c.id))}
                />
              ))}
            </FilterGroup>
          )}
        </>
      )}

      {showsGraduateStructure(filters.levels) && (
        <>
          <FilterGroup title="Field of Study">
            {researchFields.filter((f) => f.active).map((f) => (
              <CheckboxRow
                key={f.id}
                label={f.label}
                checked={filters.fieldIds.includes(f.id)}
                onChange={() => onChange(toggleAndSanitize(filters, "fieldIds", f.id))}
              />
            ))}
          </FilterGroup>

          {researchAreaOptions.length > 0 && (
            <FilterGroup title="Research Area">
              {researchAreaOptions.map((a) => (
                <CheckboxRow
                  key={a.id}
                  label={a.label}
                  checked={filters.researchAreaIds.includes(a.id)}
                  onChange={() => onChange(toggleAndSanitize(filters, "researchAreaIds", a.id))}
                />
              ))}
            </FilterGroup>
          )}
        </>
      )}

      <FilterGroup title="Subject / Course">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ensena-muted" />
          <Input
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            placeholder="Search subject"
            aria-label="Search subject"
            className="h-8 rounded-lg border-ensena-border pl-8 text-sm"
          />
        </div>
        {visibleSubjects.map((subject) => (
          <CheckboxRow
            key={subject}
            label={subject}
            checked={filters.subjects.includes(subject)}
            onChange={() =>
              onChange({ ...filters, subjects: toggle(filters.subjects, subject) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Tutor Type">
        {tutorTypeOptions.map((type) => (
          <CheckboxRow
            key={type}
            label={type}
            checked={filters.tutorTypes.includes(type)}
            onChange={() =>
              onChange({ ...filters, tutorTypes: toggle(filters.tutorTypes, type) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price Range (Per hour)">
        <Slider
          min={1000}
          max={10000}
          step={500}
          value={filters.maxPrice}
          onValueChange={(value) => onChange({ ...filters, maxPrice: value as number })}
        />
        <div className="flex items-center justify-between text-xs text-ensena-muted">
          <span>{formatNaira(1000)}</span>
          <span>
            Up to {filters.maxPrice >= 10000 ? formatNaira(10000) + "+" : formatNaira(filters.maxPrice)}
          </span>
        </div>
      </FilterGroup>

      <FilterGroup title="Tutor Language">
        {languageOptions.map((lang) => (
          <CheckboxRow
            key={lang}
            label={lang}
            checked={filters.languages.includes(lang)}
            onChange={() =>
              onChange({ ...filters, languages: toggle(filters.languages, lang) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Availability">
        {availabilityOptions.map((slot) => (
          <CheckboxRow
            key={slot}
            label={slot}
            checked={filters.availability.includes(slot)}
            onChange={() =>
              onChange({ ...filters, availability: toggle(filters.availability, slot) })
            }
          />
        ))}
      </FilterGroup>

      <Button
        onClick={onApply}
        variant="outline"
        className="mt-2 h-10 w-full rounded-full border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
      >
        Apply Filters
      </Button>
    </aside>
  );
}
