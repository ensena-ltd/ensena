// Real, persisted storage for the tutor's own Public Profile editor
// (Profile > Public Profile — my-profile-client.tsx). Same
// makeCachedReader/writeJson+CustomEvent idiom as payout-store.ts, so both
// the desktop and mobile layouts of that page (which already share one
// component instance) read and write the exact same record, and the
// tutor's own public find-teachers/[slug] page can overlay the live values
// on top of the static seed TutorListing for the fields that map cleanly
// (see the useLiveTutorOverride hook in tutor-profile-client.tsx).
import { defaultAcademicStructureFilters, type AcademicStructureFilters } from "@/lib/academic-structure-filter";
import { defaultTutorDocuments, tutorPublicProfile, type TutorDocument } from "@/lib/tutor-dashboard-data";
import type { LevelExpertise } from "@/lib/tutor-signup-data";
import type { SupportTypeId } from "@/lib/academic-support-types";

export interface TutorPublicProfileData {
  headline: string;
  bio: string;
  // Which of the 8 onboarding academic levels (Nursery…PhD, from
  // src/lib/data.ts's academicLevels) this tutor teaches — same taxonomy
  // used at sign-up, not the older/looser profileAcademicLevelOptions list.
  academicLevels: string[];
  // Per-level subjects/expertise, exactly the shape tutor sign-up already
  // uses (LEVEL_EXPERTISE_CONFIG + SearchableTagField) — never flattened
  // into one generic subject list, so "Secondary: Mathematics" and
  // "Undergraduate: Calculus" stay distinct.
  levelExpertise: LevelExpertise[];
  examExpertise: string[];
  // What kind of help this tutor offers — Tutoring, Assignment Support,
  // Research Support, etc. (see academic-support-types.ts). Read by both
  // the tutor's own public profile overlay (useLiveTutorOverride) and, via
  // the same TutorListing.supportTypes field once set there, the Find
  // Tutor marketplace filters.
  supportTypes: SupportTypeId[];
  // Undergraduate Faculty/Department/Course and Masters/PhD Field/Research
  // Area this tutor specializes in — same shape the Find Tutor cascading
  // filters read (see academic-structure-filter.ts) and the same shape
  // TutorListing.academicSpecialization already uses, so this overlays
  // directly onto it in useLiveTutorOverride with no reshaping.
  academicSpecialization: AcademicStructureFilters;
  languages: string[];
  teachingExperienceYears: number;
  hourlyRate: number;
  hourlyDurationMins: 30 | 45 | 60;
  discoveryEnabled: boolean;
  discoveryDurationMins: 15 | 30;
  discoveryPrice: number;
  // Data URL so an uploaded photo actually survives a refresh (there's no
  // real file backend) — null means "use the seed dashboardTutor.image".
  photoUrl: string | null;
  documents: TutorDocument[];
}

const STORAGE_KEY = "ensena_tutor_public_profile";
export const TUTOR_PUBLIC_PROFILE_EVENT = "ensena:tutor-public-profile-changed";

// Seed migrates the old flat tutorPublicProfile.subjects/academicLevels
// (pre-dating the per-level onboarding model) onto the new shape once,
// keeping the exact same real values rather than inventing new ones —
// all under "Secondary", the level that already best fits them.
const SEED: TutorPublicProfileData = {
  headline: tutorPublicProfile.headline,
  bio: tutorPublicProfile.bio,
  academicLevels: ["Secondary", "Undergraduate"],
  levelExpertise: [
    { level: "Secondary", category: "subject", items: [...tutorPublicProfile.subjects] },
  ],
  examExpertise: [...tutorPublicProfile.examExpertise],
  supportTypes: ["tutoring"],
  academicSpecialization: { ...defaultAcademicStructureFilters },
  languages: [...tutorPublicProfile.languages],
  teachingExperienceYears: tutorPublicProfile.teachingExperienceYears,
  hourlyRate: tutorPublicProfile.hourlyRate,
  hourlyDurationMins: tutorPublicProfile.hourlyDurationMins,
  discoveryEnabled: tutorPublicProfile.discoveryEnabled,
  discoveryDurationMins: tutorPublicProfile.discoveryDurationMins,
  discoveryPrice: tutorPublicProfile.discoveryPrice,
  photoUrl: null,
  documents: defaultTutorDocuments,
};

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readRaw = makeCachedReader<TutorPublicProfileData>(STORAGE_KEY, SEED);

// Throws (QuotaExceededError, most likely from a large photo data URL) so
// callers can surface a real "Couldn't save changes" message instead of
// silently losing the edit.
function writeJson(value: TutorPublicProfileData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(TUTOR_PUBLIC_PROFILE_EVENT));
}

export function getTutorPublicProfile(): TutorPublicProfileData {
  return readRaw();
}

export function saveTutorPublicProfile(patch: Partial<TutorPublicProfileData>): TutorPublicProfileData {
  const next = { ...readRaw(), ...patch };
  writeJson(next);
  return next;
}

export function subscribeTutorPublicProfile(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TUTOR_PUBLIC_PROFILE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(TUTOR_PUBLIC_PROFILE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Union of every level's items — used wherever a single flat subject list
// is still needed (the live preview card, the public profile overlay).
export function flattenLevelExpertise(levelExpertise: LevelExpertise[]): string[] {
  return Array.from(new Set(levelExpertise.flatMap((e) => e.items)));
}
