// Admin-manageable academic taxonomy for the Undergraduate / Masters / PhD
// browsing flow. This app has no live database yet (see supabase/migrations/
// + src/lib/*-data.ts elsewhere), so — consistent with the rest of the
// codebase — this is modeled as plain data that the Admin Dashboard reads
// and mutates in memory. The shape (ids, `active`, `order`) is deliberately
// DB-ready so swapping in real persistence later doesn't require reshaping
// the UI.

export interface Faculty {
  id: string;
  label: string;
  active: boolean;
  order: number;
}

export interface Department {
  id: string;
  facultyId: string;
  label: string;
  levels: string[]; // subset of undergraduateLevels this department offers
  active: boolean;
  order: number;
}

export interface Course {
  id: string;
  departmentId: string;
  levels: string[]; // which of the department's levels this course applies to
  label: string;
  active: boolean;
  order: number;
}

export const undergraduateLevels = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Other"];

export const faculties: Faculty[] = [
  { id: "fac-engineering", label: "Engineering", active: true, order: 1 },
  { id: "fac-medicine", label: "Medicine & Health Sciences", active: true, order: 2 },
  { id: "fac-sciences", label: "Sciences", active: true, order: 3 },
  { id: "fac-social-sciences", label: "Social Sciences", active: true, order: 4 },
  { id: "fac-arts", label: "Arts & Humanities", active: true, order: 5 },
  { id: "fac-law", label: "Law", active: true, order: 6 },
  { id: "fac-education", label: "Education", active: true, order: 7 },
  { id: "fac-business", label: "Business & Management", active: true, order: 8 },
  { id: "fac-computing", label: "Computing & Technology", active: true, order: 9 },
  { id: "fac-agriculture", label: "Agriculture", active: true, order: 10 },
  { id: "fac-environmental", label: "Environmental Sciences", active: true, order: 11 },
  { id: "fac-pharmacy", label: "Pharmacy", active: true, order: 12 },
];

const allLevels = undergraduateLevels;
const level100to400 = ["100 Level", "200 Level", "300 Level", "400 Level"];
const level100to500 = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level"];

