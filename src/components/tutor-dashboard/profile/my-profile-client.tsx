"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Info,
  Languages as LanguagesIcon,
  Lightbulb,
  Plane,
  Save,
  ShieldCheck,
  Star,
  Upload,
} from "lucide-react";

import { SearchableTagField } from "@/components/sign-up/searchable-tag-field";
import { TutorProfileReal } from "@/components/student-dashboard/live/tutor-profile-real";
import { LiveAvailabilityEditor, summarizeAvailability } from "@/components/tutor-dashboard/profile/live-availability-editor";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { isTutorVerified, saveTutorInformation, tutorDocumentTypes, useTutorIdentity, type TutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { useTutorPublicProfile } from "@/hooks/use-tutor-public-profile";
import {
  academicSpecializationLabels,
  departmentOptionsFor,
  courseOptionsFor,
  researchAreaOptionsFor,
  sanitizeAcademicStructure,
  showsGraduateStructure,
  showsUndergraduateStructure,
  type AcademicStructureFilters,
} from "@/lib/academic-structure-filter";
import { supportTypeOptions, supportTypeLabelsFor, type SupportTypeId } from "@/lib/academic-support-types";
import { faculties, researchFields } from "@/lib/academic-taxonomy-data";
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import { academicLevels as onboardingAcademicLevels } from "@/lib/data";
import { formatNaira } from "@/lib/format";
import { examOptions, LEVEL_EXPERTISE_CONFIG } from "@/lib/level-expertise-config";
import { recordViolation } from "@/lib/moderation-store";
import { to12HourDisplay, to24HourValue } from "@/lib/time-format";
import {
  dashboardTutor,
  defaultWeeklyAvailability,
  summarizeWeeklyAvailability,
  tutorDocumentStatusStyles,
  type TutorDocument,
  type WeeklyAvailabilityDay,
} from "@/lib/tutor-dashboard-data";
import { flattenLevelExpertise, saveTutorPublicProfile } from "@/lib/tutor-public-profile-store";
import type { LevelExpertise } from "@/lib/tutor-signup-data";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";
import type { TutorAvailabilitySnapshot } from "@/lib/tutor-settings-server";
import { languageSubjectOptions } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const viewTabs = ["Public Profile", "Availability", "Preview Profile"] as const;
type ViewTab = (typeof viewTabs)[number];

const MAX_HEADLINE = 100;
const MAX_BIO = 500;
const MAX_DISCOVERY_PRICE = 2000;
const LANGUAGE_SUGGESTIONS = Array.from(new Set(["English", ...languageSubjectOptions]));
// Levels that carry their own subject list in the sign-up model. "Exams"
// and "Language" are selectable academic levels too, but their own items
// are edited through the dedicated Exam Expertise / Languages cards below
// instead of the Subjects card, matching tutor onboarding's layout.
const SUBJECT_BEARING_LEVELS = new Set(["Nursery", "Primary", "Secondary", "Undergraduate", "Masters", "PhD"]);

// Case-insensitive so a mangled URL (mobile autofill/history, manual
// typing) still lands on the right tab instead of silently falling back —
// see the matching comment in my-lessons-hub-client.tsx.
function resolveTab(raw: string | null): ViewTab {
  if (!raw) return "Public Profile";
  const normalized = raw.trim().toLowerCase();
  const match = viewTabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "Public Profile";
}

// Academic Levels: the same fixed 8-level taxonomy used at tutor sign-up
// (src/lib/data.ts) — multi-select, never a custom/free-text field, since
// "academic level" is a platform taxonomy rather than open expertise.
function LevelToggleChips({ selected, onToggle }: { selected: string[]; onToggle: (level: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {onboardingAcademicLevels.map((level) => {
        const active = selected.includes(level.label);
        return (
          <button
            key={level.label}
            type="button"
            onClick={() => onToggle(level.label)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium",
              active ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {level.label}
          </button>
        );
      })}
    </div>
  );
}

// "Services I Offer" — grouped checkboxes, Tutoring under its own "Teaching"
// heading and everything else under "Academic Support", matching the
// requested structure exactly. A separate, explicit declaration from
// subjects/academic levels: teaching a subject never implies offering every
// kind of academic support, so this has to be its own checked-off list.
function ServicesEditor({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const teaching = supportTypeOptions.filter((o) => o.id === "tutoring");
  const academicSupport = supportTypeOptions.filter((o) => o.id !== "tutoring");
  return (
    <div className="flex flex-col gap-4">
      {[
        { heading: "Teaching", options: teaching },
        { heading: "Academic Support", options: academicSupport },
      ].map((group) => (
        <div key={group.heading}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">{group.heading}</p>
          <div className="mt-1.5 flex flex-col gap-2">
            {group.options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ensena-ink">
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={() => onToggle(option.id)}
                  className="size-4 rounded border-ensena-border accent-ensena-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Small checkbox-list building block shared by every tier of the academic
// specialization editor below (Faculty/Department/Course, Field/Research
// Area) — same visual language as ServicesEditor, just parameterized.
function CheckboxList({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ensena-ink">
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => onToggle(option.id)}
            className="size-4 rounded border-ensena-border accent-ensena-primary"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

// Academic specialization — Faculty → Department → Course for Undergraduate,
// Field of Study → Research Area for Masters/PhD, using the exact same
// cascading data/logic the Find Tutor filters read (academic-structure-
// filter.ts) so a tutor's selections here are guaranteed to actually be
// matchable by a student's filter selections, never a parallel shape that
// could silently drift. Only shown for levels the tutor actually teaches —
// "only show relevant fields based on their selected academic level."
function AcademicSpecializationEditor({
  academicLevels,
  value,
  onChange,
}: {
  academicLevels: string[];
  value: AcademicStructureFilters;
  onChange: (next: AcademicStructureFilters) => void;
}) {
  const showsUndergrad = showsUndergraduateStructure(academicLevels);
  const showsGraduate = showsGraduateStructure(academicLevels);
  const departmentOptions = departmentOptionsFor(value.facultyIds);
  const courseOptions = courseOptionsFor(value.departmentIds);
  const researchAreaOptions = researchAreaOptionsFor(value.fieldIds);

  function toggleField<K extends keyof AcademicStructureFilters>(key: K, id: string) {
    const list = value[key];
    const nextList = list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
    onChange(sanitizeAcademicStructure({ ...value, [key]: nextList }));
  }

  if (!showsUndergrad && !showsGraduate) {
    return <p className="text-sm text-ensena-muted">Add Undergraduate, Masters or PhD under Academic Levels above to specialize by faculty, department or research area.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {showsUndergrad && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Faculty</p>
            <div className="mt-1.5"><CheckboxList options={faculties.filter((f) => f.active)} selected={value.facultyIds} onToggle={(id) => toggleField("facultyIds", id)} /></div>
          </div>
          {departmentOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Department</p>
              <div className="mt-1.5"><CheckboxList options={departmentOptions} selected={value.departmentIds} onToggle={(id) => toggleField("departmentIds", id)} /></div>
            </div>
          )}
          {courseOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Course / Module</p>
              <div className="mt-1.5"><CheckboxList options={courseOptions} selected={value.courseIds} onToggle={(id) => toggleField("courseIds", id)} /></div>
            </div>
          )}
        </>
      )}
      {showsGraduate && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Field of Study</p>
            <div className="mt-1.5"><CheckboxList options={researchFields.filter((f) => f.active)} selected={value.fieldIds} onToggle={(id) => toggleField("fieldIds", id)} /></div>
          </div>
          {researchAreaOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Research Area</p>
              <div className="mt-1.5"><CheckboxList options={researchAreaOptions} selected={value.researchAreaIds} onToggle={(id) => toggleField("researchAreaIds", id)} /></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Subjects, scoped per academic level exactly like tutor sign-up's Teaching
// Profile step (LEVEL_EXPERTISE_CONFIG + SearchableTagField): a tutor
// teaching both Secondary and Undergraduate keeps two separate subject
// lists instead of one flattened generic list.
function SubjectsEditor({
  academicLevels,
  levelExpertise,
  onChange,
}: {
  academicLevels: string[];
  levelExpertise: LevelExpertise[];
  onChange: (next: LevelExpertise[]) => void;
}) {
  const subjectLevels = academicLevels.filter((l) => SUBJECT_BEARING_LEVELS.has(l));
  const [activeLevel, setActiveLevel] = useState<string | null>(subjectLevels[0] ?? null);

  // Re-point the active tab whenever the set of subject-bearing levels
  // changes (a level was added/removed in the Academic Levels card) —
  // adjusting state during render rather than an effect, same pattern as
  // this file's own tabParam sync further down.
  const levelsKey = subjectLevels.join("|");
  const [prevLevelsKey, setPrevLevelsKey] = useState(levelsKey);
  if (levelsKey !== prevLevelsKey) {
    setPrevLevelsKey(levelsKey);
    if (!activeLevel || !subjectLevels.includes(activeLevel)) {
      setActiveLevel(subjectLevels[0] ?? null);
    }
  }

  if (subjectLevels.length === 0) {
    return <p className="text-sm text-ensena-muted">Add an academic level (e.g. Secondary or Undergraduate) below to start adding subjects for it.</p>;
  }

  function itemsFor(level: string): string[] {
    return levelExpertise.find((e) => e.level === level)?.items ?? [];
  }

  function setItemsFor(level: string, items: string[]) {
    const config = LEVEL_EXPERTISE_CONFIG[level];
    const exists = levelExpertise.some((e) => e.level === level);
    const next = exists
      ? levelExpertise.map((e) => (e.level === level ? { ...e, items } : e))
      : [...levelExpertise, { level, category: config.category, items }];
    onChange(next);
  }

  const config = activeLevel ? LEVEL_EXPERTISE_CONFIG[activeLevel] : undefined;

  return (
    <div>
      {subjectLevels.length > 1 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {subjectLevels.map((level) => {
            const count = itemsFor(level).length;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setActiveLevel(level)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                  activeLevel === level ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                )}
              >
                {level} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}
      {activeLevel && config && (
        <SearchableTagField values={itemsFor(activeLevel)} suggestions={config.suggestions} placeholder={config.placeholder} onChange={(items) => setItemsFor(activeLevel, items)} />
      )}
    </div>
  );
}

interface PublicProfileFormState {
  headline: string;
  bio: string;
  subjects: string[];
  academicLevels: string[];
  examExpertise: string[];
  supportTypes: string[];
  academicSpecialization: AcademicStructureFilters;
  experienceYears: number;
  languages: string[];
  hourlyRate: number;
  hourlyDuration: 30 | 45 | 60;
  discoveryEnabled: boolean;
  discoveryDuration: 15 | 30;
  discoveryPrice: number;
}

// The "what students see" preview — used both as the small live-updating
// widget beside the desktop edit form and, full-size, as the entire
// content of the Preview Profile tab.
function ProfilePreviewCard({ form, photo }: { form: PublicProfileFormState; photo: string }) {
  const me = useTutorIdentity();
  const rating = useTutorRating(me.name, me.id ? 0 : dashboardTutor.rating, me.id ? 0 : dashboardTutor.reviews);
  return (
    <div className="overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface">
      <div className="h-24 bg-gradient-to-br from-ensena-cta-from to-ensena-cta-to" />
      <div className="px-5 pb-5">
        <div className="relative -mt-10 size-20 overflow-hidden rounded-full border-4 border-white">
          <Image src={photo} alt={me.name} fill sizes="80px" className="object-cover" />
          <span className="absolute bottom-1 right-1 size-3 rounded-full border-2 border-white bg-ensena-success" />
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-heading text-lg font-semibold text-ensena-ink">
          {me.name} <VerifiedTutorBadge verified={me.id ? isTutorVerified(me) : undefined} tutorName={me.name} />
        </p>
        <p className="text-sm text-ensena-muted">{form.headline || "Add a headline to describe what you teach."}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ensena-muted">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)
        </p>

        <p className="mt-3 text-sm text-ensena-ink">{form.bio}</p>

        <dl className="mt-4 flex flex-col gap-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div><dt className="text-xs text-ensena-muted">Subjects</dt><dd className="text-ensena-ink">{form.subjects.join(", ") || "—"}</dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div>
              <dt className="text-xs text-ensena-muted">What I can help with</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {form.supportTypes.length > 0 ? (
                  supportTypeLabelsFor(form.supportTypes).map((label) => (
                    <span key={label} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{label}</span>
                  ))
                ) : (
                  <span className="text-ensena-ink">—</span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div><dt className="text-xs text-ensena-muted">Academic Levels</dt><dd className="text-ensena-ink">{form.academicLevels.join(", ") || "—"}</dd></div>
          </div>
          {academicSpecializationLabels(form.academicSpecialization).length > 0 && (
            <div className="flex items-start gap-2.5">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
              <div><dt className="text-xs text-ensena-muted">Specialization</dt><dd className="text-ensena-ink">{academicSpecializationLabels(form.academicSpecialization).join(", ")}</dd></div>
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <Award className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div><dt className="text-xs text-ensena-muted">Exam Expertise</dt><dd className="text-ensena-ink">{form.examExpertise.join(", ") || "—"}</dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Calendar className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div><dt className="text-xs text-ensena-muted">Teaching Experience</dt><dd className="text-ensena-ink">{form.experienceYears} Years</dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <LanguagesIcon className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div><dt className="text-xs text-ensena-muted">Languages</dt><dd className="text-ensena-ink">{form.languages.join(", ") || "—"}</dd></div>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-ensena-border p-3">
            <p className="text-xs text-ensena-muted">Hourly Rate ({form.hourlyDuration} min)</p>
            <p className="font-heading text-base font-semibold text-ensena-ink">{formatNaira(form.hourlyRate)}</p>
          </div>
          <div className="rounded-xl border border-ensena-border p-3">
            <p className="text-xs text-ensena-muted">Discovery Session</p>
            <p className="font-heading text-base font-semibold text-ensena-ink">
              {form.discoveryEnabled ? `${form.discoveryDuration} min · ${form.discoveryPrice > 0 ? formatNaira(form.discoveryPrice) : "Free"}` : "Not offered"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Preview only. Students book from your live public profile."
          className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-ensena-primary text-sm font-semibold text-white opacity-90 disabled:cursor-not-allowed"
        >
          Book a Discovery Session
        </button>
      </div>
    </div>
  );
}

// Private to the tutor (and admin, elsewhere) — never rendered inside
// ProfilePreviewCard or anywhere a student could see it. Reused as-is on
// both desktop and mobile since it's already a single-column list; no
// separate mobile layout needed the way the chip-editor fields have one.
function DocumentsSection({ documents, onUploadClick }: { documents: TutorDocument[]; onUploadClick: (docId: string) => void }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
        <FileText className="size-4.5 text-ensena-primary" /> Verification &amp; Documents
      </h2>
      <p className="mt-1 text-xs text-ensena-muted">
        Private to you and the Ensena verification team. Students only ever see your public verification badges, never these files.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-col gap-2 rounded-xl border border-ensena-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ensena-ink">{doc.name}</p>
              <p className="truncate text-xs text-ensena-muted">{doc.fileName} · Uploaded {doc.uploadedDate}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tutorDocumentStatusStyles[doc.status])}>{doc.status}</span>
              <button
                type="button"
                onClick={() => onUploadClick(doc.id)}
                className="flex h-8 items-center gap-1 rounded-full border border-ensena-border px-3 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <Upload className="size-3.5" /> Replace
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "3 – 5 years" -> 3 (sign-up stores experience as a range label; this
// page edits it as a number of years) and back.
function experienceYearsFrom(label: string): number {
  if (/less than/i.test(label)) return 0;
  const n = parseInt(label, 10);
  return Number.isNaN(n) ? 0 : n;
}

function experienceBucket(years: number): string {
  if (years < 1) return "Less than 1 year";
  if (years <= 2) return "1 – 2 years";
  if (years <= 5) return "3 – 5 years";
  if (years <= 10) return "6 – 10 years";
  return "10+ years";
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function realProfileFrom(me: TutorIdentity, base: ReturnType<typeof useTutorPublicProfile>): ReturnType<typeof useTutorPublicProfile> {
  const app = me.applicationData;
  const expertise = (Array.isArray(app.levelExpertise) ? app.levelExpertise : []) as LevelExpertise[];
  const spec = (app.academicSpecialization && typeof app.academicSpecialization === "object" ? app.academicSpecialization : {}) as Record<string, unknown>;
  const rateMins = Number(app.rateDurationMins);
  const trialMins = Number(app.trialDurationMins);
  return {
    ...base,
    supportTypes: strings(app.supportTypes) as SupportTypeId[],
    academicSpecialization: {
      facultyIds: strings(spec.facultyIds),
      departmentIds: strings(spec.departmentIds),
      courseIds: strings(spec.courseIds),
      fieldIds: strings(spec.fieldIds),
      researchAreaIds: strings(spec.researchAreaIds),
    },
    hourlyDurationMins: rateMins === 30 || rateMins === 45 ? rateMins : 60,
    discoveryDurationMins: trialMins === 15 ? 15 : 30,
    discoveryPrice: Math.min(MAX_DISCOVERY_PRICE, Math.max(0, Number(app.trialPrice) || 0)),
    documents: [],
    headline: me.headline,
    bio: me.bio,
    academicLevels: me.levels,
    levelExpertise: expertise,
    examExpertise: me.exams,
    languages: me.languages,
    teachingExperienceYears: experienceYearsFrom(me.yearsExperience),
    hourlyRate: Number(me.oneOnOnePrice) || 0,
    discoveryEnabled: me.discoverySession,
    photoUrl: me.image,
  };
}

// Real tutors manage verification documents on /tutor-dashboard/verification
// (private Supabase storage) — this summarises them here.
function RealDocumentsSummary({ me }: { me: TutorIdentity }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
        <FileText className="size-4.5 text-ensena-primary" /> Verification &amp; Documents
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {tutorDocumentTypes.map((t) => {
          const doc = me.documents.find((d) => d.type === t.type);
          return (
            <li key={t.type} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ensena-ink">{t.label}</span>
              <span className={cn("text-xs font-semibold", doc ? (doc.status === "rejected" ? "text-rose-600" : "text-ensena-success") : "text-ensena-primary")}>
                {doc ? (doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : "Submitted") : "Not submitted"}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/tutor-dashboard/verification" className="mt-3 inline-flex h-9 items-center rounded-full border border-ensena-border px-4 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
        Manage documents
      </Link>
    </div>
  );
}

export interface LiveProfileData {
  availability: TutorAvailabilitySnapshot;
  /** What students see — the saved profile, even before approval. */
  preview: TutorPublicProfile | null;
  nowMs: number;
}

export function MyProfileClient({ live = null }: { live?: LiveProfileData | null } = {}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<ViewTab>(() => resolveTab(tabParam));
  const router = useRouter();
  const me = useTutorIdentity();
  const rating = useTutorRating(me.name, me.id ? 0 : dashboardTutor.rating, me.id ? 0 : dashboardTutor.reviews);

  // Keep in sync with sidebar navigation to the same route with a
  // different `?tab=` (Next.js updates the URL without remounting this
  // component). Adjusted during render rather than in a useEffect — React's
  // recommended pattern for "derive state from a changed prop" — see the
  // matching comment in my-lessons-hub-client.tsx.
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setView(resolveTab(tabParam));
  }

  // Real, persisted profile — the same record backs both the desktop and
  // mobile layouts below (they're one component), and the tutor's own
  // public find-teachers page overlays these same values (see
  // useLiveTutorOverride in tutor-profile-client.tsx), so there is exactly
  // one underlying source of truth, not separate mobile/desktop copies.
  // A real (Supabase) tutor's profile comes from their sign-up answers in
  // tutor_profiles.application_data instead of the local demo store.
  const storedProfile = useTutorPublicProfile();
  const liveProfile = me.id ? realProfileFrom(me, storedProfile) : storedProfile;
  const [headline, setHeadline] = useState(liveProfile.headline);
  const [bio, setBio] = useState(liveProfile.bio);
  const [academicLevels, setAcademicLevels] = useState(liveProfile.academicLevels);
  const [levelExpertise, setLevelExpertise] = useState(liveProfile.levelExpertise);
  const [examExpertise, setExamExpertise] = useState(liveProfile.examExpertise);
  const [supportTypes, setSupportTypes] = useState<SupportTypeId[]>(liveProfile.supportTypes);
  const [academicSpecialization, setAcademicSpecialization] = useState<AcademicStructureFilters>(liveProfile.academicSpecialization);
  const [experienceYears, setExperienceYears] = useState(liveProfile.teachingExperienceYears);
  const [languages, setLanguages] = useState(liveProfile.languages);
  const [hourlyRate, setHourlyRate] = useState(liveProfile.hourlyRate);
  const [hourlyDuration, setHourlyDuration] = useState<30 | 45 | 60>(liveProfile.hourlyDurationMins);
  const [discoveryEnabled, setDiscoveryEnabled] = useState(liveProfile.discoveryEnabled);
  const [discoveryDuration, setDiscoveryDuration] = useState<15 | 30>(liveProfile.discoveryDurationMins);
  const [discoveryPrice, setDiscoveryPrice] = useState(liveProfile.discoveryPrice);
  const [documents, setDocuments] = useState<TutorDocument[]>(liveProfile.documents);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(liveProfile.photoUrl);

  // The very first client render still reflects the SSR seed snapshot
  // (useSyncExternalStore can't read localStorage before hydration); this
  // re-syncs every field the moment it resolves to the tutor's actual saved
  // profile, so a reload never briefly (or permanently) shows stale seed
  // data instead of what was last saved. Adjusting state during render,
  // same pattern as the tabParam sync above.
  const [syncedProfile, setSyncedProfile] = useState(liveProfile);
  if (!me.id && liveProfile !== syncedProfile) {
    setSyncedProfile(liveProfile);
    setHeadline(liveProfile.headline);
    setBio(liveProfile.bio);
    setAcademicLevels(liveProfile.academicLevels);
    setLevelExpertise(liveProfile.levelExpertise);
    setExamExpertise(liveProfile.examExpertise);
    setSupportTypes(liveProfile.supportTypes);
    setAcademicSpecialization(liveProfile.academicSpecialization);
    setExperienceYears(liveProfile.teachingExperienceYears);
    setLanguages(liveProfile.languages);
    setHourlyRate(liveProfile.hourlyRate);
    setHourlyDuration(liveProfile.hourlyDurationMins);
    setDiscoveryEnabled(liveProfile.discoveryEnabled);
    setDiscoveryDuration(liveProfile.discoveryDurationMins);
    setDiscoveryPrice(liveProfile.discoveryPrice);
    setDocuments(liveProfile.documents);
    setPhotoDataUrl(liveProfile.photoUrl);
  }

  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be 5MB or smaller.");
      return;
    }
    setPhotoError(null);
    if (me.id) {
      void uploadRealPhoto(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function uploadRealPhoto(file: File) {
    const supabase = getSupabaseBrowserClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${me.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (uploadError) {
      toast.error("We couldn't upload your photo. Please try again.");
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", me.id!);
    if (error) {
      toast.error("We couldn't save your photo. Please try again.");
      return;
    }
    setPhotoDataUrl(url);
    toast.success("Profile photo updated.");
    router.refresh();
  }

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailabilityDay[]>(defaultWeeklyAvailability);
  const [vacationMode, setVacationMode] = useState(false);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  function validate(): string | null {
    if (!headline.trim()) return "Add a headline describing what you teach.";
    if (!bio.trim()) return "Add a short bio.";
    if (academicLevels.length === 0) return "Select at least one academic level.";
    const hasAnyExpertise = levelExpertise.some((e) => e.items.length > 0) || examExpertise.length > 0 || languages.length > 0;
    if (!hasAnyExpertise) return "Add at least one subject, exam or language you teach.";
    if (!hourlyRate || hourlyRate <= 0) return "Enter a valid hourly rate.";
    return null;
  }

  // The public headline/bio are free-typed text visible to every student
  // browsing the marketplace — exactly the kind of field the off-platform
  // communication policy is meant to cover (see communication-safety.ts),
  // not just direct messages. Legitimate professional info ("I graduated
  // from the University of Lagos") passes through untouched; only actual
  // contact/URL/payment content is blocked.
  function handleSave() {
    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    for (const text of [headline, bio]) {
      const analysis = analyzeCommunication(text);
      if (analysis.verdict === "block" && analysis.primary) {
        recordViolation(me.name, "Tutor", analysis.primary.category, analysis.primary.confidence, "Profile", { evidence: text });
        setSaveError(BLOCKED_MESSAGE_COPY);
        return;
      }
    }
    setSaveError(null);
    setSaving(true);
    if (me.id) {
      void saveRealProfile();
      return;
    }
    try {
      saveTutorPublicProfile({
        headline,
        bio,
        academicLevels,
        levelExpertise,
        examExpertise,
        supportTypes,
        academicSpecialization,
        languages,
        teachingExperienceYears: experienceYears,
        hourlyRate,
        hourlyDurationMins: hourlyDuration,
        discoveryEnabled,
        discoveryDurationMins: discoveryDuration,
        discoveryPrice,
        photoUrl: photoDataUrl,
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
      setSaveError("Couldn't save changes. Try again.");
    }
  }

  async function saveRealProfile() {
    const expertise = levelExpertise
      .filter((e) => academicLevels.includes(e.level))
      .map((e) => (e.level === "Exams" ? { ...e, exams: examExpertise } : e));
    if (academicLevels.includes("Exams") && !expertise.some((e) => e.level === "Exams")) {
      expertise.push({ level: "Exams", category: LEVEL_EXPERTISE_CONFIG.Exams.category, items: [], exams: examExpertise });
    }
    const { error } = await saveTutorInformation(me, {
      application: {
        headline: headline.trim(),
        bio: bio.trim(),
        levels: academicLevels,
        levelExpertise: expertise,
        languagesSpoken: languages,
        yearsExperience: experienceBucket(experienceYears),
        oneOnOnePrice: String(hourlyRate),
        rateDurationMins: hourlyDuration,
        trialLessonEnabled: discoveryEnabled,
        trialDurationMins: discoveryDuration,
        trialPrice: String(discoveryPrice),
        supportTypes,
        academicSpecialization: sanitizeAcademicStructure(academicSpecialization),
      },
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      toast.error(error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Profile saved.");
    router.refresh();
  }

  function triggerDocumentUpload(docId: string) {
    setUploadTargetId(docId);
    documentInputRef.current?.click();
  }

  function handleDocumentFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadTargetId) return;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const next = documents.map((d) => (d.id === uploadTargetId ? { ...d, fileName: file.name, uploadedDate: today, status: "Pending Review" as const } : d));
    setDocuments(next);
    setUploadTargetId(null);
    try {
      saveTutorPublicProfile({ documents: next });
    } catch {
      setSaveError("Couldn't save your document. Try again.");
    }
  }

  function toggleAcademicLevel(level: string) {
    setAcademicLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  function toggleSupportType(id: SupportTypeId) {
    setSupportTypes((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function handleSaveAvailability() {
    setAvailabilitySaved(true);
    setTimeout(() => setAvailabilitySaved(false), 2000);
  }

  const photo = photoDataUrl ?? me.image;
  const flatSubjects = flattenLevelExpertise(levelExpertise);

  const form: PublicProfileFormState = {
    headline, bio, subjects: flatSubjects, academicLevels, examExpertise, supportTypes, academicSpecialization, experienceYears, languages,
    hourlyRate, hourlyDuration, discoveryEnabled, discoveryDuration, discoveryPrice,
  };

  const availabilitySummary = live ? summarizeAvailability(live.availability.days, live.availability.vacationMode) : summarizeWeeklyAvailability(weeklyAvailability);
  const blockedCount = live?.availability.blocked.length ?? 0;

  return (
    <div>
      <input ref={documentInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocumentFileSelected} className="hidden" />
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoFileSelected} className="hidden" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{view}</h1>
          <p className="mt-1 text-sm text-ensena-muted">
            {view === "Public Profile" && "Manage the information that students see on your public profile."}
            {view === "Availability" && "Set the hours students can book private lessons and Discovery Sessions."}
            {view === "Preview Profile" && "This is how students will see your profile."}
          </p>
        </div>
        <div className="flex gap-2">
          {view !== "Preview Profile" && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/tutor-dashboard/profile?tab=Preview Profile" />}
              className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
            >
              <Eye className="size-4" /> Preview Profile
            </Button>
          )}
          {view === "Public Profile" && (
            <Button onClick={handleSave} disabled={saving} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-70">
              <Save className="size-4" /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{saveError}</div>
      )}
      {photoError && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{photoError}</div>
      )}

      {view === "Public Profile" && (
        <div className="mt-6 hidden gap-5 lg:grid lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Personal Information</h2>

              <div className="mt-4 flex flex-wrap items-start gap-6">
                <div className="text-center">
                  <div className="relative mx-auto size-24 overflow-hidden rounded-full">
                    <Image src={photo} alt={me.name} fill sizes="96px" className="object-cover" />
                    <button type="button" aria-label="Change profile photo" onClick={() => photoInputRef.current?.click()} className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-ensena-primary text-white ring-2 ring-white">
                      <Camera className="size-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-ensena-muted">JPG, PNG or WEBP. Max size 5MB.</p>
                </div>

                <div className="min-w-[240px] flex-1">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Full Name</span>
                    <input value={me.name} readOnly className="h-10 rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-ink" />
                  </label>
                  <label className="mt-3 flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">What do you teach? (Shown on your profile)</span>
                    <input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value.slice(0, MAX_HEADLINE))}
                      placeholder="e.g. Math Tutor | WAEC, JAMB & University Level"
                      className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                    />
                    <span className="self-end text-[11px] text-ensena-muted">{headline.length}/{MAX_HEADLINE}</span>
                  </label>
                </div>
              </div>

              <label className="mt-2 flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                  rows={4}
                  className="rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink"
                />
                <span className="self-end text-[11px] text-ensena-muted">{bio.length}/{MAX_BIO}</span>
              </label>

              <div className="mt-4">
                <span className="text-xs font-medium text-ensena-muted">Subjects</span>
                <div className="mt-1.5">
                  <SubjectsEditor academicLevels={academicLevels} levelExpertise={levelExpertise} onChange={setLevelExpertise} />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-medium text-ensena-muted">Academic Levels</span>
                <p className="text-[11px] text-ensena-muted">Select all that apply</p>
                <div className="mt-1.5">
                  <LevelToggleChips selected={academicLevels} onToggle={toggleAcademicLevel} />
                </div>
              </div>

              {(showsUndergraduateStructure(academicLevels) || showsGraduateStructure(academicLevels)) && (
                <div className="mt-4 rounded-xl border border-ensena-border p-4">
                  <span className="text-sm font-semibold text-ensena-ink">Academic Specialization</span>
                  <p className="text-xs text-ensena-muted">Students searching by faculty, department, course or research area will find you through these.</p>
                  <div className="mt-3">
                    <AcademicSpecializationEditor academicLevels={academicLevels} value={academicSpecialization} onChange={setAcademicSpecialization} />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <span className="text-xs font-medium text-ensena-muted">Exam Expertise</span>
                <div className="mt-1.5">
                  <SearchableTagField values={examExpertise} suggestions={examOptions} placeholder="Search exams or add your own" onChange={setExamExpertise} />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-ensena-border p-4">
                <span className="text-sm font-semibold text-ensena-ink">Services I Offer</span>
                <p className="text-xs text-ensena-muted">Select every kind of academic support you actually provide. Students filter Find Tutor by these.</p>
                <div className="mt-3">
                  <ServicesEditor selected={supportTypes} onToggle={toggleSupportType} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Teaching Experience</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value)))}
                      className="h-10 w-24 rounded-lg border border-ensena-border px-3 text-sm"
                    />
                    <span className="flex h-10 flex-1 items-center rounded-lg border border-ensena-border px-3 text-sm text-ensena-muted">Years</span>
                  </div>
                </label>
                <div>
                  <span className="text-xs font-medium text-ensena-muted">Languages</span>
                  <div className="mt-1.5">
                    <SearchableTagField values={languages} suggestions={LANGUAGE_SUGGESTIONS} placeholder="Search languages or add your own" onChange={setLanguages} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Pricing</h2>
                <p className="mt-1 text-xs text-ensena-muted">Set your rates for private classes.</p>
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Hourly Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 items-center rounded-lg border border-ensena-border px-3 text-sm text-ensena-muted">₦</span>
                    <input
                      type="number"
                      min={0}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                      className="h-10 flex-1 rounded-lg border border-ensena-border px-3 text-sm"
                    />
                  </div>
                </label>
                <div className="mt-3">
                  <span className="text-xs font-medium text-ensena-muted">Duration</span>
                  <div className="mt-1.5 flex gap-2">
                    {([30, 45, 60] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setHourlyDuration(mins)}
                        className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", hourlyDuration === mins ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
                    Discovery Session <Info className="size-3.5 text-ensena-muted" aria-label="A short session for prospective students to meet you before booking regular lessons." />
                  </h2>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={discoveryEnabled}
                    onClick={() => setDiscoveryEnabled((v) => !v)}
                    className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", discoveryEnabled ? "bg-ensena-primary" : "bg-ensena-border")}
                  >
                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", discoveryEnabled ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-ensena-muted">Let students book a discovery session to get to know you.</p>

                {discoveryEnabled && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-ensena-ink">Offer Discovery Session</p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-ensena-muted">Session Duration</span>
                        <div className="mt-1.5 flex gap-2">
                          {([15, 30] as const).map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setDiscoveryDuration(mins)}
                              className={cn("flex-1 rounded-lg border px-2 py-2 text-xs font-medium", discoveryDuration === mins ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
                            >
                              {mins} min
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-ensena-muted">Price</span>
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-9 items-center rounded-lg border border-ensena-border px-2 text-xs text-ensena-muted">₦</span>
                          <input
                            type="number"
                            min={0}
                            max={MAX_DISCOVERY_PRICE}
                            value={discoveryPrice}
                            onChange={(e) => setDiscoveryPrice(Math.min(MAX_DISCOVERY_PRICE, Math.max(0, Number(e.target.value))))}
                            placeholder="Free"
                            className="h-9 w-full rounded-lg border border-ensena-border px-2 text-xs"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {me.id ? <RealDocumentsSummary me={me} /> : <DocumentsSection documents={documents} onUploadClick={triggerDocumentUpload} />}

            <p className="text-xs text-ensena-muted">Students will see this information on your public profile.</p>
          </div>

          {/* Desktop live preview */}
          <div className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Profile Preview</p>
                <p className="text-xs text-ensena-muted">This is how students will see your profile.</p>
              </div>
              <ProfilePreviewCard form={form} photo={photo} />
              <div className="flex items-start gap-2 rounded-2xl bg-indigo-50 p-4 text-xs text-ensena-ink">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                A complete and well-written profile attracts more students and increases bookings.
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "Availability" && live && <LiveAvailabilityEditor availability={live.availability} />}

      {view === "Availability" && !live && (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Regular teaching hours</h2>
            <p className="mt-1 text-xs text-ensena-muted">
              Students can only book within the times you mark available. This also controls when Discovery Sessions can be booked.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {weeklyAvailability.map((row, i) => (
                <div key={row.day} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                  <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        setWeeklyAvailability((prev) =>
                          prev.map((r, idx) => (idx === i ? { ...r, enabled: e.target.checked } : r))
                        )
                      }
                      className="size-4 rounded border-ensena-border accent-ensena-primary"
                    />
                    {row.day}
                  </label>
                  {row.enabled ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        type="time"
                        value={to24HourValue(row.start)}
                        onChange={(e) =>
                          setWeeklyAvailability((prev) => prev.map((r, idx) => (idx === i ? { ...r, start: to12HourDisplay(e.target.value) } : r)))
                        }
                        className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink"
                      />
                      <span className="text-ensena-muted">to</span>
                      <input
                        type="time"
                        value={to24HourValue(row.end)}
                        onChange={(e) =>
                          setWeeklyAvailability((prev) => prev.map((r, idx) => (idx === i ? { ...r, end: to12HourDisplay(e.target.value) } : r)))
                        }
                        className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-ensena-border">Unavailable</span>
                  )}
                </div>
              ))}

              <div className="mt-1 flex items-center justify-between rounded-xl border border-dashed border-ensena-border p-3">
                <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
                  <input
                    type="checkbox"
                    checked={vacationMode}
                    onChange={(e) => setVacationMode(e.target.checked)}
                    className="size-4 rounded border-ensena-border accent-ensena-primary"
                  />
                  <span className="flex items-center gap-1.5">
                    <Plane className="size-4 text-ensena-primary" /> Vacation Mode
                  </span>
                </label>
                <span className="text-xs text-ensena-muted">Pauses new bookings</span>
              </div>
            </div>
            <Button onClick={handleSaveAvailability} className="mt-4 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
              <Save className="size-4" /> {availabilitySaved ? "Saved!" : "Save Availability"}
            </Button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
                <Clock className="size-4 text-ensena-primary" /> Blocked time
              </h2>
              <p className="mt-2 text-xs text-ensena-muted">
                Need to block a specific date or time range instead of your regular weekly hours? Use{" "}
                <span className="font-medium text-ensena-ink">Classes → Schedule → Block Time</span>.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-2xl bg-ensena-primary/5 p-4 text-xs text-ensena-ink">
              <Info className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
              This same availability is used for both private-lesson bookings and Discovery Sessions.
            </div>
          </div>
        </div>
      )}

      {view === "Preview Profile" && live && (
        <div className="mt-6">
          {live.preview ? (
            <>
              <p className="mb-3 text-xs text-ensena-muted">Showing your last saved profile. Edits on the Public Profile tab appear here after you save them.</p>
              <TutorProfileReal tutor={live.preview} initiallySaved={false} preview nowMs={live.nowMs} />
            </>
          ) : (
            <p className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-sm text-ensena-muted">We couldn&apos;t load your profile preview. Please refresh the page.</p>
          )}
        </div>
      )}

      {view === "Preview Profile" && !live && (
        <div className="mt-6 max-w-xl">
          <a
            href={`/find-teachers/${dashboardTutor.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mb-4 flex items-center justify-center gap-1.5 rounded-full border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            View Live Public Profile <ExternalLink className="size-3.5" />
          </a>
          <ProfilePreviewCard form={form} photo={photo} />
        </div>
      )}

      {/* Mobile-only: hero + collapsible field cards + Discovery Session +
          Availability summary, all on the Public Profile tab in one scroll
          (matches the mockup — no separate mobile sub-navigation). */}
      {view === "Public Profile" && (
        <div className="mt-5 flex flex-col gap-4 lg:hidden">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-center">
            <div className="relative mx-auto size-24 overflow-hidden rounded-full">
              <Image src={photo} alt={me.name} fill sizes="96px" className="object-cover" />
              <button type="button" aria-label="Change profile photo" onClick={() => photoInputRef.current?.click()} className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-ensena-primary text-white ring-2 ring-white">
                <Camera className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ensena-muted">JPG, PNG or WEBP. Max size 5MB.</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-lg font-semibold text-ensena-ink">{me.name}</p>
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-ensena-success"><span className="size-1.5 rounded-full bg-ensena-success" /> Online</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-ensena-muted">
              <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)
            </p>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-sm font-semibold text-ensena-ink">What do you teach?</p>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, MAX_HEADLINE))}
              placeholder="e.g. Math Tutor | WAEC, JAMB & University Level"
              className="mt-2 h-10 w-full rounded-lg border border-ensena-border px-3 text-sm"
            />
            <span className="mt-1 block text-right text-[11px] text-ensena-muted">{headline.length}/{MAX_HEADLINE}</span>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-sm font-semibold text-ensena-ink">Bio</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={4}
              className="mt-2 w-full rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink"
            />
            <span className="mt-1 block text-right text-[11px] text-ensena-muted">{bio.length}/{MAX_BIO}</span>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "subjects" ? null : "subjects"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><BookOpen className="size-4 text-ensena-primary" /> Subjects</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "subjects" && "rotate-180")} />
            </button>
            {expandedField === "subjects" ? (
              <div className="mt-3">
                <SubjectsEditor academicLevels={academicLevels} levelExpertise={levelExpertise} onChange={setLevelExpertise} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {flatSubjects.length > 0 ? flatSubjects.map((v) => (
                  <span key={v} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{v}</span>
                )) : <span className="text-xs text-ensena-muted">No subjects added yet</span>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "levels" ? null : "levels"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><GraduationCap className="size-4 text-ensena-primary" /> Academic Levels</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "levels" && "rotate-180")} />
            </button>
            {expandedField === "levels" ? (
              <div className="mt-3">
                <LevelToggleChips selected={academicLevels} onToggle={toggleAcademicLevel} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {academicLevels.length > 0 ? academicLevels.map((v) => (
                  <span key={v} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{v}</span>
                )) : <span className="text-xs text-ensena-muted">No academic levels added yet</span>}
              </div>
            )}
          </div>

          {(showsUndergraduateStructure(academicLevels) || showsGraduateStructure(academicLevels)) && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <button type="button" onClick={() => setExpandedField((v) => (v === "specialization" ? null : "specialization"))} className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><GraduationCap className="size-4 text-ensena-primary" /> Academic Specialization</span>
                <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "specialization" && "rotate-180")} />
              </button>
              {expandedField === "specialization" ? (
                <div className="mt-3">
                  <AcademicSpecializationEditor academicLevels={academicLevels} value={academicSpecialization} onChange={setAcademicSpecialization} />
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {academicSpecializationLabels(academicSpecialization).length > 0 ? academicSpecializationLabels(academicSpecialization).map((v) => (
                    <span key={v} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{v}</span>
                  )) : <span className="text-xs text-ensena-muted">No specialization added yet</span>}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "exam" ? null : "exam"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><Award className="size-4 text-ensena-primary" /> Exam Expertise</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "exam" && "rotate-180")} />
            </button>
            {expandedField === "exam" ? (
              <div className="mt-3">
                <SearchableTagField values={examExpertise} suggestions={examOptions} placeholder="Search exams or add your own" onChange={setExamExpertise} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {examExpertise.length > 0 ? examExpertise.map((v) => (
                  <span key={v} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{v}</span>
                )) : <span className="text-xs text-ensena-muted">No exam expertise added yet</span>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "services" ? null : "services"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><Lightbulb className="size-4 text-ensena-primary" /> Services I Offer</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "services" && "rotate-180")} />
            </button>
            {expandedField === "services" ? (
              <div className="mt-3">
                <ServicesEditor selected={supportTypes} onToggle={toggleSupportType} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {supportTypes.length > 0 ? supportTypeLabelsFor(supportTypes).map((label) => (
                  <span key={label} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{label}</span>
                )) : <span className="text-xs text-ensena-muted">No services added yet</span>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "languages" ? null : "languages"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><LanguagesIcon className="size-4 text-ensena-primary" /> Languages</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "languages" && "rotate-180")} />
            </button>
            {expandedField === "languages" ? (
              <div className="mt-3">
                <SearchableTagField values={languages} suggestions={LANGUAGE_SUGGESTIONS} placeholder="Search languages or add your own" onChange={setLanguages} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {languages.length > 0 ? languages.map((v) => (
                  <span key={v} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">{v}</span>
                )) : <span className="text-xs text-ensena-muted">No languages added yet</span>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "experience" ? null : "experience"))} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ensena-ink"><Calendar className="size-4 text-ensena-primary" /> Teaching Experience</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "experience" && "rotate-180")} />
            </button>
            {expandedField === "experience" ? (
              <div className="mt-3 flex items-center gap-2">
                <input type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value)))} className="h-10 w-24 rounded-lg border border-ensena-border px-3 text-sm" />
                <span className="flex h-10 flex-1 items-center rounded-lg border border-ensena-border px-3 text-sm text-ensena-muted">Years</span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ensena-muted">{experienceYears} Years</p>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setExpandedField((v) => (v === "pricing" ? null : "pricing"))} className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ensena-ink">Pricing</span>
              <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", expandedField === "pricing" && "rotate-180")} />
            </button>
            {expandedField === "pricing" ? (
              <div className="mt-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Hourly Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 items-center rounded-lg border border-ensena-border px-3 text-sm text-ensena-muted">₦</span>
                    <input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))} className="h-10 flex-1 rounded-lg border border-ensena-border px-3 text-sm" />
                  </div>
                </label>
                <div className="mt-3 flex gap-2">
                  {([30, 45, 60] as const).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setHourlyDuration(mins)}
                      className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", hourlyDuration === mins ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ensena-muted">{formatNaira(hourlyRate)} / {hourlyDuration} min</p>
            )}
          </div>

          <div className={cn("rounded-2xl p-4", discoveryEnabled ? "bg-rose-50" : "border border-ensena-border bg-ensena-surface")}>
            <button type="button" onClick={() => setExpandedField((v) => (v === "discovery" ? null : "discovery"))} className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-white text-ensena-primary"><Compass className="size-4.5" /></span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-ensena-ink">Discovery Session</p>
                  <p className="text-xs text-ensena-muted">{discoveryEnabled ? `${discoveryDuration} min · ${discoveryPrice > 0 ? formatNaira(discoveryPrice) : "Free"}` : "Not offered"}</p>
                </div>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-ensena-muted transition-transform", expandedField === "discovery" && "rotate-180")} />
            </button>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-ensena-border/60 pt-3">
              <span className="text-sm font-medium text-ensena-ink">Offer Discovery Session</span>
              <button
                type="button"
                role="switch"
                aria-checked={discoveryEnabled}
                onClick={() => setDiscoveryEnabled((v) => !v)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", discoveryEnabled ? "bg-ensena-primary" : "bg-ensena-border")}
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", discoveryEnabled ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </div>
            {expandedField === "discovery" && discoveryEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-ensena-muted">Session Duration</span>
                  <div className="mt-1.5 flex gap-2">
                    {([15, 30] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDiscoveryDuration(mins)}
                        className={cn("flex-1 rounded-lg border bg-ensena-surface px-2 py-2 text-xs font-medium", discoveryDuration === mins ? "border-ensena-primary text-ensena-primary" : "border-ensena-border text-ensena-ink")}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ensena-muted">Price</span>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-9 items-center rounded-lg border border-ensena-border bg-ensena-surface px-2 text-xs text-ensena-muted">₦</span>
                    <input
                      type="number"
                      min={0}
                      max={MAX_DISCOVERY_PRICE}
                      value={discoveryPrice}
                      onChange={(e) => setDiscoveryPrice(Math.min(MAX_DISCOVERY_PRICE, Math.max(0, Number(e.target.value))))}
                      placeholder="Free"
                      className="h-9 w-full rounded-lg border border-ensena-border bg-ensena-surface px-2 text-xs"
                    />
                  </div>
                </label>
              </div>
            )}
          </div>

          {me.id ? <RealDocumentsSummary me={me} /> : <DocumentsSection documents={documents} onUploadClick={triggerDocumentUpload} />}

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ensena-ink"><Calendar className="size-4.5 text-ensena-primary" /> Availability</h2>
              <Link href="/tutor-dashboard/profile?tab=Availability" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary">Edit</Link>
            </div>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between"><span className="text-ensena-muted">Regular teaching hours</span><span className="font-medium text-ensena-ink">{availabilitySummary}</span></div>
              <div className="flex items-center justify-between"><span className="text-ensena-muted">Blocked time</span><span className="font-medium text-ensena-ink">{blockedCount > 0 ? `${blockedCount} upcoming` : "None"}</span></div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-ensena-ink">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ensena-success" /> Your availability controls private bookings and discovery sessions.
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-70">
            <Save className="size-4" /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
