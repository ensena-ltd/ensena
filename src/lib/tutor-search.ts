import { courseById, departmentById, facultyById } from "@/lib/academic-taxonomy-data";
import type { FiltersState } from "@/components/find-teachers/teacher-filters";
import { canTutorAppearInDiscoveryByName } from "@/lib/account-permissions";
import type { SortOption, TutorListing } from "@/lib/tutors";

// Lets a direct search like "Statistics" or "Data Structures" surface
// Undergraduate/Masters/PhD tutors by their course/department/faculty tags,
// not just their headline subject — see the academic browsing spec's
// "Direct Search" flow.
function matchesSearchQuery(tutor: TutorListing, q: string): boolean {
  if (!q) return true;
  if (tutor.name.toLowerCase().includes(q) || tutor.subject.toLowerCase().includes(q)) return true;
  const spec = tutor.academicSpecialization;
  if (!spec) return false;
  const labels = [
    ...(spec.courseIds ?? []).map((id) => courseById(id)?.label),
    ...(spec.departmentIds ?? []).map((id) => departmentById(id)?.label),
    ...(spec.facultyIds ?? []).map((id) => facultyById(id)?.label),
  ];
  return labels.some((label) => label?.toLowerCase().includes(q));
}

export interface TutorSearchParams {
  query: string;
  level: string;
  filters: FiltersState;
  allLevels: string;
}

export function filterTutors(
  tutors: TutorListing[],
  { query, level, filters, allLevels }: TutorSearchParams
): TutorListing[] {
  const q = query.trim().toLowerCase();

  return tutors.filter((tutor) => {
    // Enforced here, not just hidden with CSS on a card — a suspended or
    // banned tutor never enters the result set search/browse builds from,
    // matching every other consumer of filterTutors automatically.
    if (!canTutorAppearInDiscoveryByName(tutor.name)) return false;
    if (!matchesSearchQuery(tutor, q)) return false;
    if (level !== allLevels && !tutor.levels.includes(level)) return false;
    // A tutor teaching a subject never implies they offer every kind of
    // academic support — only tutors who explicitly declared a selected
    // support type (see academic-support-types.ts) match here.
    if (
      filters.supportTypes.length &&
      !filters.supportTypes.some((type) => tutor.supportTypes.includes(type))
    ) {
      return false;
    }
    if (filters.levels.length && !filters.levels.some((l) => tutor.levels.includes(l))) {
      return false;
    }
    if (filters.subjects.length && !filters.subjects.includes(tutor.subject)) return false;
    // Undergraduate Faculty/Department/Course and Masters/PhD Field/Research
    // Area — read from the tutor's own declared academicSpecialization, same
    // "explicit declaration required" rule as supportTypes: a tutor is never
    // assumed to match a faculty/department/course/field/research area just
    // because they teach a related subject. A tutor with no
    // academicSpecialization at all simply won't match once any of these are
    // selected — expected, not a bug (see the empty-state copy).
    const spec = tutor.academicSpecialization;
    if (filters.facultyIds.length && !filters.facultyIds.some((id) => spec?.facultyIds?.includes(id))) {
      return false;
    }
    if (filters.departmentIds.length && !filters.departmentIds.some((id) => spec?.departmentIds?.includes(id))) {
      return false;
    }
    if (filters.courseIds.length && !filters.courseIds.some((id) => spec?.courseIds?.includes(id))) {
      return false;
    }
    if (filters.fieldIds.length && !filters.fieldIds.some((id) => spec?.fieldIds?.includes(id))) {
      return false;
    }
    if (filters.researchAreaIds.length && !filters.researchAreaIds.some((id) => spec?.researchAreaIds?.includes(id))) {
      return false;
    }
    if (filters.tutorTypes.length && !filters.tutorTypes.includes(tutor.tutorType)) {
      return false;
    }
    if (
      filters.languages.length &&
      !filters.languages.some((lang) => tutor.languages.includes(lang))
    ) {
      return false;
    }
    if (
      filters.availability.length &&
      !filters.availability.some((slot) => tutor.availability.includes(slot))
    ) {
      return false;
    }
    if (tutor.price > filters.maxPrice) return false;
    return true;
  });
}

export function sortTutors(list: TutorListing[], sort: SortOption): TutorListing[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "Price: Low to High":
        return a.price - b.price;
      case "Price: High to Low":
        return b.price - a.price;
      case "Highest Rated":
        return b.rating - a.rating;
      case "Most Experienced":
        return b.yearsExperience - a.yearsExperience;
      default:
        return 0;
    }
  });
}
