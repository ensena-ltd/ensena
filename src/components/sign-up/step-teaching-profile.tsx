"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, Camera, Phone, User as UserIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleChip } from "@/components/sign-up/option-card";
import { FileDropzone } from "@/components/sign-up/file-dropzone";
import { RequiredLabel, OptionalLabel } from "@/components/sign-up/required-label";
import { LevelSubjectPicker } from "@/components/sign-up/level-subject-picker";
import { academicLevels } from "@/lib/data";
import { countryInfo, countryNames } from "@/lib/geo-data";
import { isAtLeastAge, latestDobForAge, TUTOR_AGE_MESSAGE, TUTOR_MIN_AGE } from "@/lib/age";
import { LEVEL_EXPERTISE_CONFIG, examOptions } from "@/lib/level-expertise-config";
import { teachingFormatOptions, type LevelExpertise, type TutorSignupForm } from "@/lib/tutor-signup-data";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OTHER_COUNTRY = "Other";

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function StepTeachingProfile({
  form,
  update,
  googleMode = false,
  photoPreview,
  onPhotoChange,
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
  /** Google sign-ups skip Step 1, so their name/DOB/phone are asked here. */
  googleMode?: boolean;
  photoPreview: string | null;
  onPhotoChange: (file: File | null) => void;
}) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const country = countryInfo(form.country);
  const [activeLevel, setActiveLevel] = useState<string | null>(form.levels[0] ?? null);

  function toggleLevel(level: string) {
    const nextLevels = toggleInList(form.levels, level);
    update({ levels: nextLevels });
    if (nextLevels.includes(level)) {
      setActiveLevel(level);
    } else if (activeLevel === level) {
      setActiveLevel(nextLevels[0] ?? null);
    }
  }

  function levelEntry(level: string): LevelExpertise | undefined {
    return form.levelExpertise.find((e) => e.level === level);
  }

  function patchLevelEntry(level: string, patch: Partial<LevelExpertise>) {
    const config = LEVEL_EXPERTISE_CONFIG[level];
    const exists = form.levelExpertise.some((e) => e.level === level);
    const next = exists
      ? form.levelExpertise.map((e) => (e.level === level ? { ...e, ...patch } : e))
      : [...form.levelExpertise, { level, category: config.category, items: [], ...patch }];
    update({ levelExpertise: next });
  }

  const currentEntry = activeLevel ? levelEntry(activeLevel) : undefined;
  const currentConfig = activeLevel ? LEVEL_EXPERTISE_CONFIG[activeLevel] : undefined;

  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">{googleMode ? "Step 1 of 3" : "Step 2 of 4"}</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Teaching Profile
      </h2>
      <p className="mt-1 text-ensena-muted">This is how students will find and get to know you.</p>

      {googleMode && (
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4">
          <p className="text-sm font-semibold text-ensena-ink">Your details</p>
          <p className="text-xs text-ensena-muted">Signed in with Google as {form.email}.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <RequiredLabel>First name</RequiredLabel>
              <Input value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} className="h-11 rounded-xl border-ensena-border bg-white" />
            </label>
            <label className="flex flex-col gap-1.5">
              <RequiredLabel>Last name</RequiredLabel>
              <Input value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} className="h-11 rounded-xl border-ensena-border bg-white" />
            </label>
            <label className="flex flex-col gap-1.5">
              <RequiredLabel>Date of birth</RequiredLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input type="date" value={form.dob} max={latestDobForAge(TUTOR_MIN_AGE)} onChange={(e) => update({ dob: e.target.value })} className="h-11 rounded-xl border-ensena-border bg-white pl-9" />
              </div>
              {form.dob && !isAtLeastAge(form.dob, TUTOR_MIN_AGE) && <span className="text-xs font-medium text-rose-600">{TUTOR_AGE_MESSAGE}</span>}
            </label>
            <label className="flex flex-col gap-1.5">
              <RequiredLabel>Phone number</RequiredLabel>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="080 1234 5678" className="h-11 rounded-xl border-ensena-border bg-white pl-9" />
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="mt-6">
        <RequiredLabel>Profile photo</RequiredLabel>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-ensena-bg-soft">
            {photoPreview ? (
              <Image src={photoPreview} alt="Profile preview" fill sizes="96px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-ensena-muted">
                <UserIcon className="size-8" />
              </span>
            )}
          </div>
          <FileDropzone
            icon={Camera}
            label="Upload photo"
            hint="JPG, PNG or WEBP. Max 5MB. Square image works best."
            accept="image/jpeg,image/png,image/webp"
            fileName={form.profilePhotoName}
            onFileSelected={(name, file) => {
              if (!file) return;
              if (!PHOTO_TYPES.includes(file.type)) {
                setPhotoError("Please choose a JPG, PNG or WEBP image.");
                return;
              }
              if (file.size > MAX_PHOTO_BYTES) {
                setPhotoError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum is 5MB.`);
                return;
              }
              setPhotoError(null);
              update({ profilePhotoName: name });
              onPhotoChange(file);
            }}
            className="flex-1"
          />
        </div>
        {photoError && <p className="mt-1.5 text-xs text-rose-600">{photoError}</p>}
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <RequiredLabel>What do you teach?</RequiredLabel>
        <Input
          value={form.headline}
          onChange={(e) => update({ headline: e.target.value })}
          placeholder="e.g. Mathematics Tutor | WAEC & JAMB Specialist"
          className="h-11 rounded-xl border-ensena-border"
        />
        <span className="text-xs text-ensena-muted">A short line that describes what you teach best</span>
      </label>

      <div className="mt-6">
        <RequiredLabel>Academic level(s) you teach</RequiredLabel>
        <p className="text-xs text-ensena-muted">Select all that apply</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {academicLevels.map((level) => (
            <ToggleChip
              key={level.label}
              label={level.label}
              selected={form.levels.includes(level.label)}
              onClick={() => toggleLevel(level.label)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <RequiredLabel>Teaching format</RequiredLabel>
        <p className="text-xs text-ensena-muted">Select all that apply</p>
        <div className="mt-2 flex gap-2">
          {teachingFormatOptions.map((f) => (
            <ToggleChip
              key={f}
              label={f}
              selected={form.teachingFormats.includes(f)}
              onClick={() => update({ teachingFormats: toggleInList(form.teachingFormats, f) })}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        {form.levels.length === 0 ? (
          <>
            <RequiredLabel>Subjects / expertise</RequiredLabel>
            <p className="mt-2 text-sm text-ensena-muted">Select an academic level above to add your subjects/expertise.</p>
          </>
        ) : (
          <>
            {form.levels.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {form.levels.map((level) => {
                  const count = levelEntry(level)?.items.length ?? 0;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setActiveLevel(level)}
                      className={
                        activeLevel === level
                          ? "rounded-lg border border-ensena-primary bg-ensena-primary/5 px-3 py-1.5 text-sm font-medium text-ensena-ink"
                          : "rounded-lg border border-ensena-border px-3 py-1.5 text-sm font-medium text-ensena-muted hover:bg-ensena-bg-soft"
                      }
                    >
                      {level} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            )}

            {currentConfig && activeLevel && (
              <div>
                <RequiredLabel>{currentConfig.label}</RequiredLabel>

                {activeLevel === "Exams" && (
                  <div className="mt-2 mb-4">
                    <p className="text-xs font-semibold text-ensena-ink">Exams you support</p>
                    <p className="text-xs text-ensena-muted">Select all that apply</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {examOptions.map((exam) => (
                        <ToggleChip
                          key={exam}
                          label={exam}
                          selected={currentEntry?.exams?.includes(exam) ?? false}
                          onClick={() =>
                            patchLevelEntry(activeLevel, {
                              exams: toggleInList(currentEntry?.exams ?? [], exam),
                            })
                          }
                        />
                      ))}
                    </div>
                    {(currentEntry?.exams?.length ?? 0) === 0 && (
                      <p className="mt-1.5 text-xs text-rose-600">Select at least one exam.</p>
                    )}
                  </div>
                )}

                <p className="text-xs text-ensena-muted">Tick everything you teach for {activeLevel}.</p>
                <div className="mt-2">
                  <LevelSubjectPicker
                    key={activeLevel}
                    level={activeLevel}
                    values={currentEntry?.items ?? []}
                    onChange={(items) => patchLevelEntry(activeLevel, { items })}
                  />
                </div>
                {(currentEntry?.items.length ?? 0) === 0 && (
                  <p className="mt-1.5 text-xs text-rose-600">Add at least one {currentConfig.category === "language" ? "language" : "item"} for {activeLevel}.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <OptionalLabel>Country</OptionalLabel>
          <Select
            value={form.country}
            onValueChange={(v) =>
              // A new country means new states and a new institutions list.
              v && v !== form.country && update({ country: v, stateCity: "", gradInstitution: "", gradFieldOfStudy: "" })
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countryNames.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
              <SelectItem value={OTHER_COUNTRY}>Other</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <OptionalLabel>{country?.subdivisionLabel ?? "State / City"}</OptionalLabel>
          {country ? (
            <Select value={form.stateCity} onValueChange={(v) => v && update({ stateCity: v })}>
              <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
                <SelectValue placeholder={`Select ${country.subdivisionLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {country.subdivisions.map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.stateCity}
              onChange={(e) => update({ stateCity: e.target.value })}
              placeholder="Your state, region or city"
              className="h-11 rounded-xl border-ensena-border"
            />
          )}
        </label>
      </div>
    </div>
  );
}
