// Admin -> Platform Management. Covers the slice of Ensena's taxonomy that
// has no admin home yet: K-12 Subjects, K-12 Academic Levels, and Group
// Class Categories. Deliberately does NOT re-model Faculties/Departments/
// Courses/Exams — those already have a real, working admin surface at
// /admin/academic-programs (academic-taxonomy-data.ts / exams-data.ts) and
// Platform Management's own "Exams" tab reads that same live array rather
// than duplicating it, so the two surfaces can never drift apart.
//
// Usage counts are computed from the real tutor/booking/group-class
// datasets, never fabricated — an entity with 0 usage is shown as 0.
import { tutorListings } from "@/lib/tutors";
import { initialBookings } from "@/lib/admin-bookings-data";
import { initialAdminStudents } from "@/lib/admin-data";
import { groupClassListings } from "@/lib/group-classes-data";

export type PlatformEntityStatus = "Active" | "Inactive";

export interface ManagedSubject {
  id: string;
  name: string;
  status: PlatformEntityStatus;
}

export interface ManagedAcademicLevel {
  id: string;
  name: string;
  status: PlatformEntityStatus;
}

export interface ManagedGroupClassCategory {
  id: string;
  name: string;
  description: string;
  status: PlatformEntityStatus;
  // Keywords used only to compute a real, if approximate, usage count from
  // existing group class titles — same "heuristic mapping" idiom already
  // used by exams-data.ts's relatedLevelTags/relatedSubjects.
  matchKeywords: string[];
}

export const initialSubjects: ManagedSubject[] = [
  { id: "subj-mathematics", name: "Mathematics", status: "Active" },
  { id: "subj-english", name: "English Language", status: "Active" },
  { id: "subj-physics", name: "Physics", status: "Active" },
  { id: "subj-chemistry", name: "Chemistry", status: "Active" },
  { id: "subj-biology", name: "Biology", status: "Active" },
  { id: "subj-economics", name: "Economics", status: "Active" },
  { id: "subj-french", name: "French", status: "Active" },
  { id: "subj-further-mathematics", name: "Further Mathematics", status: "Active" },
  { id: "subj-government", name: "Government", status: "Active" },
  { id: "subj-literature", name: "Literature in English", status: "Active" },
  { id: "subj-geography", name: "Geography", status: "Active" },
  { id: "subj-accounting", name: "Accounting", status: "Active" },
];

// The University/Masters/PhD levels (100 Level … PhD) already live under
// Academic Programs (undergraduateLevels) — this list is only the K-12
// slice, which had no admin-manageable home before now.
export const initialAcademicLevels: ManagedAcademicLevel[] = [
  { id: "lvl-nursery", name: "Nursery", status: "Active" },
  { id: "lvl-primary", name: "Primary", status: "Active" },
  { id: "lvl-jss1", name: "JSS1", status: "Active" },
  { id: "lvl-jss2", name: "JSS2", status: "Active" },
  { id: "lvl-jss3", name: "JSS3", status: "Active" },
  { id: "lvl-sss1", name: "SSS1", status: "Active" },
  { id: "lvl-sss2", name: "SSS2", status: "Active" },
  { id: "lvl-sss3", name: "SSS3", status: "Active" },
];

export const initialGroupClassCategories: ManagedGroupClassCategory[] = [
  { id: "cat-waec-prep", name: "WAEC Preparation", description: "Classes built around the WAEC/NECO syllabus.", status: "Active", matchKeywords: ["waec", "neco"] },
  { id: "cat-jamb-prep", name: "JAMB Preparation", description: "Classes focused on JAMB/UTME past questions and speed.", status: "Active", matchKeywords: ["jamb", "utme"] },
  { id: "cat-subject-mastery", name: "Subject Mastery", description: "Deep, ongoing classes for a single subject.", status: "Active", matchKeywords: ["excellence", "mastery", "pro", "club"] },
  { id: "cat-study-skills", name: "Study Skills", description: "Study habits, exam technique and general academic support.", status: "Active", matchKeywords: ["study skills", "revision technique"] },
  { id: "cat-exam-revision", name: "Exam Revision", description: "Short, intensive revision classes ahead of an exam.", status: "Active", matchKeywords: ["revision", "crash", "masterclass", "success"] },
];

export function subjectUsageCount(name: string): number {
  const tutorCount = tutorListings.filter((t) => t.subject === name).length;
  const bookingCount = initialBookings.filter((b) => b.subject === name).length;
  return tutorCount + bookingCount;
}

export function academicLevelUsageCount(name: string): number {
  const studentCount = initialAdminStudents.filter((s) => s.level.includes(name)).length;
  const bookingCount = initialBookings.filter((b) => b.academicLevel.includes(name)).length;
  return studentCount + bookingCount;
}

export function groupClassCategoryUsageCount(category: ManagedGroupClassCategory): number {
  return groupClassListings.filter((gc) => category.matchKeywords.some((kw) => gc.title.toLowerCase().includes(kw))).length;
}
