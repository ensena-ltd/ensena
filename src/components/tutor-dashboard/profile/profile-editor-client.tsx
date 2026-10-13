"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Camera,
  ChevronLeft,
  Clock,
  Eye,
  Globe,
  Plane,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, TwitterIcon } from "@/components/social-icons";
import { Button } from "@/components/ui/button";
import {
  academicLevelOptions,
  ageGroupOptions,
  dashboardTutor,
  defaultExperienceEntries,
  defaultGroupPricing,
  defaultHourlyRates,
  defaultPersonalInfo,
  defaultSocialLinks,
  defaultVerificationDocs,
  defaultWeeklyAvailability,
  languageOptions,
  nigerianStates,
  professionalHeadlines,
  subjectOptions,
  tutorProfileDetail,
  type ExperienceEntry,
  type WeeklyAvailabilityDay,
} from "@/lib/tutor-dashboard-data";
import { to12HourDisplay, to24HourValue } from "@/lib/time-format";
import { cn } from "@/lib/utils";
import { latestDobForAge, TUTOR_MIN_AGE } from "@/lib/age";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MultiSelectChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              active ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileEditorClient() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  function handlePhotoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }
  const [personal, setPersonal] = useState(defaultPersonalInfo);
  const [headline, setHeadline] = useState(professionalHeadlines[0]);
  const [about, setAbout] = useState(tutorProfileDetail.bio);
  const [subjects, setSubjects] = useState<string[]>(tutorProfileDetail.subjects);
  const [levels, setLevels] = useState<string[]>(["Secondary", "WAEC", "JAMB"]);
  const [languages, setLanguages] = useState<string[]>(["English", "French"]);
  const [experience, setExperience] = useState<ExperienceEntry[]>(defaultExperienceEntries);
  const [rates, setRates] = useState(defaultHourlyRates);
  const [groupPricing, setGroupPricing] = useState(defaultGroupPricing);
  const [availability, setAvailability] = useState<WeeklyAvailabilityDay[]>(defaultWeeklyAvailability);
  const [vacationMode, setVacationMode] = useState(false);
  const [timezone, setTimezone] = useState("WAT (GMT+1)");
  const [ageGroups, setAgeGroups] = useState<string[]>(["Teenagers (13-18)"]);
  const [maxStudentsPerDay, setMaxStudentsPerDay] = useState(6);
  const [maxWorkingHours, setMaxWorkingHours] = useState(8);
  const [preferredDuration, setPreferredDuration] = useState("60 mins");
  const [socialLinks, setSocialLinks] = useState(defaultSocialLinks);
  const [verificationDocs] = useState(defaultVerificationDocs);
  const [saved, setSaved] = useState(false);
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [resourceFileNames, setResourceFileNames] = useState<string[]>(["Week 1 Lesson Plan.pdf"]);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (value: string) =>
      setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function addExperience(type: ExperienceEntry["type"]) {
    setExperience((prev) => [...prev, { id: `exp-${Date.now()}`, type, title: "", institution: "", year: "" }]);
  }

  function updateExperience(id: string, patch: Partial<ExperienceEntry>) {
    setExperience((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeExperience(id: string) {
    setExperience((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleResourceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResourceFileNames((prev) => [...prev, file.name]);
    e.target.value = "";
  }

  return (
    <div>
      <Link href="/tutor-dashboard/profile" className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Profile
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Edit Profile</h1>
          <p className="mt-1 text-sm text-ensena-muted">Update your public tutor profile and teaching preferences.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/tutor-dashboard/profile" />}
            className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
          >
            <Eye className="size-4" /> Preview Profile
          </Button>
          <Button onClick={handleSave} className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white">
            <Save className="size-4" /> {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <Section title="Personal Information">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <div className="relative mx-auto size-20 overflow-hidden rounded-full">
                <Image src={photoPreview ?? dashboardTutor.image} alt="Profile" fill sizes="80px" className="object-cover" />
              </div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoFileSelected} className="hidden" />
              <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 flex items-center gap-1 text-xs font-medium text-ensena-primary">
                <Camera className="size-3.5" /> Change Photo
              </button>
            </div>
            <div className="flex-1">
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                <Camera className="mr-1.5 size-4" /> Upload Cover Photo
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">First name</span>
              <input value={personal.firstName} onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Last name</span>
              <input value={personal.lastName} onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Display name</span>
              <input value={personal.displayName} onChange={(e) => setPersonal((p) => ({ ...p, displayName: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Gender</span>
              <select value={personal.gender} onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                <option>Female</option>
                <option>Male</option>
                <option>Prefer not to say</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Date of birth</span>
              <input type="date" value={personal.dob} max={latestDobForAge(TUTOR_MIN_AGE)} onChange={(e) => setPersonal((p) => ({ ...p, dob: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Phone number</span>
              <input value={personal.phone} onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Email</span>
              <input value={personal.email} onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Country</span>
              <input value={personal.country} onChange={(e) => setPersonal((p) => ({ ...p, country: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">State</span>
              <select value={personal.state} onChange={(e) => setPersonal((p) => ({ ...p, state: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {nigerianStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">City</span>
              <input value={personal.city} onChange={(e) => setPersonal((p) => ({ ...p, city: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-ensena-muted">Address</span>
              <input value={personal.address} onChange={(e) => setPersonal((p) => ({ ...p, address: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
          </div>
        </Section>

        <Section title="Professional Information">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Professional headline</span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              list="headline-suggestions"
              className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
            />
            <datalist id="headline-suggestions">
              {professionalHeadlines.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </label>
        </Section>

        <Section title="About Me">
          <textarea
            value={about}
            maxLength={2000}
            onChange={(e) => setAbout(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink"
          />
          <p className="mt-1 text-right text-xs text-ensena-muted">{about.length} / 2000 characters</p>
        </Section>

        <Section title="Subjects">
          <MultiSelectChips options={subjectOptions} selected={subjects} onToggle={toggle(setSubjects)} />
        </Section>

        <Section title="Academic Levels">
          <MultiSelectChips options={academicLevelOptions} selected={levels} onToggle={toggle(setLevels)} />
        </Section>

        <Section title="Languages Spoken">
          <MultiSelectChips options={languageOptions} selected={languages} onToggle={toggle(setLanguages)} />
        </Section>

        <Section title="Teaching Experience">
          <div className="flex flex-col gap-2.5">
            {experience.map((e) => (
              <div key={e.id} className="grid grid-cols-1 gap-2 rounded-xl border border-ensena-border p-3 sm:grid-cols-[100px_1fr_1fr_80px_32px]">
                <select value={e.type} onChange={(ev) => updateExperience(e.id, { type: ev.target.value as ExperienceEntry["type"] })} className="h-9 rounded-lg border border-ensena-border px-2 text-xs">
                  <option>Degree</option>
                  <option>Certification</option>
                  <option>Award</option>
                </select>
                <input value={e.title} onChange={(ev) => updateExperience(e.id, { title: ev.target.value })} placeholder="Title" className="h-9 rounded-lg border border-ensena-border px-2 text-xs" />
                <input value={e.institution} onChange={(ev) => updateExperience(e.id, { institution: ev.target.value })} placeholder="Institution" className="h-9 rounded-lg border border-ensena-border px-2 text-xs" />
                <input value={e.year} onChange={(ev) => updateExperience(e.id, { year: ev.target.value })} placeholder="Year" className="h-9 rounded-lg border border-ensena-border px-2 text-xs" />
                <button type="button" onClick={() => removeExperience(e.id)} aria-label="Remove entry" className="flex h-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addExperience("Degree")}
              className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline"
            >
              <Plus className="size-4" /> Add Experience
            </button>
          </div>
        </Section>

        <Section title="Hourly Rates">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(rates) as unknown as (keyof typeof rates)[]).map((duration) => (
              <label key={duration} className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">{duration} mins</span>
                <input
                  type="number"
                  value={rates[duration]}
                  onChange={(e) => setRates((prev) => ({ ...prev, [duration]: Number(e.target.value) }))}
                  className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Group Class Pricing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Price per student (₦)</span>
              <input
                type="number"
                value={groupPricing.pricePerStudent}
                onChange={(e) => setGroupPricing((p) => ({ ...p, pricePerStudent: Number(e.target.value) }))}
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Minimum class size</span>
              <input
                type="number"
                min={1}
                value={groupPricing.minClassSize}
                onChange={(e) => setGroupPricing((p) => ({ ...p, minClassSize: Number(e.target.value) }))}
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Maximum class size (max 10)</span>
              <input
                type="number"
                min={1}
                max={10}
                value={groupPricing.maxClassSize}
                onChange={(e) => setGroupPricing((p) => ({ ...p, maxClassSize: Math.min(10, Number(e.target.value)) }))}
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
          </div>
        </Section>

        <Section title="Availability">
          <p className="-mt-2 mb-1 text-xs text-ensena-muted">Set your own weekly hours. Students can only book within the times you mark available.</p>
          <div className="flex flex-col gap-2">
            {availability.map((row, i) => (
              <div key={row.day} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => setAvailability((prev) => prev.map((r, idx) => (idx === i ? { ...r, enabled: e.target.checked } : r)))}
                    className="size-4 rounded border-ensena-border accent-ensena-primary"
                  />
                  {row.day}
                </label>
                {row.enabled ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="time"
                      value={to24HourValue(row.start)}
                      onChange={(e) => setAvailability((prev) => prev.map((r, idx) => (idx === i ? { ...r, start: to12HourDisplay(e.target.value) } : r)))}
                      className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink"
                    />
                    <span className="text-ensena-muted">to</span>
                    <input
                      type="time"
                      value={to24HourValue(row.end)}
                      onChange={(e) => setAvailability((prev) => prev.map((r, idx) => (idx === i ? { ...r, end: to12HourDisplay(e.target.value) } : r)))}
                      className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-ensena-border">Unavailable</span>
                )}
              </div>
            ))}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ensena-border p-3">
              <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
                <input type="checkbox" checked={vacationMode} onChange={(e) => setVacationMode(e.target.checked)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                <span className="flex items-center gap-1.5">
                  <Plane className="size-4 text-ensena-primary" /> Vacation / Holiday Mode
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-ensena-muted">
                <Clock className="size-3.5" /> Timezone
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-8 rounded-lg border border-ensena-border px-2 text-xs">
                  <option>WAT (GMT+1)</option>
                  <option>GMT</option>
                  <option>EST</option>
                </select>
              </label>
            </div>
          </div>
        </Section>

        <Section title="Teaching Preferences">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-ensena-muted">Preferred age groups</span>
              <div className="mt-1.5">
                <MultiSelectChips options={ageGroupOptions} selected={ageGroups} onToggle={toggle(setAgeGroups)} />
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Preferred lesson duration</span>
              <select value={preferredDuration} onChange={(e) => setPreferredDuration(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                <option>30 mins</option>
                <option>45 mins</option>
                <option>60 mins</option>
                <option>90 mins</option>
                <option>120 mins</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Max students per day</span>
              <input type="number" value={maxStudentsPerDay} onChange={(e) => setMaxStudentsPerDay(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Max working hours per day</span>
              <input type="number" value={maxWorkingHours} onChange={(e) => setMaxWorkingHours(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
          </div>
        </Section>

        <Section title="Teaching Resources">
          <input ref={resourceInputRef} type="file" onChange={handleResourceUpload} className="hidden" />
          <ul className="flex flex-col gap-2">
            {resourceFileNames.map((name) => (
              <li key={name} className="flex items-center justify-between rounded-lg border border-ensena-border px-3 py-2 text-sm text-ensena-ink">
                {name}
                <button type="button" onClick={() => setResourceFileNames((prev) => prev.filter((n) => n !== name))} aria-label={`Remove ${name}`} className="text-rose-500">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => resourceInputRef.current?.click()}
            className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline"
          >
            <Upload className="size-4" /> Upload File (PDF, PPT, Doc, Worksheet, Video)
          </button>
          <p className="mt-1 text-xs text-ensena-muted">You can also link a Google Drive or Dropbox folder from the Resources page.</p>
        </Section>

        <Section title="Introduction Video">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">YouTube or Vimeo link</span>
            <div className="relative">
              <Video className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="h-10 w-full rounded-lg border border-ensena-border pl-9 pr-3 text-sm"
              />
            </div>
          </label>
        </Section>

        <Section title="Social Links">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <LinkedinIcon className="size-4 text-ensena-muted" />
              <input value={socialLinks.linkedin} onChange={(e) => setSocialLinks((s) => ({ ...s, linkedin: e.target.value }))} placeholder="LinkedIn URL" className="h-10 flex-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <FacebookIcon className="size-4 text-ensena-muted" />
              <input value={socialLinks.facebook} onChange={(e) => setSocialLinks((s) => ({ ...s, facebook: e.target.value }))} placeholder="Facebook URL" className="h-10 flex-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <InstagramIcon className="size-4 text-ensena-muted" />
              <input value={socialLinks.instagram} onChange={(e) => setSocialLinks((s) => ({ ...s, instagram: e.target.value }))} placeholder="Instagram URL" className="h-10 flex-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <TiktokIcon className="size-4 text-ensena-muted" />
              <input value={socialLinks.tiktok} onChange={(e) => setSocialLinks((s) => ({ ...s, tiktok: e.target.value }))} placeholder="TikTok URL" className="h-10 flex-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <TwitterIcon className="size-4 text-ensena-muted" />
              <input value={socialLinks.x} onChange={(e) => setSocialLinks((s) => ({ ...s, x: e.target.value }))} placeholder="X (Twitter) URL" className="h-10 flex-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-ensena-border px-3">
              <Globe className="size-4 text-ensena-muted" />
              <input value={socialLinks.website} onChange={(e) => setSocialLinks((s) => ({ ...s, website: e.target.value }))} placeholder="Personal website" className="h-10 flex-1 text-sm" />
            </label>
          </div>
        </Section>

        <Section title="Verification">
          <ul className="flex flex-col gap-2">
            {verificationDocs.map((doc) => (
              <li key={doc.label} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                <span className="flex items-center gap-2 text-ensena-ink">
                  <BadgeCheck className={cn("size-4", doc.status === "Verified" ? "text-ensena-success" : "text-ensena-border")} />
                  {doc.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    doc.status === "Verified" ? "bg-emerald-100 text-emerald-700" : doc.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-ensena-bg-soft text-ensena-muted"
                  )}
                >
                  {doc.status}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex items-center gap-2 rounded-2xl bg-ensena-success/10 p-4 text-sm text-ensena-ink">
          <Award className="size-4 shrink-0 text-ensena-success" />
          Complete profiles get up to 3x more bookings from students.
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/tutor-dashboard/profile" />}
            className="h-11 rounded-full border-ensena-border px-6 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-8 text-sm font-semibold text-white">
            <Save className="size-4" /> {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
