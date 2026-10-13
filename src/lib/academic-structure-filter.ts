// Shared cascading Faculty → Department → Course (Undergraduate) and Field
// of Study → Research Area (Masters/PhD) filter logic — used by both the
// desktop Find Tutor sidebar and the mobile filter sheet so there is one
// real implementation, not two copies that could drift.
//
// Deliberately reuses the EXISTING academic-taxonomy-data.ts structures
// (the same ones already powering the Undergraduate/Masters/PhD "browse"
// flow at /search) rather than inventing a new competing taxonomy or a
// fourth "Programme" tier that doesn't exist in the real data model —
// Department already IS the programme-equivalent for this platform's
// existing structure (see academic-taxonomy-data.ts's own doc comment).
// Masters/PhD keep their own existing Field/Research Area taxonomy rather
// than being forced into the Undergraduate-specific Faculty/Department
// shape, since those are two genuinely different, already-real structures.
import {
  departmentsForFaculty,
  coursesForDepartment,
  researchAreasForField,
  facultyById,
  departmentById,
  courseById,
  fieldById,
  researchAreaById,
  type Course,
  type Department,
  type ResearchArea,
} from "@/lib/academic-taxonomy-data";

export interface AcademicStructureFilters {
  facultyIds: string[];
  departmentIds: string[];
  courseIds: string[];
  fieldIds: string[];
  researchAreaIds: string[];
}

export const defaultAcademicStructureFilters: AcademicStructureFilters = {
  facultyIds: [],
  departmentIds: [],
  courseIds: [],
  fieldIds: [],
  researchAreaIds: [],
};

export function isAcademicStructureEmpty(f: AcademicStructureFilters): boolean {
  return (
    f.facultyIds.length === 0 &&
    f.departmentIds.length === 0 &&
    f.courseIds.length === 0 &&
    f.fieldIds.length === 0 &&
    f.researchAreaIds.length === 0
  );
}

// Hidden until a Faculty is picked — "keep optional fields collapsed until
// relevant" rather than showing every department across every faculty.
export function departmentOptionsFor(facultyIds: string[]): Department[] {
  if (facultyIds.length === 0) return [];
  return facultyIds.flatMap((id) => departmentsForFaculty(id));
}

export function courseOptionsFor(departmentIds: string[]): Course[] {
  if (departmentIds.length === 0) return [];
  return departmentIds.flatMap((id) => coursesForDepartment(id));
}

export function researchAreaOptionsFor(fieldIds: string[]): ResearchArea[] {
  if (fieldIds.length === 0) return [];
  return fieldIds.flatMap((id) => researchAreasForField(id));
}

// Prunes any selection that no longer belongs under its (possibly just
// changed) parent — call this right after toggling facultyIds/departmentIds/
// fieldIds so a stale Department/Course/Research Area selection can never
// linger once its parent is deselected or changed ("do not allow impossible
// combinations").
export function sanitizeAcademicStructure<T extends AcademicStructureFilters>(f: T): T {
  const validDepartmentIds = new Set(departmentOptionsFor(f.facultyIds).map((d) => d.id));
  const departmentIds = f.departmentIds.filter((id) => validDepartmentIds.has(id));
  const validCourseIds = new Set(courseOptionsFor(departmentIds).map((c) => c.id));
  const courseIds = f.courseIds.filter((id) => validCourseIds.has(id));
  const validResearchAreaIds = new Set(researchAreaOptionsFor(f.fieldIds).map((a) => a.id));
  const researchAreaIds = f.researchAreaIds.filter((id) => validResearchAreaIds.has(id));
  return { ...f, departmentIds, courseIds, researchAreaIds };
}

// Which structure to reveal given the academic Level checkboxes currently
// selected — both can show at once (e.g. Secondary + Undergraduate both
// checked), and neither shows when no higher-education level is selected,
// leaving the plain Subject search as the only academic filter (exactly
// today's behavior for Nursery/Primary/Secondary/Exams/Language).
export function showsUndergraduateStructure(levels: string[]): boolean {
  return levels.includes("Undergraduate");
}

export function showsGraduateStructure(levels: string[]): boolean {
  return levels.includes("Masters") || levels.includes("PhD");
}

// Flat, human-readable labels for a specialization — the one place every
// consumer (the tutor's own dashboard editor, the desktop public profile,
// the mobile public profile) turns stored ids back into display text, so
// none of them re-derive the same id → label lookups independently. Accepts
// the looser TutorListing.academicSpecialization shape too (every array
// there is optional — the 8 hand-authored academic specialists don't all
// set every field), not just the dashboard editor's always-present arrays.
export function academicSpecializationLabels(spec: {
  facultyIds?: string[];
  departmentIds?: string[];
  courseIds?: string[];
  fieldIds?: string[];
  researchAreaIds?: string[];
}): string[] {
  return [
    ...(spec.facultyIds ?? []).map((id) => facultyById(id)?.label),
    ...(spec.departmentIds ?? []).map((id) => departmentById(id)?.label),
    ...(spec.courseIds ?? []).map((id) => courseById(id)?.label),
    ...(spec.fieldIds ?? []).map((id) => fieldById(id)?.label),
    ...(spec.researchAreaIds ?? []).map((id) => researchAreaById(id)?.label),
  ].filter((label): label is string => Boolean(label));
}
