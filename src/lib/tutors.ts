import { academicLevels, teacherPhotos } from "@/lib/data";
import type { Teacher } from "@/lib/data";
import type { SupportTypeId } from "@/lib/academic-support-types";

export const academicLevelFilterOptions = academicLevels.map((l) => l.label);

export const academicSubjectOptions = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Government",
  "Literature",
];

export const languageSubjectOptions = [
  "French",
  "Spanish",
  "Arabic",
  "Igbo",
  "Yoruba",
  "Hausa",
  "German",
  "Mandarin",
  "Portuguese",
];

export const subjectOptions = [...academicSubjectOptions, ...languageSubjectOptions];

export const tutorTypeOptions = ["Private Tutor", "Group Classes"] as const;
export type TutorType = (typeof tutorTypeOptions)[number];

export const languageOptions = [
  "English",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Arabic",
  "Spanish",
  "German",
  "Mandarin",
  "Portuguese",
] as const;
export type Language = (typeof languageOptions)[number];

export const availabilityOptions = ["Weekdays", "Weekends", "Evenings"] as const;
export type Availability = (typeof availabilityOptions)[number];

export const modeOptions = ["Online", "Physical", "Hybrid"] as const;
export type Mode = (typeof modeOptions)[number];

export const sortOptions = [
  "Most relevant",
  "Price: Low to High",
  "Price: High to Low",
  "Highest Rated",
  "Most Experienced",
] as const;
export type SortOption = (typeof sortOptions)[number];

export interface Review {
  name: string;
  tag: string;
  stars: number;
  text: string;
}

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

// --- Academic qualification & specialization (Undergraduate/Masters/PhD) ---
// Optional fields — only tutors participating in the Undergraduate/Masters/
// PhD academic browsing flow set these; every other tutor is unaffected.
export type QualificationLevel = "Secondary School" | "Diploma" | "Bachelor's" | "Master's" | "PhD";
export type AcademicStatus = "Completed" | "Currently In Progress";
export type AcademicVerificationStatus = "Unverified" | "Pending" | "Verified" | "Rejected" | "Suspended";

export interface TutorQualification {
  highestQualification: QualificationLevel;
  status: AcademicStatus;
  institution: string;
  programme: string;
  fieldOfStudy: string;
  department?: string;
  researchArea?: string;
  graduationYear?: number;
  expectedGraduationYear?: number;
  teachingExperienceYears?: number;
  researchExperience?: string;
}

export interface AcademicSpecialization {
  facultyIds?: string[];
  departmentIds?: string[];
  courseIds?: string[];
  undergradLevels?: string[];
  fieldIds?: string[];
  researchAreaIds?: string[];
  serviceIds?: string[];
}

export interface TutorListing {
  slug: string;
  name: string;
  subject: string;
  subjectTitle: string;
  levels: string[];
  tutorType: TutorType;
  languages: Language[];
  nativeLanguage: string;
  availability: Availability[];
  modes: Mode[];
  rating: number;
  reviews: number;
  ratingBreakdown: RatingBreakdown;
  yearsExperience: number;
  price: number;
  availableToday: boolean;
  bio: string;
  teachingApproach: string;
  location: string;
  education: string;
  responseTime: string;
  lessonsTaught: number;
  repeatStudentsPct: number;
  memberSince: string;
  reviewList: Review[];
  learningStyles: string[];
  image: string;
  // What kind of help this tutor offers — Tutoring, Assignment Support,
  // Research Support, etc. (see academic-support-types.ts). Every tutor
  // declares this explicitly; teaching a subject never implies offering
  // every support type.
  supportTypes: SupportTypeId[];
  qualification?: TutorQualification;
  academicSpecialization?: AcademicSpecialization;
  mastersVerification?: AcademicVerificationStatus;
  phdVerification?: AcademicVerificationStatus;
}

const subjectBios: Record<string, string> = {
  Mathematics:
    "I help students build strong math concepts and improve exam performance.",
  English:
    "I help students improve their reading, writing and communication skills with confidence.",
  Physics: "Passionate about making physics simple, engaging and practical.",
  Chemistry: "Chemistry made easy! I simplify difficult topics and improve understanding.",
  Biology: "I teach biology in a fun and interactive way that helps students excel.",
  "Further Mathematics":
    "Helping students master advanced math concepts and ace their exams.",
  Government: "I break down government and civics topics into clear, exam-ready lessons.",
  Literature:
    "I build students' love for reading and help them analyze texts with confidence.",
  French: "I make French fun and practical, from first words to fluent conversation.",
  Spanish: "I help students speak Spanish confidently through real conversation practice.",
  Arabic: "I teach Arabic reading, writing and conversation for learners at every level.",
  Igbo: "I help students and heritage speakers build fluency and confidence in Igbo.",
  Yoruba: "I teach Yoruba language and culture in a warm, practical, everyday way.",
  Hausa: "I help students speak and understand Hausa through everyday conversation.",
  German: "I make German approachable and practical, from first phrases to confident conversation.",
  Mandarin: "I teach Mandarin through everyday conversation, tones and characters at a manageable pace.",
  Portuguese: "I help students speak Portuguese confidently through real conversation practice.",
};

