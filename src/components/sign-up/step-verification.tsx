"use client";

import { type SVGProps } from "react";
import {
  Camera,
  FileText,
  Globe,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/sign-up/file-dropzone";
import { idTypeOptions, qualificationOptions, type TutorSignupForm, type WorkExperience } from "@/lib/tutor-signup-data";

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="10" x2="8" y2="17" />
      <circle cx="8" cy="6.5" r="0.6" fill="currentColor" />
      <path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4" />
      <line x1="12" y1="10" x2="12" y2="17" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.53.1.72-.23.72-.51v-1.99c-2.92.63-3.54-1.24-3.54-1.24-.48-1.22-1.17-1.55-1.17-1.55-.96-.65.07-.64.07-.64 1.06.07 1.62 1.09 1.62 1.09.94 1.62 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.42-2.33-.27-4.78-1.16-4.78-5.18 0-1.14.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10 10 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.67.73 1.08 1.67 1.08 2.81 0 4.03-2.46 4.91-4.8 5.17.38.33.72.97.72 1.96v2.9c0 .28.19.62.73.51A10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  );
}

function TeachingExperienceItem({
  experience,
  onChange,
  onRemove,
  removable,
}: {
  experience: WorkExperience;
  onChange: (patch: Partial<WorkExperience>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="relative rounded-xl border border-ensena-border p-4">
      {removable && (
        <button
          type="button"
          aria-label="Remove experience"
          onClick={onRemove}
          className="absolute right-3 top-3 text-ensena-muted hover:text-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ensena-muted">Institution / Organization</span>
          <Input
            value={experience.institution}
            onChange={(e) => onChange({ institution: e.target.value })}
            placeholder="e.g. University of Lagos"
            className="h-10 rounded-xl border-ensena-border"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ensena-muted">Position / Role</span>
          <Input
            value={experience.role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="e.g. Mathematics Teacher"
            className="h-10 rounded-xl border-ensena-border"
          />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ensena-muted">From</span>
          <Input
            type="date"
            value={experience.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="h-10 rounded-xl border-ensena-border"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ensena-muted">To</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={experience.to}
              disabled={experience.current}
              onChange={(e) => onChange({ to: e.target.value })}
              className="h-10 rounded-xl border-ensena-border"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-ensena-muted">
              <input
                type="checkbox"
                checked={experience.current}
                onChange={(e) => onChange({ current: e.target.checked })}
                className="size-3.5 accent-ensena-primary"
              />
              Currently teaching here
            </label>
          </div>
        </label>
      </div>
    </div>
  );
}

export function StepVerification({
  form,
  update,
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
}) {
  const addExperience = () => {
    update({
      workExperiences: [
        ...form.workExperiences,
        { institution: "", role: "", from: "", to: "", current: false },
      ],
    });
  };

  const updateExperience = (index: number, patch: Partial<WorkExperience>) => {
    update({
      workExperiences: form.workExperiences.map((exp, i) => (i === index ? { ...exp, ...patch } : exp)),
    });
  };

  const removeExperience = (index: number) => {
    update({ workExperiences: form.workExperiences.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">Step 4 of 5</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Verification &amp; Qualifications
      </h2>
      <p className="mt-1 text-ensena-muted">
        Verify your identity and qualifications to build trust and start receiving bookings.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">1. Identity Verification</h3>
          <p className="text-xs text-ensena-muted">Upload a government-issued ID</p>
          <Select value={form.idType} onValueChange={(v) => v && update({ idType: v })}>
            <SelectTrigger className="mt-2 h-10 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select ID type" />
            </SelectTrigger>
            <SelectContent>
              {idTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FileDropzone
            label="Upload ID"
            hint="JPG, PNG or PDF. Max 10MB."
            fileName={form.idFileName}
            onFileSelected={(name) => update({ idFileName: name })}
            className="mt-3"
          />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">2. Selfie Verification</h3>
          <p className="text-xs text-ensena-muted">Take a live selfie to match your ID</p>
          <FileDropzone
            icon={Camera}
            label="Take Selfie"
            hint="We'll use this to verify your identity"
            accept="image/*"
            fileName={form.selfieFileName}
            onFileSelected={(name) => update({ selfieFileName: name })}
            className="mt-8"
          />
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">3. Educational Qualifications</h3>
          <p className="text-xs text-ensena-muted">Upload your highest qualification</p>
          <Select value={form.qualification} onValueChange={(v) => v && update({ qualification: v })}>
            <SelectTrigger className="mt-2 h-10 w-full rounded-xl border-ensena-border">
              <SelectValue placeholder="Select qualification" />
            </SelectTrigger>
            <SelectContent>
              {qualificationOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FileDropzone
            label="Upload Certificate"
            hint="JPG, PNG or PDF. Max 10MB."
            fileName={form.certificateFileName}
            onFileSelected={(name) => update({ certificateFileName: name })}
            className="mt-3"
          />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">
            4. Professional Certifications <span className="font-normal text-ensena-muted">(Optional)</span>
          </h3>
          <p className="text-xs text-ensena-muted">Add any professional or teaching certifications</p>
          <div className="mt-2 flex flex-col gap-2">
            {form.certificationFileNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-ensena-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-ensena-ink">
                  <FileText className="size-4 text-ensena-primary" />
                  {name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() =>
                    update({
                      certificationFileNames: form.certificationFileNames.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-ensena-muted hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ensena-border py-4 text-sm font-medium text-ensena-primary hover:bg-ensena-bg-soft">
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    update({ certificationFileNames: [...form.certificationFileNames, file.name] });
                  }
                }}
              />
              <Plus className="size-4" /> Upload Certificate
            </label>
            <p className="text-xs text-ensena-muted">You can upload multiple files</p>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">5. Teaching Experience</h3>
        <p className="text-xs text-ensena-muted">Have you taught before?</p>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ensena-ink">
            <input
              type="radio"
              name="hasExperience"
              checked={form.hasTeachingExperience === true}
              onChange={() => {
                update({ hasTeachingExperience: true });
                if (form.workExperiences.length === 0) addExperience();
              }}
              className="size-4 accent-ensena-primary"
            />
            Yes, I have teaching experience
          </label>
          <label className="flex items-center gap-2 text-sm text-ensena-ink">
            <input
              type="radio"
              name="hasExperience"
              checked={form.hasTeachingExperience === false}
              onChange={() => update({ hasTeachingExperience: false, workExperiences: [] })}
              className="size-4 accent-ensena-primary"
            />
            No, I&apos;m new to teaching
          </label>
        </div>

        {form.hasTeachingExperience && (
          <div className="mt-3 flex flex-col gap-3">
            {form.workExperiences.map((exp, i) => (
              <TeachingExperienceItem
                key={i}
                experience={exp}
                onChange={(patch) => updateExperience(i, patch)}
                onRemove={() => removeExperience(i)}
                removable={form.workExperiences.length > 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addExperience}
              className="h-10 w-fit rounded-xl border-ensena-border text-sm font-medium"
            >
              <Plus className="size-4" /> Add another experience
            </Button>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">
          6. Background Check <span className="font-normal text-ensena-muted">(Optional)</span>
        </h3>
        <p className="text-xs text-ensena-muted">A background check helps parents feel more confident.</p>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2.5 text-sm text-ensena-ink">
            <input
              type="checkbox"
              checked={form.backgroundCheckConsent}
              onChange={(e) => update({ backgroundCheckConsent: e.target.checked })}
              className="size-4 accent-ensena-primary"
            />
            I&apos;m willing to complete a background check
          </label>
          {form.backgroundCheckConsent && (
            <span className="flex items-center gap-1 rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">
              <ShieldCheck className="size-3.5" /> Noted
            </span>
          )}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">
            7. Teaching Sample <span className="font-normal text-ensena-muted">(Optional)</span>
          </h3>
          <p className="text-xs text-ensena-muted">Upload a sample of your teaching materials or lesson content</p>
          <FileDropzone
            icon={Upload}
            label="Upload Sample"
            hint="PPT, PDF, DOC or JPG. Max 20MB."
            fileName={form.teachingSampleFileName}
            onFileSelected={(name) => update({ teachingSampleFileName: name })}
            className="mt-2"
          />
        </section>
        <section>
          <h3 className="text-sm font-semibold text-ensena-ink">
            8. Intro Lesson Video <span className="font-normal text-ensena-muted">(Optional)</span>
          </h3>
          <p className="text-xs text-ensena-muted">Upload a short 30–90 sec video introducing yourself</p>
          <FileDropzone
            icon={Video}
            label="Upload Video"
            hint="MP4, MOV or WEBM. Max 100MB."
            accept="video/*"
            fileName={form.introLessonVideoFileName}
            onFileSelected={(name) => update({ introLessonVideoFileName: name })}
            className="mt-2"
          />
        </section>
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">
          9. Social &amp; Professional Links <span className="font-normal text-ensena-muted">(Optional)</span>
        </h3>
        <p className="text-xs text-ensena-muted">Add links to your professional profiles or portfolio</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <LinkedinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.linkedin}
              onChange={(e) => update({ linkedin: e.target.value })}
              placeholder="LinkedIn profile link"
              className="h-10 rounded-xl border-ensena-border pl-9"
            />
          </div>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.website}
              onChange={(e) => update({ website: e.target.value })}
              placeholder="Website or portfolio link"
              className="h-10 rounded-xl border-ensena-border pl-9"
            />
          </div>
          <div className="relative">
            <YoutubeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.youtube}
              onChange={(e) => update({ youtube: e.target.value })}
              placeholder="YouTube channel link"
              className="h-10 rounded-xl border-ensena-border pl-9"
            />
          </div>
          <div className="relative">
            <GithubIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.github}
              onChange={(e) => update({ github: e.target.value })}
              placeholder="GitHub profile link"
              className="h-10 rounded-xl border-ensena-border pl-9"
            />
          </div>
        </div>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-ensena-muted">
        <ShieldCheck className="size-4 shrink-0 text-ensena-primary" />
        Your documents are securely encrypted and are only used for verification purposes.
      </p>
    </div>
  );
}