export const departments: Department[] = [
  // Engineering
  { id: "dep-civil-eng", facultyId: "fac-engineering", label: "Civil Engineering", levels: level100to500, active: true, order: 1 },
  { id: "dep-mech-eng", facultyId: "fac-engineering", label: "Mechanical Engineering", levels: level100to500, active: true, order: 2 },
  { id: "dep-elec-eng", facultyId: "fac-engineering", label: "Electrical/Electronics Engineering", levels: level100to500, active: true, order: 3 },
  { id: "dep-chem-eng", facultyId: "fac-engineering", label: "Chemical Engineering", levels: level100to500, active: true, order: 4 },
  { id: "dep-comp-eng", facultyId: "fac-engineering", label: "Computer Engineering", levels: level100to500, active: true, order: 5 },
  { id: "dep-petroleum-eng", facultyId: "fac-engineering", label: "Petroleum Engineering", levels: level100to500, active: true, order: 6 },
  { id: "dep-mechatronics-eng", facultyId: "fac-engineering", label: "Mechatronics Engineering", levels: level100to500, active: true, order: 7 },
  { id: "dep-biomedical-eng", facultyId: "fac-engineering", label: "Biomedical Engineering", levels: level100to500, active: true, order: 8 },

  // Computing & Technology
  { id: "dep-comp-science", facultyId: "fac-computing", label: "Computer Science", levels: level100to400, active: true, order: 1 },
  { id: "dep-info-tech", facultyId: "fac-computing", label: "Information Technology", levels: level100to400, active: true, order: 2 },
  { id: "dep-software-eng", facultyId: "fac-computing", label: "Software Engineering", levels: level100to400, active: true, order: 3 },
  { id: "dep-cyber-security", facultyId: "fac-computing", label: "Cyber Security", levels: level100to400, active: true, order: 4 },

  // Sciences
  { id: "dep-physics", facultyId: "fac-sciences", label: "Physics", levels: level100to400, active: true, order: 1 },
  { id: "dep-chemistry", facultyId: "fac-sciences", label: "Chemistry", levels: level100to400, active: true, order: 2 },
  { id: "dep-mathematics", facultyId: "fac-sciences", label: "Mathematics", levels: level100to400, active: true, order: 3 },
  { id: "dep-statistics", facultyId: "fac-sciences", label: "Statistics", levels: level100to400, active: true, order: 4 },
  { id: "dep-biology", facultyId: "fac-sciences", label: "Biological Sciences", levels: level100to400, active: true, order: 5 },

  // Business & Management
  { id: "dep-accounting", facultyId: "fac-business", label: "Accounting", levels: level100to400, active: true, order: 1 },
  { id: "dep-business-admin", facultyId: "fac-business", label: "Business Administration", levels: level100to400, active: true, order: 2 },
  { id: "dep-economics", facultyId: "fac-business", label: "Economics", levels: level100to400, active: true, order: 3 },
  { id: "dep-finance", facultyId: "fac-business", label: "Finance", levels: level100to400, active: true, order: 4 },
  { id: "dep-marketing", facultyId: "fac-business", label: "Marketing", levels: level100to400, active: true, order: 5 },

  // Social Sciences
  { id: "dep-political-science", facultyId: "fac-social-sciences", label: "Political Science", levels: level100to400, active: true, order: 1 },
  { id: "dep-sociology", facultyId: "fac-social-sciences", label: "Sociology", levels: level100to400, active: true, order: 2 },
  { id: "dep-psychology", facultyId: "fac-social-sciences", label: "Psychology", levels: level100to400, active: true, order: 3 },
  { id: "dep-mass-comm", facultyId: "fac-social-sciences", label: "Mass Communication", levels: level100to400, active: true, order: 4 },

  // Arts & Humanities
  { id: "dep-english", facultyId: "fac-arts", label: "English Language", levels: level100to400, active: true, order: 1 },
  { id: "dep-history", facultyId: "fac-arts", label: "History & International Studies", levels: level100to400, active: true, order: 2 },
  { id: "dep-linguistics", facultyId: "fac-arts", label: "Linguistics", levels: level100to400, active: true, order: 3 },

  // Medicine & Health Sciences
  { id: "dep-medicine-surgery", facultyId: "fac-medicine", label: "Medicine & Surgery", levels: allLevels, active: true, order: 1 },
  { id: "dep-nursing", facultyId: "fac-medicine", label: "Nursing Science", levels: level100to500, active: true, order: 2 },
  { id: "dep-public-health", facultyId: "fac-medicine", label: "Public Health", levels: level100to400, active: true, order: 3 },

  // Law
  { id: "dep-law", facultyId: "fac-law", label: "Law", levels: level100to500, active: true, order: 1 },

  // Education
  { id: "dep-education-foundations", facultyId: "fac-education", label: "Educational Foundations", levels: level100to400, active: true, order: 1 },
  { id: "dep-curriculum-studies", facultyId: "fac-education", label: "Curriculum Studies", levels: level100to400, active: true, order: 2 },

  // Agriculture
  { id: "dep-agric-economics", facultyId: "fac-agriculture", label: "Agricultural Economics", levels: level100to400, active: true, order: 1 },
  { id: "dep-crop-science", facultyId: "fac-agriculture", label: "Crop Science", levels: level100to400, active: true, order: 2 },

  // Environmental Sciences
  { id: "dep-architecture", facultyId: "fac-environmental", label: "Architecture", levels: level100to500, active: true, order: 1 },
  { id: "dep-urban-planning", facultyId: "fac-environmental", label: "Urban & Regional Planning", levels: level100to500, active: true, order: 2 },

  // Pharmacy
  { id: "dep-pharmacy", facultyId: "fac-pharmacy", label: "Pharmacy", levels: allLevels, active: true, order: 1 },
];

