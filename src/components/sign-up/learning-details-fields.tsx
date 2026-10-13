"use client";

import { Check } from "lucide-react";

import { RequiredLabel } from "@/components/sign-up/required-label";
import { undergraduateLevels, researchFields } from "@/lib/academic-taxonomy-data";
import { activeExams } from "@/lib/exams-data";
import { cn } from "@/lib/utils";

// The "Tell us what you're learning" step — shared by the email/password
// sign-up (student-sign-up-client.tsx) and the Google sign-up details page
// (student/details), so both paths collect exactly the same fields.

export type LearningFor = "Myself" | "My child";

export interface LearningDetails {
  learningFor: LearningFor | null;
  academicLevel: string | null;
  detailValue: string;
}

export const emptyLearningDetails: LearningDetails = { learningFor: null, academicLevel: null, detailValue: "" };

const academicLevelOptions = ["K1-K3", "Primary", "Secondary", "Undergraduate", "Masters", "PhD", "Exams", "Language"];
// A child isn't doing a Masters or PhD — those only show for "Myself".
const adultOnlyLevels = ["Masters", "PhD"];
const secondaryClasses = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

function needsDetail(level: string | null) {
  return ["Secondary", "Undergraduate", "Masters", "PhD", "Exams"].includes(level ?? "");
}

export function isLearningDetailsValid(d: LearningDetails) {
  return !!d.learningFor && !!d.academicLevel && (!needsDetail(d.academicLevel) || d.detailValue.trim() !== "");
}

export function LearningDetailsFields({ value, onChange }: { value: LearningDetails; onChange: (next: LearningDetails) => void }) {
  const { learningFor, academicLevel, detailValue } = value;

  const detailOptions =
    academicLevel === "Secondary" ? secondaryClasses
      : academicLevel === "Undergraduate" ? undergraduateLevels
        : academicLevel === "Masters" || academicLevel === "PhD" ? researchFields.map((f) => f.label)
          : academicLevel === "Exams" ? activeExams().map((e) => e.name)
            : [];

  const detailLabel =
    academicLevel === "Secondary" ? "Class"
      : academicLevel === "Undergraduate" ? "Level"
        : academicLevel === "Masters" || academicLevel === "PhD" ? "Field"
          : academicLevel === "Exams" ? "Exam"
            : "";

  return (
    <>
      <div>
        <RequiredLabel>Who is learning?</RequiredLabel>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {(["Myself", "My child"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(
                  opt === "My child" && adultOnlyLevels.includes(academicLevel ?? "")
                    ? { learningFor: opt, academicLevel: null, detailValue: "" }
                    : { ...value, learningFor: opt }
                )
              }
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                learningFor === opt ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {learningFor === opt && <Check className="size-3.5" />}
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <RequiredLabel>Academic level</RequiredLabel>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {academicLevelOptions.filter((lvl) => learningFor !== "My child" || !adultOnlyLevels.includes(lvl)).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onChange({ ...value, academicLevel: lvl, detailValue: "" })}
              className={cn(
                "rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors",
                academicLevel === lvl ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {needsDetail(academicLevel) && (
        <label className="flex flex-col gap-1.5">
          <RequiredLabel>{detailLabel}</RequiredLabel>
          <select
            value={detailValue}
            onChange={(e) => onChange({ ...value, detailValue: e.target.value })}
            className="h-11 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink"
          >
            <option value="">Select {detailLabel.toLowerCase()}</option>
            {detailOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
