// The academic support taxonomy for the general Find Tutor marketplace —
// "what kind of help does this tutor offer", not just "what subject do they
// teach". Deliberately a separate, marketplace-wide concept from
// AcademicSpecialization.serviceIds (tutors.ts) — that svc-* taxonomy is
// scoped specifically to the Masters/PhD Research Expert browsing flow
// (research-expert-flow.tsx / search-client.tsx) and keeps its own distinct
// service labels (Data Analysis, Statistical Analysis, etc.). This one
// applies to every tutor in the marketplace regardless of academic level,
// and is the one Find Tutor's filters and public profiles read.
//
// Stable `id`s are what gets stored/compared everywhere (TutorListing.
// supportTypes, TutorPublicProfileData.supportTypes, the filter state) —
// `label` is display-only and can be reworded without touching stored data.
export interface SupportTypeOption {
  id: string;
  label: string;
}

export const supportTypeOptions: SupportTypeOption[] = [
  { id: "tutoring", label: "Tutoring" },
  { id: "assignment-support", label: "Assignment Support" },
  { id: "project-support", label: "Project Support" },
  { id: "presentation-support", label: "Presentation Support" },
  { id: "research-support", label: "Research Support" },
  { id: "academic-writing", label: "Academic Writing" },
  { id: "thesis-dissertation-support", label: "Thesis & Dissertation Support" },
  { id: "citation-referencing", label: "Citation & Referencing" },
  { id: "journal-publication-support", label: "Journal & Publication Support" },
];

export type SupportTypeId = (typeof supportTypeOptions)[number]["id"];

const labelById: Record<string, string> = Object.fromEntries(
  supportTypeOptions.map((o) => [o.id, o.label])
);

export function supportTypeLabel(id: string): string {
  return labelById[id] ?? id;
}

export function supportTypeLabelsFor(ids: string[]): string[] {
  return ids.map(supportTypeLabel);
}
