import { researchAreaById } from "@/lib/academic-taxonomy-data";
import type { AcademicVerificationStatus, TutorListing } from "@/lib/tutors";

// --- Eligibility gate (STRICT — section 15 of the academic browsing spec) ---
// Educational level alone is never sufficient; a tutor must also carry a
// "Verified" status for the level they're being matched against. This
// mirrors the rule table: Masters tutoring requires Master's/PhD (completed
// or in progress) AND admin verification; PhD tutoring requires PhD
// (completed or in progress) AND admin verification.

function isVerified(status: AcademicVerificationStatus | undefined): boolean {
  return status === "Verified";
}

export function isEligibleForMasters(tutor: TutorListing): boolean {
  const q = tutor.qualification;
  if (!q) return false;
  const qualifies = q.highestQualification === "Master's" || q.highestQualification === "PhD";
  return qualifies && isVerified(tutor.mastersVerification);
}

export function isEligibleForPhD(tutor: TutorListing): boolean {
  const q = tutor.qualification;
  if (!q) return false;
  const qualifies = q.highestQualification === "PhD";
  return qualifies && isVerified(tutor.phdVerification);
}

// --- Browse selection shapes ---

export interface UndergraduateSelection {
  academicLevel: "Undergraduate";
  facultyId?: string;
  departmentId?: string;
  level?: string; // "300 Level" etc.
  courseId?: string;
}

// A student can pick multiple services ("Research Methodology + Data
// Analysis"), a field from the fixed list or their own free-text ("Other"),
// and free-text department/research-area — see the "Find a Research Expert"
// single-page form. Department/research-area/preferred-expert are optional
// and never gate results; they only refine ranking.
export type PreferredExpertLevel = "no-preference" | "masters-student" | "masters-holder" | "phd-student" | "phd-holder";

export interface GraduateSelection {
  academicLevel: "Masters" | "PhD";
  serviceIds: string[];
  fieldId?: string;
  customField?: string;
  department?: string;
  researchAreaText?: string;
  preferredExpert?: PreferredExpertLevel;
}

export type BrowseSelection = UndergraduateSelection | GraduateSelection;

export interface RankedTutor {
  tutor: TutorListing;
  score: number;
  isBestMatch: boolean;
}

// Relevance order per spec section 13:
// 1. Exact subject/course/research area match, 2. Academic level, 3. Department,
// 4. Faculty/field, 5. Tutor expertise (service), 6. Availability, 7. Rating, 8. Discovery availability.
// Weights are ordered so an earlier signal always outweighs any combination of later ones.
const WEIGHT_EXACT = 1000;
const WEIGHT_LEVEL = 400;
const WEIGHT_DEPARTMENT = 150;
const WEIGHT_FACULTY_FIELD = 60;
const WEIGHT_AVAILABILITY = 6;
const WEIGHT_RATING = 3; // multiplied by rating (0-5)
const WEIGHT_DISCOVERY = 1;

function scoreUndergraduate(tutor: TutorListing, sel: UndergraduateSelection): number {
  const spec = tutor.academicSpecialization;
  if (!spec) return -1; // not part of the academic marketplace at all
  let score = 0;

  if (sel.courseId && spec.courseIds?.includes(sel.courseId)) score += WEIGHT_EXACT;
  if (sel.level && spec.undergradLevels?.includes(sel.level)) score += WEIGHT_LEVEL;
  if (sel.departmentId && spec.departmentIds?.includes(sel.departmentId)) score += WEIGHT_DEPARTMENT;
  if (sel.facultyId && spec.facultyIds?.includes(sel.facultyId)) score += WEIGHT_FACULTY_FIELD;

  // A tutor with zero overlap on anything the student picked isn't relevant,
  // even if they teach *some* undergraduate subject.
  const hasAnySignal =
    (sel.courseId && spec.courseIds?.includes(sel.courseId)) ||
    (sel.departmentId && spec.departmentIds?.includes(sel.departmentId)) ||
    (sel.facultyId && spec.facultyIds?.includes(sel.facultyId)) ||
    (!sel.courseId && !sel.departmentId && !sel.facultyId);
  if (!hasAnySignal) return -1;

  score += tutor.availableToday ? WEIGHT_AVAILABILITY : 0;
  score += tutor.rating * WEIGHT_RATING;
  score += WEIGHT_DISCOVERY; // discovery sessions are available platform-wide today
  return score;
}

// Masters/PhD priority order (refined per product direction): Service match
// → Field → Department → Research area → Preferred expert level → Rating →
// Availability. Weights are scaled so each tier strictly outranks every
// combination of the tiers below it.
const GRAD_WEIGHT_SERVICE = 10000;
const GRAD_WEIGHT_SERVICE_EXTRA = 50; // small bonus per additional overlapping service
const GRAD_WEIGHT_FIELD = 2000;
const GRAD_WEIGHT_DEPARTMENT = 400;
const GRAD_WEIGHT_RESEARCH_AREA = 80;
const GRAD_WEIGHT_PREFERRED_EXPERT = 20;
const GRAD_WEIGHT_RATING = 3; // multiplied by rating (0-5), max 15
const GRAD_WEIGHT_AVAILABILITY = 1;