const subjectTeachingApproach: Record<string, string> = {
  Mathematics:
    "I use real-life examples, past questions, and step-by-step explanations to make math easy to understand. I also provide practice materials and regular assessments to track progress.",
  English:
    "I combine guided reading, structured writing practice and spoken exercises so students improve across all four language skills, not just exam technique.",
  Physics:
    "I break concepts down with diagrams and everyday analogies before moving to past questions, so students understand the 'why' behind every formula.",
  Chemistry:
    "I connect chemistry to everyday phenomena and lots of worked examples, then reinforce it with practice questions and quick recall quizzes.",
  Biology:
    "I use diagrams, real specimens where possible, and past questions to help students visualize and retain biological processes.",
  "Further Mathematics":
    "I build on core mathematics foundations with structured problem sets, past questions and one-on-one feedback on working.",
  Government:
    "I turn government and civics topics into clear, structured notes and discussion-based lessons tied directly to the exam syllabus.",
  Literature:
    "I guide close reading of set texts with structured essay practice, discussion and past questions to build analytical confidence.",
  French:
    "I focus on real conversation from lesson one, layering grammar and vocabulary on top of practical, everyday dialogue.",
  Spanish:
    "Lessons are conversation-first: practical dialogue, everyday vocabulary, and grammar introduced only as it's needed.",
  Arabic:
    "I combine reading, writing and conversation practice, adapting the pace to each student's goals.",
  Igbo:
    "I teach through everyday conversation, proverbs and cultural context so the language feels natural, not memorized.",
  Yoruba:
    "Lessons blend spoken practice, proverbs and cultural context to help students think and respond naturally in Yoruba.",
  Hausa:
    "I focus on practical, everyday conversation first, building grammar and vocabulary around real situations.",
  German:
    "I focus on real conversation from lesson one, layering grammar and vocabulary on top of practical, everyday dialogue.",
  Mandarin:
    "I combine tones, characters and spoken practice, adapting the pace to each student's goals.",
  Portuguese:
    "Lessons are conversation-first: practical dialogue, everyday vocabulary, and grammar introduced only as it's needed.",
};

const subjectLevels: Record<string, string[]> = {
  Mathematics: ["Secondary", "WAEC / NECO", "JAMB / UTME"],
  English: ["Primary", "Secondary", "WAEC / NECO"],
  Physics: ["Secondary", "JAMB / UTME"],
  Chemistry: ["Secondary", "WAEC / NECO", "Undergraduate"],
  Biology: ["Secondary", "WAEC / NECO"],
  "Further Mathematics": ["Undergraduate", "JAMB / UTME"],
  Government: ["Secondary", "WAEC / NECO"],
  Literature: ["Secondary", "WAEC / NECO"],
  French: ["Primary", "Secondary", "Undergraduate"],
  Spanish: ["Primary", "Secondary", "Undergraduate"],
  Arabic: ["Primary", "Secondary", "Undergraduate"],
  Igbo: ["Primary", "Secondary", "Undergraduate"],
  Yoruba: ["Primary", "Secondary", "Undergraduate"],
  Hausa: ["Primary", "Secondary", "Undergraduate"],
  German: ["Primary", "Secondary", "Undergraduate"],
  Mandarin: ["Primary", "Secondary", "Undergraduate"],
  Portuguese: ["Primary", "Secondary", "Undergraduate"],
};

const subjectEducation: Record<string, string> = {
  Mathematics: "B.Sc. Mathematics, University of Lagos",
  English: "B.A. English Language, University of Ibadan",
  Physics: "B.Sc. Physics, University of Nigeria, Nsukka",
  Chemistry: "B.Sc. Chemistry, Obafemi Awolowo University",
  Biology: "B.Sc. Biology, University of Lagos",
  "Further Mathematics": "B.Sc. Mathematics, University of Ibadan",
  Government: "B.Sc. Political Science, University of Abuja",
  Literature: "B.A. English Literature, University of Lagos",
  French: "B.A. French, University of Lagos",
  Spanish: "B.A. Spanish, University of Ibadan",
  Arabic: "B.A. Arabic Studies, Bayero University Kano",
  Igbo: "B.A. Igbo Language, University of Nigeria, Nsukka",
  Yoruba: "B.A. Yoruba Language, Obafemi Awolowo University",
  Hausa: "B.A. Hausa Language, Bayero University Kano",
  German: "B.A. German Studies, University of Lagos",
  Mandarin: "B.A. Chinese Studies, University of Lagos",
  Portuguese: "B.A. Portuguese Studies, University of Ibadan",
};

const subjectLearningStyles: Record<string, string[]> = {
  Mathematics: ["Problem Solving", "Exam-focused", "Practical"],
  English: ["Discussion-based", "Interactive", "One-on-one"],
  Physics: ["Practical", "Problem Solving", "Visual Learning"],
  Chemistry: ["Practical", "Visual Learning", "Exam-focused"],
  Biology: ["Visual Learning", "Discussion-based", "Practical"],
  "Further Mathematics": ["Problem Solving", "Exam-focused", "Project-based"],
  Government: ["Discussion-based", "Interactive", "Exam-focused"],
  Literature: ["Discussion-based", "Interactive", "One-on-one"],
  French: ["Interactive", "Discussion-based", "One-on-one"],
  Spanish: ["Interactive", "Discussion-based", "One-on-one"],
  Arabic: ["Interactive", "Discussion-based", "Practical"],
  Igbo: ["Interactive", "Discussion-based", "One-on-one"],
  Yoruba: ["Interactive", "Discussion-based", "One-on-one"],
  Hausa: ["Interactive", "Discussion-based", "One-on-one"],
  German: ["Interactive", "Discussion-based", "One-on-one"],
  Mandarin: ["Interactive", "Discussion-based", "Practical"],
  Portuguese: ["Interactive", "Discussion-based", "One-on-one"],
};

const subjectNativeLanguage: Record<string, string> = {
  Igbo: "Igbo",
  Yoruba: "Yoruba",
  Hausa: "Hausa",
  French: "French",
  Spanish: "Spanish",
  Arabic: "Arabic",
  German: "German",
  Mandarin: "Mandarin",
  Portuguese: "Portuguese",
};