export const courses: Course[] = [
  // Computer Engineering
  { id: "crs-data-structures", departmentId: "dep-comp-eng", levels: ["300 Level"], label: "Data Structures", active: true, order: 1 },
  { id: "crs-algorithms", departmentId: "dep-comp-eng", levels: ["300 Level"], label: "Algorithms", active: true, order: 2 },
  { id: "crs-digital-electronics", departmentId: "dep-comp-eng", levels: ["200 Level", "300 Level"], label: "Digital Electronics", active: true, order: 3 },
  { id: "crs-computer-architecture", departmentId: "dep-comp-eng", levels: ["300 Level", "400 Level"], label: "Computer Architecture", active: true, order: 4 },
  { id: "crs-programming-ce", departmentId: "dep-comp-eng", levels: ["100 Level", "200 Level"], label: "Programming", active: true, order: 5 },
  { id: "crs-eng-maths-ce", departmentId: "dep-comp-eng", levels: ["100 Level", "200 Level"], label: "Engineering Mathematics", active: true, order: 6 },

  // Computer Science
  { id: "crs-programming-cs", departmentId: "dep-comp-science", levels: ["100 Level", "200 Level"], label: "Introduction to Programming", active: true, order: 1 },
  { id: "crs-data-structures-cs", departmentId: "dep-comp-science", levels: ["200 Level"], label: "Data Structures & Algorithms", active: true, order: 2 },
  { id: "crs-databases", departmentId: "dep-comp-science", levels: ["300 Level"], label: "Database Systems", active: true, order: 3 },
  { id: "crs-software-engineering", departmentId: "dep-comp-science", levels: ["300 Level"], label: "Software Engineering", active: true, order: 4 },
  { id: "crs-ai-intro", departmentId: "dep-comp-science", levels: ["400 Level"], label: "Introduction to Artificial Intelligence", active: true, order: 5 },
  { id: "crs-operating-systems", departmentId: "dep-comp-science", levels: ["300 Level"], label: "Operating Systems", active: true, order: 6 },

  // Electrical/Electronics Engineering
  { id: "crs-circuit-theory", departmentId: "dep-elec-eng", levels: ["200 Level"], label: "Circuit Theory", active: true, order: 1 },
  { id: "crs-power-systems", departmentId: "dep-elec-eng", levels: ["300 Level", "400 Level"], label: "Power Systems", active: true, order: 2 },
  { id: "crs-control-systems", departmentId: "dep-elec-eng", levels: ["300 Level"], label: "Control Systems", active: true, order: 3 },
  { id: "crs-signals-systems", departmentId: "dep-elec-eng", levels: ["300 Level"], label: "Signals & Systems", active: true, order: 4 },

  // Civil Engineering
  { id: "crs-structural-analysis", departmentId: "dep-civil-eng", levels: ["300 Level", "400 Level"], label: "Structural Analysis", active: true, order: 1 },
  { id: "crs-soil-mechanics", departmentId: "dep-civil-eng", levels: ["300 Level"], label: "Soil Mechanics", active: true, order: 2 },
  { id: "crs-fluid-mechanics", departmentId: "dep-civil-eng", levels: ["200 Level", "300 Level"], label: "Fluid Mechanics", active: true, order: 3 },

  // Mechanical Engineering
  { id: "crs-thermodynamics", departmentId: "dep-mech-eng", levels: ["200 Level", "300 Level"], label: "Thermodynamics", active: true, order: 1 },
  { id: "crs-strength-of-materials", departmentId: "dep-mech-eng", levels: ["300 Level"], label: "Strength of Materials", active: true, order: 2 },

  // Statistics
  { id: "crs-probability", departmentId: "dep-statistics", levels: ["200 Level"], label: "Probability Theory", active: true, order: 1 },
  { id: "crs-statistical-inference", departmentId: "dep-statistics", levels: ["300 Level"], label: "Statistical Inference", active: true, order: 2 },
  { id: "crs-regression-analysis", departmentId: "dep-statistics", levels: ["300 Level", "400 Level"], label: "Regression Analysis", active: true, order: 3 },
  { id: "crs-statistics-intro", departmentId: "dep-statistics", levels: ["100 Level"], label: "Introduction to Statistics", active: true, order: 4 },

  // Mathematics
  { id: "crs-calculus", departmentId: "dep-mathematics", levels: ["100 Level"], label: "Calculus", active: true, order: 1 },
  { id: "crs-linear-algebra", departmentId: "dep-mathematics", levels: ["200 Level"], label: "Linear Algebra", active: true, order: 2 },
  { id: "crs-real-analysis", departmentId: "dep-mathematics", levels: ["300 Level"], label: "Real Analysis", active: true, order: 3 },

  // Accounting / Economics / Business
  { id: "crs-financial-accounting", departmentId: "dep-accounting", levels: ["100 Level", "200 Level"], label: "Financial Accounting", active: true, order: 1 },
  { id: "crs-cost-accounting", departmentId: "dep-accounting", levels: ["300 Level"], label: "Cost Accounting", active: true, order: 2 },
  { id: "crs-microeconomics", departmentId: "dep-economics", levels: ["100 Level", "200 Level"], label: "Microeconomics", active: true, order: 1 },
  { id: "crs-macroeconomics", departmentId: "dep-economics", levels: ["200 Level"], label: "Macroeconomics", active: true, order: 2 },
  { id: "crs-econometrics", departmentId: "dep-economics", levels: ["300 Level", "400 Level"], label: "Econometrics", active: true, order: 3 },

  // Political Science / Sociology / Psychology
  { id: "crs-research-methods-poli", departmentId: "dep-political-science", levels: ["300 Level"], label: "Research Methods in Political Science", active: true, order: 1 },
  { id: "crs-intro-sociology", departmentId: "dep-sociology", levels: ["100 Level"], label: "Introduction to Sociology", active: true, order: 1 },
  { id: "crs-social-research-methods", departmentId: "dep-sociology", levels: ["300 Level"], label: "Social Research Methods", active: true, order: 2 },
  { id: "crs-cognitive-psychology", departmentId: "dep-psychology", levels: ["300 Level"], label: "Cognitive Psychology", active: true, order: 1 },

  // English
  { id: "crs-phonetics", departmentId: "dep-english", levels: ["200 Level"], label: "Phonetics & Phonology", active: true, order: 1 },
  { id: "crs-academic-writing-eng", departmentId: "dep-english", levels: ["100 Level"], label: "Use of English", active: true, order: 2 },
];

