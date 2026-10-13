// Reads a tutor's sign-up answers (tutor_profiles.application_data — the
// whole tutor sign-up wizard) into named fields. Pure and server-safe, so
// both the tutor dashboard (tutor-identity.tsx) and the admin pages use the
// same interpretation of what a tutor registered.

export type TutorApplicationStatus = "pending" | "approved" | "rejected" | "resubmission_required";
export type TutorDocType = "government_id" | "academic_certificate" | "teaching_qualification" | "other";

export const tutorDocumentTypes: { type: TutorDocType; label: string; description: string; required: boolean }[] = [
  { type: "government_id", label: "Government ID", description: "National ID (NIN), international passport, driver's licence or voter's card.", required: true },
  { type: "academic_certificate", label: "Academic Certificate", description: "Your highest qualification (degree, diploma or school certificate).", required: true },
  { type: "teaching_qualification", label: "Teaching Qualification", description: "e.g. TRCN, PGDE, NCE or another teaching certificate — if you have one.", required: false },
  { type: "other", label: "Other Document", description: "Anything else that supports your application (optional).", required: false },
];

export const tutorStatusLabels: Record<TutorApplicationStatus, string> = {
  pending: "Needs Verification",
  approved: "Verified",
  rejected: "Rejected",
  resubmission_required: "Resubmission Required",
};

export function normalizeTutorStatus(value: unknown): TutorApplicationStatus {
  return value === "approved" || value === "rejected" || value === "resubmission_required" ? value : "pending";
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export interface LevelExpertiseEntry {
  level: string;
  items: string[];
  exams: string[];
}

export interface TutorApplicationFields {
  headline: string;
  bio: string;
  nationality: string;
  country: string;
  stateCity: string;
  levels: string[];
  levelExpertise: LevelExpertiseEntry[];
  subjects: string[];
  exams: string[];
  teachingFormats: string[];
  yearsExperience: string;
  languages: string[];
  teachingStyles: string[];
  oneOnOnePrice: string;
  groupPrice: string;
  maxGroupStudents: string;
  discoverySession: boolean;
  trialPrice: string;
  classDurations: string[];
  teachingModes: string[];
  sessionTypes: string[];
  bookingPreferences: string[];
  cancellationPolicy: string;
  availability: { day: string; ranges: string[] }[];
  highestQualification: string;
  academicStatus: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear: string;
  linkedin: string;
  website: string;
}

export function parseTutorApplication(app: Record<string, unknown> | null | undefined): TutorApplicationFields {
  const a = app ?? {};
  const rawExpertise = Array.isArray(a.levelExpertise) ? (a.levelExpertise as Record<string, unknown>[]) : [];
  const levelExpertise = rawExpertise.map((e) => ({ level: str(e.level), items: strList(e.items), exams: strList(e.exams) }));
  const availabilityObj = a.availability && typeof a.availability === "object" ? (a.availability as Record<string, { enabled?: boolean; ranges?: { start?: string; end?: string }[] }>) : {};
  return {
    headline: str(a.headline),
    bio: str(a.bio),
    nationality: str(a.nationality),
    country: str(a.country),
    stateCity: str(a.stateCity),
    levels: strList(a.levels),
    levelExpertise,
    subjects: [...new Set(levelExpertise.flatMap((e) => e.items))],
    exams: [...new Set(levelExpertise.flatMap((e) => e.exams))],
    teachingFormats: strList(a.teachingFormats),
    yearsExperience: str(a.yearsExperience),
    languages: strList(a.languagesSpoken),
    teachingStyles: strList(a.teachingStyles),
    oneOnOnePrice: str(a.oneOnOnePrice),
    groupPrice: str(a.groupPrice),
    maxGroupStudents: str(a.maxGroupStudents),
    discoverySession: a.trialLessonEnabled === true,
    trialPrice: str(a.trialPrice),
    classDurations: strList(a.classDurations),
    teachingModes: strList(a.teachingModes),
    sessionTypes: strList(a.sessionTypes),
    bookingPreferences: strList(a.bookingPreferences),
    cancellationPolicy: str(a.cancellationPolicy),
    availability: Object.entries(availabilityObj)
      .filter(([, d]) => d?.enabled)
      .map(([day, d]) => ({ day, ranges: (d.ranges ?? []).map((r) => `${r.start ?? ""}–${r.end ?? ""}`) })),
    highestQualification: str(a.highestQualification),
    academicStatus: str(a.academicStatus),
    institution: str(a.gradInstitution),
    fieldOfStudy: str(a.gradFieldOfStudy),
    graduationYear: str(a.graduationYear),
    linkedin: str(a.linkedin),
    website: str(a.website),
  };
}