interface TutorSeed {
  name: string;
  gender: "m" | "f";
  subject: string;
  rating: number;
  reviews: number;
  yearsExperience: number;
  price: number;
  availableToday: boolean;
  tutorType: TutorType;
  languages: Language[];
  availability: Availability[];
  memberSince: string;
}

const seeds: TutorSeed[] = [
  { name: "Tunde Adebayo", gender: "m", subject: "Mathematics", rating: 4.9, reviews: 320, yearsExperience: 5, price: 3000, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekdays", "Evenings"], memberSince: "January 2021" },
  { name: "Chioma Nwosu", gender: "f", subject: "Physics", rating: 4.9, reviews: 210, yearsExperience: 4, price: 2800, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekdays"], memberSince: "March 2021" },
  { name: "Emeka Okafor", gender: "m", subject: "English", rating: 4.8, reviews: 210, yearsExperience: 5, price: 3000, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekdays", "Weekends"], memberSince: "June 2021" },
  { name: "Daniel Adeyemi", gender: "m", subject: "Chemistry", rating: 4.9, reviews: 180, yearsExperience: 6, price: 2800, availableToday: false, tutorType: "Private Tutor", languages: ["English"], availability: ["Evenings"], memberSince: "August 2020" },
  { name: "Zainab Yusuf", gender: "f", subject: "Biology", rating: 4.8, reviews: 153, yearsExperience: 4, price: 2500, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Hausa"], availability: ["Weekdays", "Evenings"], memberSince: "February 2022" },
  { name: "Ifeoma Balogun", gender: "f", subject: "French", rating: 4.9, reviews: 141, yearsExperience: 7, price: 3500, availableToday: false, tutorType: "Private Tutor", languages: ["English", "French"], availability: ["Weekends"], memberSince: "May 2019" },
  { name: "Faruk Musa", gender: "m", subject: "Mathematics", rating: 4.7, reviews: 98, yearsExperience: 3, price: 3000, availableToday: true, tutorType: "Group Classes", languages: ["English", "Hausa"], availability: ["Weekdays"], memberSince: "October 2022" },
  { name: "Aisha Bello", gender: "f", subject: "English", rating: 4.7, reviews: 98, yearsExperience: 3, price: 2500, availableToday: false, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekends", "Evenings"], memberSince: "November 2022" },
  { name: "Oluwatobi Lawal", gender: "m", subject: "Physics", rating: 4.9, reviews: 124, yearsExperience: 7, price: 2800, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Yoruba"], availability: ["Weekdays", "Weekends"], memberSince: "July 2018" },
  { name: "Esther Ibe", gender: "f", subject: "Chemistry", rating: 4.6, reviews: 87, yearsExperience: 3, price: 2500, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Evenings"], memberSince: "January 2023" },
  { name: "Samuel Eze", gender: "m", subject: "Biology", rating: 4.8, reviews: 132, yearsExperience: 5, price: 2500, availableToday: false, tutorType: "Group Classes", languages: ["English"], availability: ["Weekdays"], memberSince: "April 2021" },
  { name: "Blessing Okonkwo", gender: "f", subject: "Further Mathematics", rating: 4.7, reviews: 76, yearsExperience: 4, price: 2800, availableToday: true, tutorType: "Private Tutor", languages: ["English", "French"], availability: ["Weekends"], memberSince: "September 2022" },
  { name: "Ibrahim Suleiman", gender: "m", subject: "Biology", rating: 4.6, reviews: 64, yearsExperience: 2, price: 2200, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekdays", "Evenings"], memberSince: "March 2023" },
  { name: "Grace Adamu", gender: "f", subject: "Further Mathematics", rating: 4.9, reviews: 158, yearsExperience: 8, price: 4500, availableToday: false, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekends"], memberSince: "February 2018" },
  { name: "Kelechi Nnamdi", gender: "m", subject: "Government", rating: 4.5, reviews: 52, yearsExperience: 2, price: 2000, availableToday: true, tutorType: "Group Classes", languages: ["English"], availability: ["Weekdays"], memberSince: "June 2023" },
  { name: "Fatima Abdullahi", gender: "f", subject: "Literature", rating: 4.8, reviews: 112, yearsExperience: 5, price: 3000, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Hausa"], availability: ["Weekdays", "Weekends"], memberSince: "October 2020" },
  { name: "Victor Uche", gender: "m", subject: "Government", rating: 4.7, reviews: 91, yearsExperience: 4, price: 2700, availableToday: false, tutorType: "Private Tutor", languages: ["English"], availability: ["Evenings"], memberSince: "December 2021" },
  { name: "Halima Sani", gender: "f", subject: "Literature", rating: 4.9, reviews: 176, yearsExperience: 6, price: 3200, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Hausa"], availability: ["Weekdays", "Weekends"], memberSince: "April 2020" },
  { name: "Amara Chukwu", gender: "f", subject: "French", rating: 4.8, reviews: 84, yearsExperience: 4, price: 3200, availableToday: true, tutorType: "Private Tutor", languages: ["English", "French"], availability: ["Weekdays", "Evenings"], memberSince: "May 2022" },
  { name: "Carlos Mendes", gender: "m", subject: "Spanish", rating: 4.7, reviews: 59, yearsExperience: 3, price: 3000, availableToday: false, tutorType: "Private Tutor", languages: ["English", "Spanish"], availability: ["Weekends"], memberSince: "August 2022" },
  { name: "Yusuf Aliyu", gender: "m", subject: "Arabic", rating: 4.9, reviews: 103, yearsExperience: 6, price: 3200, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Arabic"], availability: ["Weekdays", "Weekends"], memberSince: "January 2019" },
  { name: "Ngozi Eze", gender: "f", subject: "Igbo", rating: 4.9, reviews: 67, yearsExperience: 5, price: 2500, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Igbo"], availability: ["Weekdays"], memberSince: "July 2021" },
  { name: "Adekunle Ojo", gender: "m", subject: "Yoruba", rating: 4.8, reviews: 71, yearsExperience: 4, price: 2500, availableToday: false, tutorType: "Group Classes", languages: ["English", "Yoruba"], availability: ["Weekends", "Evenings"], memberSince: "November 2021" },
  { name: "Hauwa Bello", gender: "f", subject: "Hausa", rating: 4.7, reviews: 48, yearsExperience: 3, price: 2200, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Hausa"], availability: ["Weekdays", "Evenings"], memberSince: "March 2022" },
  { name: "Jean Dupont", gender: "m", subject: "French", rating: 4.8, reviews: 96, yearsExperience: 6, price: 4000, availableToday: true, tutorType: "Private Tutor", languages: ["English", "French"], availability: ["Weekdays", "Weekends"], memberSince: "February 2021" },
  { name: "Maria Garcia", gender: "f", subject: "Spanish", rating: 4.9, reviews: 110, yearsExperience: 5, price: 3000, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Spanish"], availability: ["Weekdays"], memberSince: "May 2021" },
  { name: "Klaus Weber", gender: "m", subject: "German", rating: 4.8, reviews: 57, yearsExperience: 5, price: 3500, availableToday: true, tutorType: "Private Tutor", languages: ["English", "German"], availability: ["Weekdays", "Evenings"], memberSince: "June 2021" },
  { name: "Li Wei", gender: "f", subject: "Mandarin", rating: 4.9, reviews: 63, yearsExperience: 4, price: 3200, availableToday: false, tutorType: "Private Tutor", languages: ["English", "Mandarin"], availability: ["Weekends", "Evenings"], memberSince: "September 2021" },
  { name: "Beatriz Santos", gender: "f", subject: "Portuguese", rating: 4.7, reviews: 45, yearsExperience: 3, price: 2800, availableToday: true, tutorType: "Private Tutor", languages: ["English", "Portuguese"], availability: ["Weekdays"], memberSince: "January 2022" },
  { name: "Adaeze Okonkwo", gender: "f", subject: "Mathematics", rating: 4.98, reviews: 215, yearsExperience: 6, price: 3000, availableToday: true, tutorType: "Private Tutor", languages: ["English"], availability: ["Weekdays", "Weekends", "Evenings"], memberSince: "January 2021" },
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function computeRatingBreakdown(rating: number, reviews: number): RatingBreakdown {
  const fiveShare = rating >= 4.8 ? 0.85 : rating >= 4.6 ? 0.75 : 0.6;
  const five = Math.round(reviews * fiveShare);
  const four = Math.round(reviews * 0.12);
  const three = Math.round(reviews * 0.02);
  const two = Math.max(0, Math.round(reviews * 0.005));
  const one = Math.max(0, reviews - five - four - three - two);
  return { 5: five, 4: four, 3: three, 2: two, 1: one };
}

const reviewerPool: { name: string; tag: string; text: string }[] = [
  {
    name: "Adebayo T.",
    tag: "JAMB / UTME",
    text: "An excellent tutor. The explanations are clear and every topic is made so easy to understand.",
  },
  {
    name: "Jessica O.",
    tag: "JSS3",
    text: "My child's confidence has grown so much. The teaching style is patient and engaging.",
  },
  {
    name: "Muhammed A.",
    tag: "WAEC",
    text: "Very good tutor! I improved from a C to an A. Highly recommended.",
  },
  {
    name: "Ngozi P.",
    tag: "Undergraduate",
    text: "Sessions are well structured and always start on time. I always leave with clear takeaways.",
  },
  {
    name: "Femi K.",
    tag: "SS2",
    text: "Patient, encouraging, and really knows how to break down difficult topics.",
  },
  {
    name: "Grace I.",
    tag: "Primary",
    text: "My daughter looks forward to every lesson now. Great with younger learners.",
  },
];

function buildReviews(seedIndex: number, count: number): Review[] {
  return Array.from({ length: 3 }).map((_, i) => {
    const r = reviewerPool[(seedIndex + i) % reviewerPool.length];
    return { ...r, stars: count > 100 ? 5 : 4 + ((seedIndex + i) % 2) };
  });
}

let maleCycle = 0;
let femaleCycle = 0;

const modeCycles: Mode[][] = [["Online"], ["Physical"], ["Online", "Physical"]];

// Every generated (secondary/exam-board) tutor gets Tutoring plus a
// deterministic, varied subset of the coursework-support types — real
// variety across the marketplace for the new filter without hand-authoring
// 30 entries individually. Research/thesis/publication support only ever
// appears on the Masters/PhD academic specialists below, since that's the
// level those support types are actually meaningful at.
const supportTypeCycles: SupportTypeId[][] = [
  ["tutoring"],
  ["tutoring", "assignment-support"],
  ["tutoring", "assignment-support", "project-support"],
  ["tutoring", "presentation-support"],
  ["tutoring", "assignment-support", "presentation-support"],
  ["tutoring", "project-support"],
];

function deriveSupportTypes(seedIndex: number): SupportTypeId[] {
  return supportTypeCycles[seedIndex % supportTypeCycles.length];
}

const generatedTutorListings: TutorListing[] = seeds.map((seed, i) => {
  const image =
    seed.gender === "m"
      ? teacherPhotos[maleCycle++ % 2 === 0 ? 0 : 2]
      : teacherPhotos[femaleCycle++ % 2 === 0 ? 1 : 3];

  const modes: Mode[] =
    seed.tutorType === "Group Classes" ? ["Online", "Hybrid"] : modeCycles[i % modeCycles.length];

  return {
    slug: slugify(seed.name),
    name: seed.name,
    subject: seed.subject,
    subjectTitle: `${seed.subject} Tutor`,
    levels: subjectLevels[seed.subject],
    tutorType: seed.tutorType,
    languages: seed.languages,
    nativeLanguage: subjectNativeLanguage[seed.subject] ?? "English",
    availability: seed.availability,
    modes,
    rating: seed.rating,
    reviews: seed.reviews,
    ratingBreakdown: computeRatingBreakdown(seed.rating, seed.reviews),
    yearsExperience: seed.yearsExperience,
    price: seed.price,
    availableToday: seed.availableToday,
    bio: subjectBios[seed.subject],
    teachingApproach: subjectTeachingApproach[seed.subject],
    location: "Lagos, Nigeria",
    education: subjectEducation[seed.subject],
    responseTime: "Usually responds in a few hours",
    lessonsTaught: Math.round(seed.reviews * 1.6),
    repeatStudentsPct: Math.min(95, 60 + seed.yearsExperience * 4),
    memberSince: seed.memberSince,
    reviewList: buildReviews(i, seed.reviews),
    learningStyles: subjectLearningStyles[seed.subject] ?? ["Interactive", "Exam-focused"],
    image,
    supportTypes: deriveSupportTypes(i),
  };
});

// --- Academic specialists (Undergraduate / Masters / PhD) ---
// Hand-authored rather than generated through the secondary/exam `seeds`
// pipeline above, since these need department/faculty/research-area tags
// that pipeline has no concept of. They flow through the same TutorListing
// shape so every existing card/profile/booking component renders them with
// no special-casing.
const academicSpecialistTutors: TutorListing[] = [
  {
    slug: "adaobi-chukwuma",
    name: "Adaobi Chukwuma",
    subject: "Computer Engineering",
    subjectTitle: "Computer Engineering Tutor",
    levels: ["Undergraduate"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekdays", "Evenings"],
    modes: ["Online"],
    rating: 4.9,
    reviews: 87,
    ratingBreakdown: computeRatingBreakdown(4.9, 87),
    yearsExperience: 5,
    price: 3500,
    availableToday: true,
    bio: "Specialist in Data Structures and Programming for Computer Engineering undergraduates.",
    teachingApproach: "I break down data structures and algorithms with whiteboard walkthroughs and past exam questions, then reinforce with hands-on coding exercises.",
    location: "Lagos, Nigeria",
    education: "M.Eng. Computer Engineering, University of Lagos",
    responseTime: "Usually responds in a few hours",
    lessonsTaught: 210,
    repeatStudentsPct: 88,
    memberSince: "January 2021",
    reviewList: buildReviews(30, 87),
    learningStyles: ["Problem Solving", "Practical", "Exam-focused"],
    image: teacherPhotos[1],
    supportTypes: ["tutoring", "assignment-support"],
    qualification: {
      highestQualification: "Master's",
      status: "Completed",
      institution: "University of Lagos",
      programme: "M.Eng. Computer Engineering",
      fieldOfStudy: "Computer Engineering",
      graduationYear: 2019,
      teachingExperienceYears: 5,
    },
    academicSpecialization: {
      facultyIds: ["fac-engineering"],
      departmentIds: ["dep-comp-eng"],
      courseIds: ["crs-data-structures", "crs-algorithms", "crs-programming-ce", "crs-computer-architecture"],
      undergradLevels: ["200 Level", "300 Level"],
    },
  },
  {
    slug: "chidera-okoye",
    name: "Chidera Okoye",
    subject: "Statistics",
    subjectTitle: "Statistics Tutor",
    levels: ["Undergraduate"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekdays", "Weekends"],
    modes: ["Online", "Physical"],
    rating: 4.8,
    reviews: 64,
    ratingBreakdown: computeRatingBreakdown(4.8, 64),
    yearsExperience: 4,
    price: 3200,
    availableToday: true,
    bio: "I help undergraduates build confidence in probability, statistical inference and regression.",
    teachingApproach: "Concept-first explanations followed by worked past questions, with a focus on the reasoning behind each statistical test.",
    location: "Ibadan, Nigeria",
    education: "B.Sc. Statistics, University of Ibadan",
    responseTime: "Usually responds within an hour",
    lessonsTaught: 150,
    repeatStudentsPct: 82,
    memberSince: "August 2021",
    reviewList: buildReviews(31, 64),
    learningStyles: ["Problem Solving", "Exam-focused"],
    image: teacherPhotos[3],
    supportTypes: ["tutoring", "assignment-support"],
    qualification: {
      highestQualification: "Master's",
      status: "Completed",
      institution: "University of Ibadan",
      programme: "M.Sc. Statistics",
      fieldOfStudy: "Statistics",
      graduationYear: 2020,
      teachingExperienceYears: 4,
    },
    academicSpecialization: {
      facultyIds: ["fac-sciences"],
      departmentIds: ["dep-statistics"],
      courseIds: ["crs-probability", "crs-statistical-inference", "crs-regression-analysis", "crs-statistics-intro"],
      undergradLevels: ["100 Level", "200 Level", "300 Level"],
    },
  },
  {
    slug: "tobenna-nwachukwu",
    name: "Tobenna Nwachukwu",
    subject: "Economics",
    subjectTitle: "Economics Tutor",
    levels: ["Undergraduate"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Evenings", "Weekends"],
    modes: ["Online"],
    rating: 4.7,
    reviews: 41,
    ratingBreakdown: computeRatingBreakdown(4.7, 41),
    yearsExperience: 3,
    price: 3000,
    availableToday: false,
    bio: "I help Business and Economics undergraduates master micro/macroeconomics and econometrics.",
    teachingApproach: "Real-world case studies paired with past questions and structured problem sets.",
    location: "Abuja, Nigeria",
    education: "B.Sc. Economics, University of Abuja",
    responseTime: "Usually responds in a few hours",
    lessonsTaught: 95,
    repeatStudentsPct: 76,
    memberSince: "March 2022",
    reviewList: buildReviews(32, 41),
    learningStyles: ["Discussion-based", "Exam-focused"],
    image: teacherPhotos[2],
    supportTypes: ["tutoring", "assignment-support"],
    qualification: {
      highestQualification: "Bachelor's",
      status: "Completed",
      institution: "University of Abuja",
      programme: "B.Sc. Economics",
      fieldOfStudy: "Economics",
      graduationYear: 2021,
      teachingExperienceYears: 3,
    },
    academicSpecialization: {
      facultyIds: ["fac-business"],
      departmentIds: ["dep-economics"],
      courseIds: ["crs-microeconomics", "crs-macroeconomics", "crs-econometrics"],
      undergradLevels: ["100 Level", "200 Level", "300 Level", "400 Level"],
    },
  },
  {
    slug: "dr-ifeanyi-obiora",
    name: "Dr. Ifeanyi Obiora",
    subject: "Computer Science",
    subjectTitle: "PhD Computer Science",
    levels: ["Masters", "PhD"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekdays", "Evenings"],
    modes: ["Online"],
    rating: 4.9,
    reviews: 58,
    ratingBreakdown: computeRatingBreakdown(4.9, 58),
    yearsExperience: 7,
    price: 6000,
    availableToday: true,
    bio: "PhD Computer Science, researching Artificial Intelligence, Machine Learning and Data Science. I support Masters and PhD students with research assistance, data analysis and literature reviews.",
    teachingApproach: "I work from your research question outward, clarifying scope, methodology and analysis approach before diving into the literature or the data.",
    location: "Ibadan, Nigeria",
    education: "PhD Computer Science, University of Ibadan",
    responseTime: "Usually responds in a few hours",
    lessonsTaught: 140,
    repeatStudentsPct: 90,
    memberSince: "September 2019",
    reviewList: buildReviews(33, 58),
    learningStyles: ["Research-focused", "One-on-one"],
    image: teacherPhotos[0],
    supportTypes: ["tutoring", "research-support", "thesis-dissertation-support"],
    qualification: {
      highestQualification: "PhD",
      status: "Completed",
      institution: "University of Ibadan",
      programme: "PhD Computer Science",
      fieldOfStudy: "Computer Science",
      researchArea: "Artificial Intelligence",
      graduationYear: 2021,
      teachingExperienceYears: 7,
      researchExperience: "6 years researching AI/ML with 3 peer-reviewed publications.",
    },
    academicSpecialization: {
      fieldIds: ["field-computer-science"],
      researchAreaIds: ["area-ai", "area-ml", "area-data-science"],
      serviceIds: ["svc-research-assistant", "svc-data-analysis", "svc-literature-review", "svc-dissertation-support"],
    },
    mastersVerification: "Verified",
    phdVerification: "Verified",
  },
  {
    slug: "grace-nnadi",
    name: "Grace Nnadi",
    subject: "Education",
    subjectTitle: "MSc Candidate, Education",
    levels: ["Masters"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekends", "Evenings"],
    modes: ["Online"],
    rating: 4.7,
    reviews: 22,
    ratingBreakdown: computeRatingBreakdown(4.7, 22),
    yearsExperience: 2,
    price: 4500,
    availableToday: false,
    bio: "MSc candidate in Education, supporting Masters students with thesis structure, academic writing and literature reviews.",
    teachingApproach: "Chapter-by-chapter thesis coaching with clear milestones and honest feedback on writing clarity.",
    location: "Lagos, Nigeria",
    education: "MSc Education (in progress), University of Lagos",
    responseTime: "Usually responds within a day",
    lessonsTaught: 40,
    repeatStudentsPct: 70,
    memberSince: "June 2023",
    reviewList: buildReviews(34, 22),
    learningStyles: ["Discussion-based", "One-on-one"],
    image: teacherPhotos[1],
    supportTypes: ["tutoring", "thesis-dissertation-support", "academic-writing", "research-support"],
    qualification: {
      highestQualification: "Master's",
      status: "Currently In Progress",
      institution: "University of Lagos",
      programme: "MSc Education",
      fieldOfStudy: "Education",
      expectedGraduationYear: 2026,
      teachingExperienceYears: 2,
    },
    academicSpecialization: {
      fieldIds: ["field-education"],
      serviceIds: ["svc-thesis-support", "svc-academic-writing", "svc-literature-review"],
    },
    mastersVerification: "Verified",
    phdVerification: "Unverified",
  },
  {
    slug: "dr-emeka-nnaji",
    name: "Dr. Emeka Nnaji",
    subject: "Computer Science",
    subjectTitle: "PhD Computer Science",
    levels: ["PhD", "Masters"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekdays", "Weekends"],
    modes: ["Online"],
    rating: 4.9,
    reviews: 73,
    ratingBreakdown: computeRatingBreakdown(4.9, 73),
    yearsExperience: 9,
    price: 7000,
    availableToday: true,
    bio: "PhD Computer Science with a research focus on Artificial Intelligence, Machine Learning and Data Science. I support PhD and Masters students end-to-end, from proposal to defense.",
    teachingApproach: "Structured research methodology guidance paired with hands-on data analysis support.",
    location: "Lagos, Nigeria",
    education: "PhD Computer Science, Covenant University",
    responseTime: "Usually responds in a few hours",
    lessonsTaught: 205,
    repeatStudentsPct: 92,
    memberSince: "March 2018",
    reviewList: buildReviews(35, 73),
    learningStyles: ["Research-focused", "One-on-one"],
    image: teacherPhotos[2],
    supportTypes: ["tutoring", "research-support"],
    qualification: {
      highestQualification: "PhD",
      status: "Completed",
      institution: "Covenant University",
      programme: "PhD Computer Science",
      fieldOfStudy: "Computer Science",
      researchArea: "Artificial Intelligence",
      graduationYear: 2020,
      teachingExperienceYears: 9,
      researchExperience: "9 years researching AI/ML, supervised 12 postgraduate research projects.",
    },
    academicSpecialization: {
      fieldIds: ["field-computer-science"],
      researchAreaIds: ["area-ai", "area-ml", "area-data-science"],
      serviceIds: ["svc-research-assistant", "svc-research-methodology", "svc-data-analysis"],
    },
    mastersVerification: "Verified",
    phdVerification: "Verified",
  },
  {
    slug: "chukwuemeka-aniagolu",
    name: "Chukwuemeka Aniagolu",
    subject: "Social Sciences",
    subjectTitle: "PhD Candidate, Social Sciences",
    levels: ["PhD"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Evenings", "Weekends"],
    modes: ["Online"],
    rating: 4.8,
    reviews: 19,
    ratingBreakdown: computeRatingBreakdown(4.8, 19),
    yearsExperience: 4,
    price: 5500,
    availableToday: false,
    bio: "PhD candidate in Social Sciences specializing in quantitative research methodology and statistical analysis.",
    teachingApproach: "I help you design a defensible methodology first, then work through the statistical analysis together.",
    location: "Nsukka, Nigeria",
    education: "PhD Social Sciences (in progress), University of Nigeria, Nsukka",
    responseTime: "Usually responds within a day",
    lessonsTaught: 55,
    repeatStudentsPct: 80,
    memberSince: "February 2022",
    reviewList: buildReviews(36, 19),
    learningStyles: ["Research-focused", "Practical"],
    image: teacherPhotos[0],
    supportTypes: ["tutoring", "research-support"],
    qualification: {
      highestQualification: "PhD",
      status: "Currently In Progress",
      institution: "University of Nigeria, Nsukka",
      programme: "PhD Social Sciences",
      fieldOfStudy: "Social Sciences",
      researchArea: "Quantitative Research Methods",
      expectedGraduationYear: 2027,
      teachingExperienceYears: 4,
    },
    academicSpecialization: {
      fieldIds: ["field-social-sciences"],
      researchAreaIds: ["area-quant-methods-ss"],
      serviceIds: ["svc-research-methodology", "svc-quantitative-research", "svc-statistical-analysis"],
    },
    mastersVerification: "Verified",
    phdVerification: "Verified",
  },
  {
    // Demonstrates the eligibility gate: a Bachelor's-only tutor with no
    // verified graduate qualification must never surface in Masters/PhD
    // results, even though he has tagged Computer Science/AI expertise.
    slug: "peter-adebayo-bsc",
    name: "Peter Adebayo",
    subject: "Computer Science",
    subjectTitle: "Computer Science Graduate",
    levels: ["Undergraduate"],
    tutorType: "Private Tutor",
    languages: ["English"],
    nativeLanguage: "English",
    availability: ["Weekdays"],
    modes: ["Online"],
    rating: 4.6,
    reviews: 12,
    ratingBreakdown: computeRatingBreakdown(4.6, 12),
    yearsExperience: 1,
    price: 2500,
    availableToday: true,
    bio: "Recent Computer Science graduate helping undergraduates with programming fundamentals.",
    teachingApproach: "Hands-on coding practice with beginner-friendly explanations.",
    location: "Lagos, Nigeria",
    education: "B.Sc. Computer Science, University of Lagos",
    responseTime: "Usually responds within a day",
    lessonsTaught: 18,
    repeatStudentsPct: 60,
    memberSince: "January 2024",
    reviewList: buildReviews(37, 12),
    learningStyles: ["Practical"],
    image: teacherPhotos[2],
    supportTypes: ["tutoring", "assignment-support"],
    qualification: {
      highestQualification: "Bachelor's",
      status: "Completed",
      institution: "University of Lagos",
      programme: "B.Sc. Computer Science",
      fieldOfStudy: "Computer Science",
      graduationYear: 2023,
      teachingExperienceYears: 1,
    },
    academicSpecialization: {
      fieldIds: ["field-computer-science"],
      researchAreaIds: ["area-ai"],
      serviceIds: ["svc-research-assistant"],
    },
    mastersVerification: "Unverified",
    phdVerification: "Unverified",
  },
];

export const tutorListings: TutorListing[] = [...generatedTutorListings, ...academicSpecialistTutors];

export function getTutorBySlug(slug: string): TutorListing | undefined {
  return tutorListings.find((t) => t.slug === slug);
}

// Discovery Sessions and group class submissions key their tutor by display
// name rather than slug — this is the reverse lookup real conflict-checking
// needs to compare a name-keyed record against a slug-keyed PrivateLesson.
export function getTutorByName(name: string): TutorListing | undefined {
  return tutorListings.find((t) => t.name === name);
}

export function getSimilarTutors(tutor: TutorListing, count = 5): TutorListing[] {
  return tutorListings
    .filter((t) => t.slug !== tutor.slug && t.subject === tutor.subject)
    .concat(tutorListings.filter((t) => t.slug !== tutor.slug && t.subject !== tutor.subject))
    .slice(0, count);
}

// --- Homepage discovery-feed derivations ---
// Pure filters/sorts over the same tutorListings dataset. No new mock data —
// every homepage carousel below is a different lens on the same tutors.

function byRatingDesc(a: TutorListing, b: TutorListing): number {
  return b.rating - a.rating;
}

export function getUniversityTutors(count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.levels.includes("Undergraduate"))
    .sort(byRatingDesc)
    .slice(0, count);
}

export function getExperiencedTutors(minYears = 5, count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.yearsExperience >= minYears)
    .sort((a, b) => b.yearsExperience - a.yearsExperience)
    .slice(0, count);
}

export function getAffordableTutors(maxPrice = 3000, count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.price <= maxPrice)
    .sort(byRatingDesc)
    .slice(0, count);
}

export function getAvailableTodayTutors(count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.availableToday)
    .sort(byRatingDesc)
    .slice(0, count);
}

export function getLanguageTutors(count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => (languageSubjectOptions as readonly string[]).includes(t.subject))
    .sort(byRatingDesc)
    .slice(0, count);
}

export function getWeekendTutors(count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.availability.includes("Weekends"))
    .sort(byRatingDesc)
    .slice(0, count);
}

export function getEveningTutors(count = 10): TutorListing[] {
  return tutorListings
    .filter((t) => t.availability.includes("Evenings"))
    .sort(byRatingDesc)
    .slice(0, count);
}

// Hand-curated rather than derived from any real interest metric (the app
// has no analytics/booking-volume tracking) — same "curated mock" idiom the
// rest of the site already uses for Top Rated / New badges.
export const trendingTutorSlugs: string[] = [
  "tunde-adebayo",
  "adaeze-okonkwo",
  "chioma-nwosu",
  "ifeoma-balogun",
  "oluwatobi-lawal",
  "halima-sani",
  "jean-dupont",
];

export function getTrendingTutors(count = 8): TutorListing[] {
  return trendingTutorSlugs
    .map((slug) => getTutorBySlug(slug))
    .filter((t): t is TutorListing => Boolean(t))
    .slice(0, count);
}

// Adapts the spec's "Because you viewed Mathematics tutors -> Statistics,
// Physics, Further Mathematics..." example onto real subjects that exist in
// this dataset (no fabricated subjects like "WAEC Mathematics").
export const relatedSubjectsMap: Record<string, string[]> = {
  Mathematics: ["Further Mathematics", "Physics", "Chemistry"],
  "Further Mathematics": ["Mathematics", "Physics"],
  Physics: ["Mathematics", "Chemistry", "Further Mathematics"],
  Chemistry: ["Physics", "Biology", "Mathematics"],
  Biology: ["Chemistry", "Physics"],
  English: ["Literature", "Government"],
  Literature: ["English", "Government"],
  Government: ["Literature", "English"],
  French: ["Spanish", "German"],
  Spanish: ["French", "Portuguese"],
  German: ["French", "Mandarin"],
  Portuguese: ["Spanish", "French"],
  Arabic: ["Hausa", "English"],
  Igbo: ["Yoruba", "Hausa"],
  Yoruba: ["Igbo", "Hausa"],
  Hausa: ["Yoruba", "Igbo"],
  Mandarin: ["German", "French"],
  "Computer Engineering": ["Statistics", "Mathematics"],
  Statistics: ["Mathematics", "Economics"],
  Economics: ["Statistics", "Mathematics"],
  "Computer Science": ["Statistics", "Mathematics"],
};

export function getRelatedSubjectTutors(subject: string, excludeSlug?: string, count = 10): TutorListing[] {
  const related = relatedSubjectsMap[subject] ?? [];
  return tutorListings
    .filter((t) => t.slug !== excludeSlug && (related.includes(t.subject) || t.subject === subject))
    .sort(byRatingDesc)
    .slice(0, count);
}

// Discovery Class "not a good fit" recommendations — deliberately STRICT,
// unlike getSimilarTutors/getRelatedSubjectTutors above, which both
// backfill with tutors outside the requested subject once the exact match
// runs short. A student who booked a Physics Discovery Class must never see
// English tutors just because they're highly rated — same subject (and,
// where given, an overlapping academic level) or nothing; the caller shows
// a real "couldn't find a match" empty state instead of a padded list.
export function getDiscoveryRecommendedTutors(subject: string, excludeTutorName: string, level?: string, count = 5): TutorListing[] {
  const bySubject = tutorListings.filter((t) => t.subject === subject && t.name !== excludeTutorName);
  const pool = level ? bySubject.filter((t) => t.levels.includes(level)) : bySubject;
  const ranked = (pool.length > 0 ? pool : bySubject).sort(byRatingDesc);
  return ranked.slice(0, count);
}

// Adapts a TutorListing into the homepage's lighter Teacher card shape.
export function tutorToTeacher(t: TutorListing): Teacher {
  return {
    name: t.name,
    subject: t.subjectTitle,
    rating: String(t.rating),
    reviews: t.reviews,
    price: t.price,
    image: t.image,
    yearsExperience: t.yearsExperience,
    availableToday: t.availableToday,
    modes: t.modes,
  };
}