function matchesPreferredExpert(tutor: TutorListing, pref: PreferredExpertLevel | undefined): boolean {
  if (!pref || pref === "no-preference") return false;
  const q = tutor.qualification;
  if (!q) return false;
  const inProgress = q.status === "Currently In Progress";
  if (pref === "masters-student") return q.highestQualification === "Master's" && inProgress;
  if (pref === "masters-holder") return q.highestQualification === "Master's" && !inProgress;
  if (pref === "phd-student") return q.highestQualification === "PhD" && inProgress;
  if (pref === "phd-holder") return q.highestQualification === "PhD" && !inProgress;
  return false;
}

function scoreGraduate(tutor: TutorListing, sel: GraduateSelection): number {
  const eligible = sel.academicLevel === "Masters" ? isEligibleForMasters(tutor) : isEligibleForPhD(tutor);
  if (!eligible) return -1; // hard gate — expertise/preference can never compensate for missing eligibility

  const spec = tutor.academicSpecialization;
  const q = tutor.qualification;
  if (!spec || !q) return -1;
  let score = 0;

  const matchingServiceCount = sel.serviceIds.filter((id) => spec.serviceIds?.includes(id)).length;
  const hasServiceMatch = matchingServiceCount > 0;
  if (hasServiceMatch) score += GRAD_WEIGHT_SERVICE + (matchingServiceCount - 1) * GRAD_WEIGHT_SERVICE_EXTRA;

  const hasFieldMatch = sel.fieldId
    ? !!spec.fieldIds?.includes(sel.fieldId)
    : !!(sel.customField && q.fieldOfStudy.toLowerCase().includes(sel.customField.toLowerCase()));
  if (hasFieldMatch) score += GRAD_WEIGHT_FIELD;

  const departmentQuery = sel.department?.trim().toLowerCase();
  const hasDepartmentMatch = !!(departmentQuery && q.department?.toLowerCase().includes(departmentQuery));
  if (hasDepartmentMatch) score += GRAD_WEIGHT_DEPARTMENT;

  const researchQuery = sel.researchAreaText?.trim().toLowerCase();
  const tutorResearchLabels = [q.researchArea, ...(spec.researchAreaIds ?? []).map((id) => researchAreaById(id)?.label)].filter(
    (v): v is string => !!v
  );
  const hasResearchAreaMatch = !!(researchQuery && tutorResearchLabels.some((label) => label.toLowerCase().includes(researchQuery)));
  if (hasResearchAreaMatch) score += GRAD_WEIGHT_RESEARCH_AREA;

  if (matchesPreferredExpert(tutor, sel.preferredExpert)) score += GRAD_WEIGHT_PREFERRED_EXPERT;

  // Service and field are the two required inputs on the form — a tutor with
  // no overlap on either isn't a relevant result, even if eligible.
  if (!hasServiceMatch && !hasFieldMatch) return -1;

  score += tutor.availableToday ? GRAD_WEIGHT_AVAILABILITY : 0;
  score += tutor.rating * GRAD_WEIGHT_RATING;
  return score;
}

// --- Shared qualification/verification display copy (used on the public
// tutor profile and the browse-results cards, per spec section 15's
// "Tutor Profile Display" examples) ---

export function qualificationLine(tutor: TutorListing): string | null {
  const q = tutor.qualification;
  if (!q) return null;
  const inProgress = q.status === "Currently In Progress";
  if (q.highestQualification === "PhD") {
    return inProgress ? `PhD Candidate, ${q.fieldOfStudy}` : `PhD ${q.fieldOfStudy}`;
  }
  if (q.highestQualification === "Master's") {
    return inProgress ? `MSc Candidate, ${q.fieldOfStudy}` : `MSc ${q.fieldOfStudy}`;
  }
  return `${q.highestQualification}, ${q.fieldOfStudy}`;
}

export function verificationBadgeLabel(tutor: TutorListing, forLevel: "Masters" | "PhD"): string | null {
  const status = forLevel === "PhD" ? tutor.phdVerification : tutor.mastersVerification;
  if (status !== "Verified") return null;
  const inProgress = tutor.qualification?.status === "Currently In Progress";
  if (forLevel === "PhD") return inProgress ? "PhD Enrollment Verified" : "PhD Verified";
  return inProgress ? "Master's Enrollment Verified" : "Master's Degree Verified";
}

export function rankTutorsForBrowse(tutors: TutorListing[], selection: BrowseSelection): RankedTutor[] {
  const scored = tutors
    .map((tutor) => ({
      tutor,
      score: selection.academicLevel === "Undergraduate" ? scoreUndergraduate(tutor, selection) : scoreGraduate(tutor, selection),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  // "Best Match" is only shown when the top result actually matched on a
  // concrete signal (never just "first in an unranked list") — see spec
  // section 13: don't claim a match unless one was genuinely computed.
  const topHasSignal = scored.length > 0 && scored[0].score >= WEIGHT_FACULTY_FIELD;

  return scored.map((entry, i) => ({
    ...entry,
    isBestMatch: i === 0 && topHasSignal,
  }));
}
