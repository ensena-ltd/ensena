// Option lists for the tutor sign-up wizard:
//  - subjectsForTutorLevel: every subject under each academic level a tutor
//    can pick on Step 2 (Undergraduate/Masters/PhD browse by degree course).
//  - fieldsOfStudyFor: Step 3 "Field of study", by qualification and the
//    kind of institution picked (university / polytechnic / college of
//    education). There's no public per-institution course catalogue, so this
//    is the standard programme list for that kind of institution; "Other"
//    always allows typing anything else.
import {
  degreeCourseNames,
  degreeCourses,
  juniorSecondarySubjects,
  k1k3Subjects,
  languageSubjects,
  postgraduateExtras,
  primarySubjects,
  seniorSecondarySubjects,
} from "@/lib/student-onboarding-subjects";

export type InstitutionType = "u" | "p" | "c";

export const DEGREE_LEVELS = ["Undergraduate", "Masters", "PhD"];

const uniq = (list: string[]) => [...new Set(list)];

const examSubjects = uniq([
  ...seniorSecondarySubjects,
  "Use of English (JAMB)",
  "IELTS Listening",
  "IELTS Reading",
  "IELTS Writing",
  "IELTS Speaking",
  "TOEFL",
  "SAT Math",
  "SAT Reading & Writing",
  "GRE Quantitative Reasoning",
  "GRE Verbal Reasoning",
  "GRE Analytical Writing",
  "GMAT Quantitative",
  "GMAT Verbal",
  "Common Entrance",
]);

/** All subjects for a non-degree level (Nursery, Primary, Secondary, Exams, Language). */
export function subjectsForTutorLevel(level: string): string[] {
  switch (level) {
    case "Nursery":
      return k1k3Subjects;
    case "Primary":
      return primarySubjects;
    case "Secondary":
      return uniq([...juniorSecondarySubjects, ...seniorSecondarySubjects]);
    case "Exams":
      return examSubjects;
    case "Language":
      return languageSubjects;
    default:
      return [];
  }
}

/** Degree courses to browse for Undergraduate/Masters/PhD. */
export const tutorDegreeCourses = degreeCourseNames;

/** Modules of one degree course; postgraduate levels add research modules. */
export function modulesForDegreeCourse(course: string, level: string): string[] {
  const modules = degreeCourses[course] ?? [];
  return level === "Masters" || level === "PhD" ? uniq([...modules, ...postgraduateExtras]) : modules;
}

const universityProgrammes = uniq([
  ...degreeCourseNames,
  "Accounting", "Actuarial Science", "Aerospace Engineering", "Agricultural Economics", "Agricultural Engineering", "Anatomy",
  "Animal Science", "Arabic Studies", "Banking and Finance", "Botany", "Business Education", "Christian Religious Studies",
  "Criminology", "Early Childhood Education", "Educational Management", "Estate Management", "Fine and Applied Arts",
  "Fisheries and Aquaculture", "Food Science and Technology", "French", "Geology", "Guidance and Counselling", "Hausa",
  "Hospitality and Tourism Management", "Human Kinetics", "Igbo", "Industrial Chemistry", "Industrial and Production Engineering",
  "Insurance", "Islamic Studies", "Library and Information Science", "Marine Science", "Metallurgical and Materials Engineering",
  "Music", "Optometry", "Physiology", "Physiotherapy", "Public Administration", "Quantity Surveying", "Radiography",
  "Religious Studies", "Science Education", "Social Work", "Surveying and Geoinformatics", "Theatre Arts", "Transport Management",
  "Urban and Regional Planning", "Veterinary Medicine", "Yoruba", "Zoology",
]).sort((a, b) => a.localeCompare(b));

const polytechnicProgrammes = [
  "Accountancy", "Agricultural Technology", "Architectural Technology", "Banking and Finance", "Building Technology",
  "Business Administration and Management", "Chemical Engineering Technology", "Civil Engineering Technology",
  "Computer Engineering", "Computer Science", "Electrical/Electronic Engineering Technology", "Estate Management and Valuation",
  "Fashion Design and Clothing Technology", "Food Technology", "Hospitality Management", "Library and Information Science",
  "Marketing", "Mass Communication", "Mechanical Engineering Technology", "Mineral and Petroleum Resources Engineering",
  "Office Technology and Management", "Public Administration", "Quantity Surveying", "Science Laboratory Technology", "Statistics",
  "Surveying and Geoinformatics", "Urban and Regional Planning",
];

const collegeOfEducationProgrammes = [
  "Agricultural Education", "Biology Education", "Business Education", "Chemistry Education", "Christian Religious Studies",
  "Computer Science Education", "Early Childhood Care Education", "Economics", "English Language", "Fine and Applied Arts", "French",
  "Hausa", "Home Economics", "Igbo", "Integrated Science", "Islamic Studies", "Mathematics", "Music", "Physical and Health Education",
  "Physics Education", "Primary Education Studies", "Social Studies", "Technical Education", "Yoruba",
];

const secondarySchoolStreams = ["Science", "Arts", "Commercial", "Technical", "General Studies"];

/** Qualifications that pick an institution from the country's list. */
export function qualificationUsesInstitutionList(qualification: string) {
  return ["Diploma", "Bachelor's", "Master's", "PhD"].includes(qualification);
}

/** Which kinds of institution award this qualification. */
export function institutionTypesFor(qualification: string): InstitutionType[] {
  return qualification === "Diploma" ? ["u", "p", "c"] : ["u"];
}

export function fieldsOfStudyFor(qualification: string, institutionType: InstitutionType | null): string[] {
  if (qualification === "Secondary School") return secondarySchoolStreams;
  if (institutionType === "p") return polytechnicProgrammes;
  if (institutionType === "c") return collegeOfEducationProgrammes;
  return universityProgrammes;
}