export type MastersPhdLevel = "Masters" | "PhD";

export interface MastersPhdService {
  id: string;
  label: string;
  active: boolean;
  order: number;
  forLevels: MastersPhdLevel[];
}

// "What do you need help with?" options. Masters/PhD share most services;
// a few (Research Design, Qualitative/Quantitative Research) are PhD-leaning
// per the spec but still selectable at Masters level if admin enables them.
export const researchServices: MastersPhdService[] = [
  { id: "svc-research-assistant", label: "Research Support", active: true, order: 1, forLevels: ["Masters", "PhD"] },
  { id: "svc-thesis-support", label: "Thesis Support", active: true, order: 2, forLevels: ["Masters"] },
  { id: "svc-dissertation-support", label: "Dissertation Support", active: true, order: 3, forLevels: ["Masters", "PhD"] },
  { id: "svc-research-methodology", label: "Research Methodology", active: true, order: 4, forLevels: ["Masters", "PhD"] },
  { id: "svc-data-analysis", label: "Data Analysis", active: true, order: 5, forLevels: ["Masters", "PhD"] },
  { id: "svc-literature-review", label: "Literature Review", active: true, order: 6, forLevels: ["Masters", "PhD"] },
  { id: "svc-academic-writing", label: "Academic Writing", active: true, order: 7, forLevels: ["Masters", "PhD"] },
  { id: "svc-research-proposal", label: "Research Proposal", active: true, order: 8, forLevels: ["Masters", "PhD"] },
  { id: "svc-referencing-citation", label: "Referencing & Citation", active: true, order: 9, forLevels: ["Masters", "PhD"] },
  { id: "svc-statistical-analysis", label: "Statistical Analysis", active: true, order: 10, forLevels: ["Masters", "PhD"] },
  { id: "svc-research-design", label: "Research Design", active: true, order: 11, forLevels: ["PhD"] },
  { id: "svc-qualitative-research", label: "Qualitative Research", active: true, order: 12, forLevels: ["PhD"] },
  { id: "svc-quantitative-research", label: "Quantitative Research", active: true, order: 13, forLevels: ["PhD"] },
  { id: "svc-thesis-dissertation-support", label: "Thesis/Dissertation Support", active: true, order: 14, forLevels: ["PhD"] },
];

