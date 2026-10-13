"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import {
  defaultFilters,
  toggle,
  toggleAndSanitize,
  toggleLevel,
  type FiltersState,
} from "@/components/find-teachers/teacher-filters";
import {
  departmentOptionsFor,
  courseOptionsFor,
  researchAreaOptionsFor,
  showsGraduateStructure,
  showsUndergraduateStructure,
} from "@/lib/academic-structure-filter";
import { supportTypeOptions } from "@/lib/academic-support-types";
import { faculties, researchFields } from "@/lib/academic-taxonomy-data";
import { formatNaira } from "@/lib/format";
import {
  academicLevelFilterOptions,
  availabilityOptions,
  languageOptions,
  subjectOptions,
  tutorTypeOptions,
} from "@/lib/tutors";

// Full-screen mobile filter UI — deliberately not the shared centered
// `Modal` component (that's sized/styled for desktop dialogs), and
// deliberately a draft-then-commit flow (unlike desktop's instant-apply
// sidebar): edits here only reach the real filter state when "Show N
// Tutors" is tapped, matching the reference design's sticky CTA pattern.
// Only ever mounted while `open`, so the lazy useState initializer below
// re-seeds the draft from the last *committed* filters every time it opens.
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

export function MobileFilterSheet({
  onClose,
  filters,
  onApply,
  computeCount,
}: {
  onClose: () => void;
  filters: FiltersState;
  onApply: (next: FiltersState) => void;
  computeCount: (draft: FiltersState) => number;
}) {
  const [draft, setDraft] = useState<FiltersState>(filters);
  const [subjectQuery, setSubjectQuery] = useState("");

  const visibleSubjects = subjectOptions.filter((s) =>
    s.toLowerCase().includes(subjectQuery.toLowerCase())
  );
  const count = computeCount(draft);
  const departmentOptions = departmentOptionsFor(draft.facultyIds);
  const courseOptions = courseOptionsFor(draft.departmentIds);
  const researchAreaOptions = researchAreaOptionsFor(draft.fieldIds);

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

        <Section title="Academic Level">
          {academicLevelFilterOptions.map((level) => (
            <OptionRow
              key={level}
              label={level}
              checked={draft.levels.includes(level)}
              onChange={() => setDraft(toggleLevel(draft, level))}
            />
          ))}
        </Section>

        {showsUndergraduateStructure(draft.levels) && (
          <>
            <Section title="Faculty">
              {faculties.filter((f) => f.active).map((f) => (
                <OptionRow
                  key={f.id}
                  label={f.label}
                  checked={draft.facultyIds.includes(f.id)}
                  onChange={() => setDraft(toggleAndSanitize(draft, "facultyIds", f.id))}
                />
              ))}
            </Section>

            {departmentOptions.length > 0 && (
              <Section title="Department">
                {departmentOptions.map((d) => (
                  <OptionRow
                    key={d.id}
                    label={d.label}
                    checked={draft.departmentIds.includes(d.id)}
                    onChange={() => setDraft(toggleAndSanitize(draft, "departmentIds", d.id))}
                  />
                ))}
              </Section>
            )}

            {courseOptions.length > 0 && (
              <Section title="Course / Module">
                {courseOptions.map((c) => (
                  <OptionRow
                    key={c.id}
                    label={c.label}
                    checked={draft.courseIds.includes(c.id)}
                    onChange={() => setDraft(toggleAndSanitize(draft, "courseIds", c.id))}
                  />
                ))}
              </Section>
            )}
          </>
        )}

        {showsGraduateStructure(draft.levels) && (
          <>
            <Section title="Field of Study">
              {researchFields.filter((f) => f.active).map((f) => (
                <OptionRow
                  key={f.id}
                  label={f.label}
                  checked={draft.fieldIds.includes(f.id)}
                  onChange={() => setDraft(toggleAndSanitize(draft, "fieldIds", f.id))}
                />
              ))}
            </Section>

            {researchAreaOptions.length > 0 && (
              <Section title="Research Area">
                {researchAreaOptions.map((a) => (
                  <OptionRow
                    key={a.id}
                    label={a.label}
                    checked={draft.researchAreaIds.includes(a.id)}
                    onChange={() => setDraft(toggleAndSanitize(draft, "researchAreaIds", a.id))}
                  />
                ))}
              </Section>
            )}
          </>
        )}

        <Section title="Subject / Course">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={subjectQuery}
              onChange={(e) => setSubjectQuery(e.target.value)}
              placeholder="Search subject"
              aria-label="Search subject"
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

        <Section title="Tutor Type">
          {tutorTypeOptions.map((type) => (
            <OptionRow
              key={type}
              label={type}
              checked={draft.tutorTypes.includes(type)}
              onChange={() => setDraft({ ...draft, tutorTypes: toggle(draft.tutorTypes, type) })}
            />
          ))}
        </Section>

        <Section title="Price Range (Per hour)">
          <Slider
            min={1000}
            max={10000}
            step={500}
            value={draft.maxPrice}
            onValueChange={(value) => setDraft({ ...draft, maxPrice: value as number })}
          />
          <div className="mt-1 flex items-center justify-between text-sm text-ensena-muted">
            <span>{formatNaira(1000)}</span>
            <span>
              Up to {draft.maxPrice >= 10000 ? formatNaira(10000) + "+" : formatNaira(draft.maxPrice)}
            </span>
          </div>
        </Section>

        <Section title="Tutor Language">
          {languageOptions.map((lang) => (
            <OptionRow
              key={lang}
              label={lang}
              checked={draft.languages.includes(lang)}
              onChange={() => setDraft({ ...draft, languages: toggle(draft.languages, lang) })}
            />
          ))}
        </Section>

        <Section title="Availability">
          {availabilityOptions.map((slot) => (
            <OptionRow
              key={slot}
              label={slot}
              checked={draft.availability.includes(slot)}
              onChange={() =>
                setDraft({ ...draft, availability: toggle(draft.availability, slot) })
              }
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
          onClick={() => setDraft(defaultFilters)}
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
          Show {count} {count === 1 ? "Tutor" : "Tutors"}
        </button>
      </div>
    </div>
  );
}
