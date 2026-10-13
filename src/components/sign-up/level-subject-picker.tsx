"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { ComboboxField } from "@/components/sign-up/combobox-field";
import { DEGREE_LEVELS, modulesForDegreeCourse, subjectsForTutorLevel, tutorDegreeCourses } from "@/lib/tutor-signup-catalog";
import { cn } from "@/lib/utils";

// Step 2 "Subjects / areas you teach" for one academic level: every subject
// under that level is shown as a chip to tick. Undergraduate/Masters/PhD
// browse by degree course, then tick that course's modules. Anything missing
// can be typed in with "Add".
export function LevelSubjectPicker({ level, values, onChange }: { level: string; values: string[]; onChange: (next: string[]) => void }) {
  const degree = DEGREE_LEVELS.includes(level);
  const [course, setCourse] = useState("");
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");

  const all = degree ? (course ? modulesForDegreeCourse(course, level) : []) : subjectsForTutorLevel(level);
  const q = filter.trim().toLowerCase();
  const shown = q ? all.filter((s) => s.toLowerCase().includes(q)) : all;
  const extras = values.filter((v) => !all.includes(v));

  function toggle(subject: string) {
    onChange(values.includes(subject) ? values.filter((v) => v !== subject) : [...values, subject]);
  }

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setCustom("");
  }

  const chip = (selected: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      selected ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
    );

  return (
    <div className="flex flex-col gap-3">
      {degree && (
        <div>
          <p className="text-xs font-semibold text-ensena-ink">Browse by course</p>
          <p className="text-xs text-ensena-muted">Pick a course to see its modules. You can switch courses and keep ticking.</p>
          <div className="mt-1.5">
            <ComboboxField value={course} onChange={setCourse} options={tutorDegreeCourses} placeholder="Choose a course, e.g. Computer Science" />
          </div>
        </div>
      )}

      {all.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter subjects"
            className="h-10 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary"
          />
        </div>
      )}

      {shown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shown.map((s) => (
            <button key={s} type="button" onClick={() => toggle(s)} className={chip(values.includes(s))} aria-pressed={values.includes(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {degree && !course && <p className="text-sm text-ensena-muted">Choose a course above to see its modules.</p>}

      {extras.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ensena-ink">{degree ? "Selected" : "Added by you"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {extras.map((v) => (
              <span key={v} className="flex items-center gap-1 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Not listed? Type it here"
          className="h-10 flex-1 rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
        <button type="button" onClick={addCustom} className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-ensena-border px-3 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
          <Plus className="size-4" /> Add
        </button>
      </div>
    </div>
  );
}