export interface ResearchField {
  id: string;
  label: string;
  active: boolean;
  order: number;
}

// "What's your field of study/research?" — shared list for Masters and PhD.
export const researchFields: ResearchField[] = [
  { id: "field-business", label: "Business & Management", active: true, order: 1 },
  { id: "field-engineering", label: "Engineering", active: true, order: 2 },
  { id: "field-computer-science", label: "Computer Science", active: true, order: 3 },
  { id: "field-medicine", label: "Medicine & Health", active: true, order: 4 },
  { id: "field-education", label: "Education", active: true, order: 5 },
  { id: "field-law", label: "Law", active: true, order: 6 },
  { id: "field-economics-finance", label: "Economics & Finance", active: true, order: 7 },
  { id: "field-social-sciences", label: "Social Sciences", active: true, order: 8 },
  { id: "field-natural-sciences", label: "Natural Sciences", active: true, order: 9 },
  { id: "field-arts-humanities", label: "Arts & Humanities", active: true, order: 10 },
  { id: "field-agriculture", label: "Agriculture", active: true, order: 11 },
  { id: "field-environmental-sciences", label: "Environmental Sciences", active: true, order: 12 },
];

export interface ResearchArea {
  id: string;
  fieldId: string;
  label: string;
  active: boolean;
}

// Optional, admin-managed "Research Area" suggestions shown once a field is
// picked. Students can still skip this step — it's optional per the spec.
export const researchAreas: ResearchArea[] = [
  { id: "area-ai", fieldId: "field-computer-science", label: "Artificial Intelligence", active: true },
  { id: "area-ml", fieldId: "field-computer-science", label: "Machine Learning", active: true },
  { id: "area-data-science", fieldId: "field-computer-science", label: "Data Science", active: true },
  { id: "area-nlp", fieldId: "field-computer-science", label: "Natural Language Processing", active: true },
  { id: "area-cybersecurity", fieldId: "field-computer-science", label: "Cybersecurity", active: true },
  { id: "area-fintech", fieldId: "field-economics-finance", label: "Financial Technology", active: true },
  { id: "area-macro-policy", fieldId: "field-economics-finance", label: "Macroeconomic Policy", active: true },
  { id: "area-quant-methods-ss", fieldId: "field-social-sciences", label: "Quantitative Research Methods", active: true },
  { id: "area-public-policy", fieldId: "field-social-sciences", label: "Public Policy", active: true },
  { id: "area-renewable-energy", fieldId: "field-engineering", label: "Renewable Energy Systems", active: true },
  { id: "area-robotics", fieldId: "field-engineering", label: "Robotics & Automation", active: true },
  { id: "area-public-health", fieldId: "field-medicine", label: "Public Health", active: true },
  { id: "area-clinical-research", fieldId: "field-medicine", label: "Clinical Research", active: true },
];

export function facultyById(id: string): Faculty | undefined {
  return faculties.find((f) => f.id === id);
}
export function departmentById(id: string): Department | undefined {
  return departments.find((d) => d.id === id);
}
export function courseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}
export function serviceById(id: string): MastersPhdService | undefined {
  return researchServices.find((s) => s.id === id);
}
export function fieldById(id: string): ResearchField | undefined {
  return researchFields.find((f) => f.id === id);
}
export function researchAreaById(id: string): ResearchArea | undefined {
  return researchAreas.find((a) => a.id === id);
}
export function departmentsForFaculty(facultyId: string): Department[] {
  return departments.filter((d) => d.facultyId === facultyId && d.active).sort((a, b) => a.order - b.order);
}
export function coursesForDepartment(departmentId: string, level?: string): Course[] {
  return courses
    .filter((c) => c.departmentId === departmentId && c.active && (!level || c.levels.includes(level)))
    .sort((a, b) => a.order - b.order);
}
export function researchAreasForField(fieldId: string): ResearchArea[] {
  return researchAreas.filter((a) => a.fieldId === fieldId && a.active);
}
export function servicesForLevel(level: MastersPhdLevel): MastersPhdService[] {
  return researchServices.filter((s) => s.forLevels.includes(level) && s.active).sort((a, b) => a.order - b.order);
}
