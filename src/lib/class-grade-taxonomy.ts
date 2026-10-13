// The precise academic class/grade a Group Class targets — deliberately
// separate from academicLevels (data.ts)'s coarse "Educational Level"
// buckets (Nursery/Primary/Secondary/Exams/Language/Undergraduate/Masters/
// PhD). A student or parent needs to know "this is for SS2", not just
// "this is for Secondary" — see the Group Class creation flow and result
// cards, which show both together (e.g. "Senior Secondary · SS2").
//
// undergraduateLevels is re-exported from academic-taxonomy-data.ts rather
// than duplicated, since that's the existing canonical 100-500 Level list
// used by the Undergraduate browsing flow.
import { undergraduateLevels } from "@/lib/academic-taxonomy-data";

export const primaryClasses = ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"];
export const juniorSecondaryClasses = ["JSS1", "JSS2", "JSS3"];
export const seniorSecondaryClasses = ["SS1", "SS2", "SS3"];
export const secondaryClasses = [...juniorSecondaryClasses, ...seniorSecondaryClasses];

export { undergraduateLevels };

// Every real class/grade option across every educational level, in display
// order — used when a filter needs to offer the full list rather than one
// contextual to a single selected level.
export const allClassGrades = [...primaryClasses, ...secondaryClasses, ...undergraduateLevels];

// Nursery/Exams/Language/Masters/PhD have no natural fine-grained class
// breakdown in this app's data model — an empty result means "don't show a
// Class/Grade selector for this Educational Level" rather than fabricating one.
export function classGradeOptionsFor(academicLevel: string): string[] {
  switch (academicLevel) {
    case "Primary":
      return primaryClasses;
    case "Secondary":
      return secondaryClasses;
    case "Undergraduate":
      return undergraduateLevels;
    default:
      return [];
  }
}
