// Drives the "Subjects / expertise" field on the tutor sign-up wizard's
// Teaching Profile step — one entry per selectable academic level, so the
// field's label/placeholder/suggestions change with the level instead of
// funnelling every level into one generic subject list. Suggestions are
// starting points only; the field itself always allows a free-text custom
// entry (see searchable-tag-field.tsx) — this list is never a restriction.
import { academicSubjectOptions, languageSubjectOptions } from "@/lib/tutors";
import type { ExpertiseCategory } from "@/lib/tutor-signup-data";

export interface LevelExpertiseFieldConfig {
  category: ExpertiseCategory;
  label: string;
  placeholder: string;
  suggestions: string[];
}

export const examOptions = ["WAEC", "NECO", "JAMB / UTME", "IELTS", "TOEFL", "SAT", "GRE", "GMAT", "Other"];

export const LEVEL_EXPERTISE_CONFIG: Record<string, LevelExpertiseFieldConfig> = {
  Nursery: {
    category: "subject",
    label: "Subjects / areas you teach",
    placeholder: "Search or add your own",
    suggestions: [
      "Early Literacy",
      "Phonics",
      "Early Numeracy",
      "Reading",
      "Writing",
      "Basic Science",
      "Creative Activities",
      "Early Childhood Development",
    ],
  },
  Primary: {
    category: "subject",
    label: "Subjects you teach",
    placeholder: "Search subjects or add your own",
    suggestions: [
      "Mathematics",
      "English",
      "Basic Science",
      "Social Studies",
      "Civic Education",
      "Computer Studies",
      "French",
      "Creative Arts",
      "Reading",
      "Writing",
    ],
  },
  Secondary: {
    category: "subject",
    label: "Subjects you teach",
    placeholder: "Search subjects or add your own",
    suggestions: [
      ...academicSubjectOptions,
      "Geography",
      "Accounting",
      "Computer Science",
      "Agricultural Science",
    ],
  },
  Exams: {
    category: "examExpertise",
    label: "Subjects / exam expertise",
    placeholder: "Search or add your own",
    suggestions: [
      "Mathematics",
      "English Language",
      "Physics",
      "Chemistry",
      "Algebra",
      "IELTS Speaking",
      "IELTS Writing",
    ],
  },
  Language: {
    category: "language",
    label: "Languages you teach",
    placeholder: "Search or add a language",
    suggestions: ["English", ...languageSubjectOptions.filter((l) => l !== "Mandarin"), "Chinese"],
  },
  Undergraduate: {
    category: "course",
    label: "Courses / areas of expertise",
    placeholder: "Search courses or add your own",
    suggestions: [
      "Calculus",
      "Statistics",
      "Data Structures",
      "Algorithms",
      "Python",
      "Database Systems",
      "Software Engineering",
      "Engineering Mathematics",
      "Thermodynamics",
      "Financial Accounting",
      "Marketing",
      "Economics",
    ],
  },
  Masters: {
    category: "specialization",
    label: "Specialization / areas of expertise",
    placeholder: "Search or add your own",
    suggestions: [
      "Artificial Intelligence",
      "Data Science",
      "Finance",
      "Marketing",
      "Business Analytics",
      "Public Health",
      "International Relations",
      "Development Economics",
      "Educational Psychology",
      "Software Engineering",
    ],
  },
  PhD: {
    category: "researchArea",
    label: "Research / academic expertise",
    placeholder: "Search or add your own",
    suggestions: [
      "Machine Learning",
      "Computer Vision",
      "Natural Language Processing",
      "Development Economics",
      "Econometrics",
      "Labour Economics",
      "Renewable Energy",
      "Molecular Biology",
    ],
  },
};
