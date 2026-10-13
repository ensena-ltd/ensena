import {
  BookOpen,
  BookOpenCheck,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  Globe,
  Globe2,
  GraduationCap,
  Languages,
  NotebookPen,
  PencilLine,
  School,
  type LucideIcon,
} from "lucide-react";

// Admin-manageable exam categories for the /exams page and the reusable
// /search results engine — same pattern as academic-taxonomy-data.ts. No
// live database yet, so this is plain data the Admin Dashboard reads and
// mutates in memory; shape is DB-ready (id/active/order) for later.
export interface Exam {
  id: string;
  name: string; // display name, e.g. "JAMB / UTME"
  slug: string; // URL-safe value used in ?exam=<slug>, e.g. "JAMB"
  icon: LucideIcon;
  active: boolean;
  order: number;
  // Heuristic mapping onto the current tutor/group-class dataset, which
  // only tags compound exam levels ("WAEC / NECO", "JAMB / UTME") and plain
  // subjects rather than each exam individually. Matches tutors whose
  // `levels` include one of these, OR whose `subject` is one of these.
  relatedLevelTags: string[];
  relatedSubjects: string[];
}

export const exams: Exam[] = [
  { id: "exam-waec", name: "WAEC", slug: "WAEC", icon: ClipboardCheck, active: true, order: 1, relatedLevelTags: ["WAEC / NECO"], relatedSubjects: [] },
  { id: "exam-neco", name: "NECO", slug: "NECO", icon: FileCheck2, active: true, order: 2, relatedLevelTags: ["WAEC / NECO"], relatedSubjects: [] },
  { id: "exam-gce", name: "GCE", slug: "GCE", icon: BookOpenCheck, active: true, order: 3, relatedLevelTags: ["WAEC / NECO"], relatedSubjects: [] },
  { id: "exam-jamb", name: "JAMB / UTME", slug: "JAMB", icon: PencilLine, active: true, order: 4, relatedLevelTags: ["JAMB / UTME"], relatedSubjects: [] },
  { id: "exam-post-utme", name: "Post-UTME", slug: "Post-UTME", icon: GraduationCap, active: true, order: 5, relatedLevelTags: ["JAMB / UTME"], relatedSubjects: [] },
  { id: "exam-toefl", name: "TOEFL", slug: "TOEFL", icon: Globe, active: true, order: 6, relatedLevelTags: [], relatedSubjects: ["English"] },
  { id: "exam-ielts", name: "IELTS", slug: "IELTS", icon: Languages, active: true, order: 7, relatedLevelTags: [], relatedSubjects: ["English"] },
  { id: "exam-common-entrance", name: "Common Entrance", slug: "Common-Entrance", icon: School, active: true, order: 8, relatedLevelTags: ["Primary"], relatedSubjects: [] },
  { id: "exam-tef", name: "TEF", slug: "TEF", icon: Globe2, active: true, order: 9, relatedLevelTags: [], relatedSubjects: ["French"] },
  { id: "exam-jupeb", name: "JUPEB", slug: "JUPEB", icon: BookOpen, active: true, order: 10, relatedLevelTags: ["JAMB / UTME", "Undergraduate"], relatedSubjects: [] },
  { id: "exam-sat", name: "SAT", slug: "SAT", icon: PencilLine, active: true, order: 11, relatedLevelTags: [], relatedSubjects: ["English", "Mathematics"] },
  { id: "exam-gre", name: "GRE", slug: "GRE", icon: NotebookPen, active: true, order: 12, relatedLevelTags: [], relatedSubjects: ["English", "Mathematics"] },
  { id: "exam-gmat", name: "GMAT", slug: "GMAT", icon: Calculator, active: true, order: 13, relatedLevelTags: [], relatedSubjects: ["Mathematics", "Economics"] },
];

// The homepage's compact "Exam Preparation" discovery section only surfaces
// the 8 exams the product spec names explicitly, out of the full
// admin-manageable catalog above (which also powers the dedicated /exams
// page and stays untouched).
export const homepageExamSlugs = ["WAEC", "NECO", "JAMB", "IELTS", "TOEFL", "SAT", "GRE", "GMAT"];

export function homepageExams(): Exam[] {
  return homepageExamSlugs
    .map((slug) => examBySlug(slug))
    .filter((e): e is Exam => Boolean(e));
}

export function activeExams(): Exam[] {
  return exams.filter((e) => e.active).sort((a, b) => a.order - b.order);
}

export function examBySlug(slug: string): Exam | undefined {
  return exams.find((e) => e.slug.toLowerCase() === slug.toLowerCase());
}
