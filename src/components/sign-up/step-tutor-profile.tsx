"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, ShieldCheck, User as UserIcon, Video, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionCard, ToggleChip } from "@/components/sign-up/option-card";
import { FileDropzone } from "@/components/sign-up/file-dropzone";
import { languageOptions } from "@/lib/tutors";
import {
  experienceOptions,
  responseTimeOptions,
  teachingStyleOptions,
  type TutorSignupForm,
} from "@/lib/tutor-signup-data";

const nationalities = [
  "Nigerian",
  "Ghanaian",
  "Kenyan",
  "South African",
  "British",
  "American",
  "Canadian",
  "Other",
];

const countries = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada"];

export function StepTutorProfile({
  form,
  update,
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const toggleLanguage = (lang: string) => {
    update({
      languagesSpoken: form.languagesSpoken.includes(lang)
        ? form.languagesSpoken.filter((l) => l !== lang)
        : [...form.languagesSpoken, lang],
    });
  };

  const toggleTeachingStyle = (style: string) => {
    update({
      teachingStyles: form.teachingStyles.includes(style)
        ? form.teachingStyles.filter((s) => s !== style)
        : [...form.teachingStyles, style],
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ensena-primary">Step 2 of 5</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
            Create Your Tutor Profile
          </h2>
          <p className="mt-1 text-ensena-muted">This is how students will see and connect with you.</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-ensena-success/10 px-3 py-1.5 text-xs font-semibold text-ensena-success sm:flex">
          <ShieldCheck className="size-4" /> Your info is secure
        </span>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-ensena-ink">Profile photo</span>
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
            accept="image/*"
            fileName={form.profilePhotoName}
            onFileSelected={(name, file) => {
              update({ profilePhotoName: name });
              if (file) {
                const url = URL.createObjectURL(file);
                setPhotoPreview(url);
              }
            }}
            className="flex-1"
          />
        </div>
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ensena-ink">Professional headline</span>
        <Input
          value={form.headline}
          onChange={(e) => update({ headline: e.target.value })}
          placeholder="e.g. Mathematics Tutor | WAEC & JAMB Specialist"
          className="h-11 rounded-xl border-ensena-border"
        />
        <span className="text-xs text-ensena-muted">A short title that describes what you teach best</span>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ensena-ink">Bio</span>
        <textarea
          value={form.bio}
          onChange={(e) => update({ bio: e.target.value.slice(0, 500) })}
          placeholder="Tell students about yourself, your teaching experience, your approach and what makes you unique..."
          rows={4}
          className="w-full rounded-xl border border-ensena-border bg-transparent p-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
        <span className="self-end text-xs text-ensena-muted">{form.bio.length}/500</span>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">Languages you speak</span>
          <Select<string> onValueChange={(v) => v && toggleLanguage(v)}>
            <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select languages" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5">
            {form.languagesSpoken.map((lang) => (
              <span
                key={lang}
                className="flex items-center gap-1 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary"
              >
                {lang}
                <button type="button" onClick={() => toggleLanguage(lang)} aria-label={`Remove ${lang}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">Nationality</span>
          <Select value={form.nationality} onValueChange={(v) => v && update({ nationality: v })}>
            <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {nationalities.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">Country</span>
          <Select value={form.country} onValueChange={(v) => v && update({ country: v })}>
            <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">State / City</span>
          <Input
            value={form.stateCity}
            onChange={(e) => update({ stateCity: e.target.value })}
            placeholder="Select state / city"
            className="h-11 rounded-xl border-ensena-border"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">Years of teaching experience</span>
          <Select value={form.yearsExperience} onValueChange={(v) => v && update({ yearsExperience: v })}>
            <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select experience" />
            </SelectTrigger>
            <SelectContent>
              {experienceOptions.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ensena-ink">
            Teaching style <span className="font-normal text-ensena-muted">(Select all that apply)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {teachingStyleOptions.map((style) => (
              <ToggleChip
                key={style}
                label={style}
                selected={form.teachingStyles.includes(style)}
                onClick={() => toggleTeachingStyle(style)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-ensena-ink">Intro video (Optional)</span>
        <p className="text-xs text-ensena-muted">
          Record a short 30–60 second video to introduce yourself to students.
        </p>
        <FileDropzone
          icon={Video}
          label="Upload video"
          hint="MP4, MOV or WEBM. Up to 60 seconds."
          accept="video/*"
          fileName={form.introVideoName}
          onFileSelected={(name) => update({ introVideoName: name })}
          className="mt-2"
        />
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-ensena-ink">Response time goal</span>
        <p className="text-xs text-ensena-muted">How quickly do you usually respond to students?</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {responseTimeOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.value}
              description={option.description}
              selected={form.responseTimeGoal === option.value}
              onClick={() => update({ responseTimeGoal: option.value })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
