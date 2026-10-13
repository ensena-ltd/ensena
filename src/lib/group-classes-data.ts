import { academicLevels, teacherPhotos } from "@/lib/data";
import { slugify } from "@/lib/tutors";
import type { SupportTypeId } from "@/lib/academic-support-types";

export const academicLevelFilterOptions = academicLevels.map((l) => l.label);

export const subjectFilterOptions = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Accounting",
  "Further Mathematics",
  "Government",
  "Literature",
  "French",
];

export const classSizeOptions = [
  { label: "Up to 5 students", max: 5 },
  { label: "6 – 10 students", max: 10 },
  { label: "11 – 20 students", max: 20 },
  { label: "20+ students", max: Infinity },
];

export const availabilityFilterOptions = ["Today", "This Week", "Weekend"] as const;

export const sortOptions = [
  "Popular",
  "Price: Low to High",
  "Price: High to Low",
  "Highest Rated",
  "Seats Left",
] as const;
export type GroupClassSortOption = (typeof sortOptions)[number];

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface Cohort {
  startDate: string;
  days: string;
  time: string;
  durationWeeks: number;
  seatsTotal: number;
  seatsFilled: number;
}

export interface PricingPlans {
  perSession: number;
  weekly: { price: number; savePct: number };
  fullCourse: { price: number; savePct: number };
}

export interface GroupClassListing {
  slug: string;
  title: string;
  description: string;
  levelBadge: string;
  gradeLevel: string;
  subject: string;
  // What kind of help this class offers — same taxonomy and same "explicit
  // declaration required" rule as TutorListing.supportTypes; a class never
  // qualifies for a support type just because of its subject/level.
  supportTypes: SupportTypeId[];
  days: string;
  time: string;
  price: number;
  rating: number;
  reviews: number;
  enrolled: number;
  maxSeats: number;
  mode: "Online" | "In-person";
  image: string;
  ringColor: string;
  badgeColor: string;
  tutorName: string;
  language: string;
  difficulty: DifficultyLevel;
  completionRate: number;
  learningOutcomes: string[];
  outcomeSentence: string;
  cohorts: Cohort[];
  pricing: PricingPlans;
}

interface Seed {
  title: string;
  description: string;
  levelBadge: string;
  subject: string;
  days: string;
  time: string;
  price: number;
  rating: number;
  reviews: number;
  enrolled: number;
  maxSeats: number;
  mode: "Online" | "In-person";
  ringColor: string;
  badgeColor: string;
  tutorName: string;
  gender: "m" | "f";
  language?: string;
}

const seeds: Seed[] = [
  { title: "Mathematics Excellence", description: "Build strong math skills step by step", levelBadge: "Secondary", subject: "Mathematics", days: "Mon, Wed, Fri", time: "6:00 PM – 7:30 PM", price: 1500, rating: 4.98, reviews: 125, enrolled: 8, maxSeats: 10, mode: "Online", ringColor: "#6C63FF", badgeColor: "#EEF2FF", tutorName: "Tunde Bakare", gender: "m" },
  { title: "JAMB Physics Crash Class", description: "Past questions, concepts & speed", levelBadge: "JAMB / UTME", subject: "Physics", days: "Tue, Thu, Sat", time: "7:00 PM – 8:30 PM", price: 2000, rating: 4.97, reviews: 98, enrolled: 6, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Chidi Nwosu", gender: "m" },
  { title: "Primary English Club", description: "Reading, grammar & vocabulary", levelBadge: "Primary", subject: "English Language", days: "Mon, Wed", time: "4:00 PM – 5:00 PM", price: 1000, rating: 4.95, reviews: 74, enrolled: 9, maxSeats: 10, mode: "Online", ringColor: "#E58A2A", badgeColor: "#FFF3E0", tutorName: "Funke Ogunleye", gender: "f" },
  { title: "WAEC Chemistry Masterclass", description: "Ace your exams with confidence", levelBadge: "WAEC / NECO", subject: "Chemistry", days: "Tue, Thu, Sat", time: "5:00 PM – 6:30 PM", price: 1800, rating: 4.96, reviews: 112, enrolled: 7, maxSeats: 10, mode: "Online", ringColor: "#2F9BE0", badgeColor: "#E9F5FF", tutorName: "Segun Alabi", gender: "m" },
  { title: "Calculus I – Group Class", description: "Limits, Derivatives & Applications", levelBadge: "Undergraduate", subject: "Further Mathematics", days: "Mon, Wed", time: "6:00 PM – 7:30 PM", price: 2500, rating: 4.99, reviews: 63, enrolled: 5, maxSeats: 15, mode: "Online", ringColor: "#9B6BD6", badgeColor: "#FDEAFB", tutorName: "Amaka Nnaji", gender: "f" },
  { title: "English Language Mastery", description: "Grammar, comprehension & more", levelBadge: "Secondary", subject: "English Language", days: "Tue, Thu, Sat", time: "6:30 PM – 8:00 PM", price: 1400, rating: 4.94, reviews: 87, enrolled: 10, maxSeats: 10, mode: "Online", ringColor: "#6C63FF", badgeColor: "#EEF2FF", tutorName: "Ibrahim Yakubu", gender: "m" },
  { title: "JAMB Mathematics Pro", description: "Shortcuts, tricks & past questions", levelBadge: "JAMB / UTME", subject: "Mathematics", days: "Mon – Fri", time: "8:00 PM – 9:30 PM", price: 2000, rating: 4.97, reviews: 141, enrolled: 4, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Chinedu Okoro", gender: "m" },
  { title: "WAEC Biology Success", description: "Understand, practice, excel", levelBadge: "WAEC / NECO", subject: "Biology", days: "Wed, Fri, Sun", time: "5:30 PM – 7:00 PM", price: 1600, rating: 4.95, reviews: 65, enrolled: 6, maxSeats: 10, mode: "Online", ringColor: "#2F9BE0", badgeColor: "#E9F5FF", tutorName: "Blessing Yusuf", gender: "f" },
  { title: "Primary Math Boosters", description: "Fun & effective math learning", levelBadge: "Primary", subject: "Mathematics", days: "Mon, Wed, Fri", time: "3:30 PM – 4:30 PM", price: 900, rating: 4.93, reviews: 58, enrolled: 8, maxSeats: 10, mode: "Online", ringColor: "#E58A2A", badgeColor: "#FFF3E0", tutorName: "Femi Adekunle", gender: "m" },
  { title: "Economics for JAMB", description: "Core theories & past questions", levelBadge: "JAMB / UTME", subject: "Economics", days: "Tue, Thu", time: "5:00 PM – 6:30 PM", price: 1800, rating: 4.9, reviews: 44, enrolled: 3, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Aisha Mohammed", gender: "f" },
  { title: "Financial Accounting Basics", description: "Ledgers, journals & final accounts", levelBadge: "Undergraduate", subject: "Accounting", days: "Mon, Wed", time: "7:00 PM – 8:30 PM", price: 2200, rating: 4.92, reviews: 39, enrolled: 9, maxSeats: 12, mode: "Online", ringColor: "#9B6BD6", badgeColor: "#FDEAFB", tutorName: "Victor Nwachukwu", gender: "m" },
  { title: "WAEC Government Prep", description: "Civics & government made clear", levelBadge: "WAEC / NECO", subject: "Government", days: "Sat, Sun", time: "10:00 AM – 11:30 AM", price: 1500, rating: 4.88, reviews: 31, enrolled: 5, maxSeats: 10, mode: "Online", ringColor: "#2F9BE0", badgeColor: "#E9F5FF", tutorName: "Halima Garba", gender: "f" },
  { title: "Literature Study Circle", description: "Set texts, essays & analysis", levelBadge: "Secondary", subject: "Literature", days: "Tue, Thu", time: "6:00 PM – 7:00 PM", price: 1300, rating: 4.91, reviews: 27, enrolled: 7, maxSeats: 10, mode: "Online", ringColor: "#6C63FF", badgeColor: "#EEF2FF", tutorName: "Emeka Chukwu", gender: "m" },
  { title: "Masters Research Methods", description: "Design, data & analysis", levelBadge: "Masters", subject: "Further Mathematics", days: "Wed", time: "7:00 PM – 9:00 PM", price: 3000, rating: 4.96, reviews: 21, enrolled: 4, maxSeats: 15, mode: "Online", ringColor: "#B5546B", badgeColor: "#FFF0EE", tutorName: "Ngozi Okonkwo", gender: "f" },
  { title: "PhD Statistics Workshop", description: "Advanced statistical methods", levelBadge: "PhD", subject: "Further Mathematics", days: "Sat", time: "10:00 AM – 1:00 PM", price: 3500, rating: 4.99, reviews: 14, enrolled: 3, maxSeats: 10, mode: "Online", ringColor: "#B5546B", badgeColor: "#FFF0EE", tutorName: "Sadiq Umar", gender: "m" },
  { title: "NECO Physics Bootcamp", description: "Formulas, practicals & speed", levelBadge: "WAEC / NECO", subject: "Physics", days: "Mon, Wed, Fri", time: "4:00 PM – 5:30 PM", price: 1700, rating: 4.93, reviews: 52, enrolled: 8, maxSeats: 10, mode: "Online", ringColor: "#2F9BE0", badgeColor: "#E9F5FF", tutorName: "Kunle Adeyemi", gender: "m" },
  { title: "Undergraduate Chemistry Lab", description: "Organic & inorganic fundamentals", levelBadge: "Undergraduate", subject: "Chemistry", days: "Tue, Thu", time: "5:00 PM – 6:30 PM", price: 2400, rating: 4.9, reviews: 33, enrolled: 6, maxSeats: 12, mode: "Online", ringColor: "#9B6BD6", badgeColor: "#FDEAFB", tutorName: "Grace Effiong", gender: "f" },
  { title: "JAMB Biology Fast Track", description: "High-yield topics for JAMB", levelBadge: "JAMB / UTME", subject: "Biology", days: "Mon, Wed, Fri", time: "6:00 PM – 7:00 PM", price: 1900, rating: 4.94, reviews: 71, enrolled: 9, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Yusuf Danladi", gender: "m" },
  { title: "Secondary Accounting Basics", description: "Intro to bookkeeping & accounts", levelBadge: "Secondary", subject: "Accounting", days: "Sat", time: "11:00 AM – 1:00 PM", price: 1200, rating: 4.85, reviews: 19, enrolled: 4, maxSeats: 10, mode: "Online", ringColor: "#6C63FF", badgeColor: "#EEF2FF", tutorName: "Fatima Sule", gender: "f" },
  { title: "WAEC English Writing Clinic", description: "Essays, letters & comprehension", levelBadge: "WAEC / NECO", subject: "English Language", days: "Tue, Thu, Sat", time: "5:00 PM – 6:00 PM", price: 1400, rating: 4.92, reviews: 66, enrolled: 10, maxSeats: 10, mode: "Online", ringColor: "#2F9BE0", badgeColor: "#E9F5FF", tutorName: "Peter Adeoye", gender: "m" },
  { title: "Primary Science Explorers", description: "Hands-on science for young minds", levelBadge: "Primary", subject: "Biology", days: "Mon, Wed", time: "3:00 PM – 4:00 PM", price: 900, rating: 4.9, reviews: 41, enrolled: 8, maxSeats: 10, mode: "Online", ringColor: "#E58A2A", badgeColor: "#FFF3E0", tutorName: "Ronke Fashola", gender: "f" },
  { title: "Undergraduate Economics Seminar", description: "Micro & macro fundamentals", levelBadge: "Undergraduate", subject: "Economics", days: "Wed, Fri", time: "6:30 PM – 8:00 PM", price: 2300, rating: 4.89, reviews: 28, enrolled: 5, maxSeats: 15, mode: "Online", ringColor: "#9B6BD6", badgeColor: "#FDEAFB", tutorName: "Chinedu Okoro", gender: "m" },
  { title: "Masters Government & Policy", description: "Governance, policy & analysis", levelBadge: "Masters", subject: "Government", days: "Sun", time: "2:00 PM – 4:00 PM", price: 2800, rating: 4.93, reviews: 17, enrolled: 3, maxSeats: 10, mode: "Online", ringColor: "#B5546B", badgeColor: "#FFF0EE", tutorName: "Zainab Bello", gender: "f" },
  { title: "JAMB Literature Review", description: "Set texts & exam technique", levelBadge: "JAMB / UTME", subject: "Literature", days: "Mon, Thu", time: "5:30 PM – 6:30 PM", price: 1600, rating: 4.91, reviews: 36, enrolled: 6, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Sadiq Umar", gender: "m" },
  { title: "French Conversation for Beginners", description: "Speak French confidently in everyday situations", levelBadge: "Secondary", subject: "French", days: "Mon, Wed", time: "6:00 PM – 7:00 PM", price: 1500, rating: 4.98, reviews: 215, enrolled: 6, maxSeats: 10, mode: "Online", ringColor: "#6C63FF", badgeColor: "#EEF2FF", tutorName: "Adaeze Okonkwo", gender: "f", language: "French" },
  { title: "Spanish Conversation Club", description: "Practice everyday Spanish in a relaxed group setting", levelBadge: "All Levels", subject: "Spanish", days: "Ongoing", time: "6:30 PM – 7:30 PM", price: 1200, rating: 4.9, reviews: 58, enrolled: 7, maxSeats: 8, mode: "Online", ringColor: "#E58A2A", badgeColor: "#FFF3E0", tutorName: "Maria Garcia", gender: "f", language: "Spanish" },
  { title: "Yoruba for Beginners", description: "Build everyday Yoruba speaking confidence", levelBadge: "A1", subject: "Yoruba", days: "Mon, Wed, Fri", time: "5:00 PM – 6:00 PM", price: 900, rating: 4.85, reviews: 34, enrolled: 5, maxSeats: 10, mode: "Online", ringColor: "#1FA971", badgeColor: "#E9FBF1", tutorName: "Adekunle Ojo", gender: "m", language: "Yoruba" },
];

const outcomesBySubject: Record<string, string[]> = {
  French: ["Speaking", "Listening", "Grammar", "Vocabulary", "Weekly Assignments"],
  Mathematics: ["Problem Solving", "Past Questions", "Mental Math", "Weekly Assignments"],
  "Further Mathematics": ["Advanced Problem Solving", "Proofs", "Past Questions", "Weekly Assignments"],
  "English Language": ["Reading", "Writing", "Grammar", "Comprehension", "Weekly Assignments"],
  Physics: ["Core Concepts", "Practicals", "Past Questions", "Weekly Assignments"],
  Chemistry: ["Core Concepts", "Practicals", "Past Questions", "Weekly Assignments"],
  Biology: ["Core Concepts", "Diagrams", "Past Questions", "Weekly Assignments"],
  Economics: ["Core Theories", "Graphs & Analysis", "Past Questions", "Weekly Assignments"],
  Accounting: ["Bookkeeping", "Ledgers & Journals", "Final Accounts", "Weekly Assignments"],
  Government: ["Civics", "Governance Structures", "Past Questions", "Weekly Assignments"],
  Literature: ["Close Reading", "Essay Writing", "Set Texts", "Weekly Assignments"],
};

function outcomeSentenceFor(subject: string, levelBadge: string): string {
  if (subject === "French") {
    return "By the end of this class, you'll be able to hold a basic French conversation.";
  }
  return `By the end of this class, you'll be confident tackling ${levelBadge} ${subject} with clear, exam-ready technique.`;
}

function difficultyFor(levelBadge: string): DifficultyLevel {
  if (["K1 – K3", "Primary"].includes(levelBadge)) return "Beginner";
  if (["Undergraduate", "Masters", "PhD"].includes(levelBadge)) return "Advanced";
  return "Intermediate";
}

// A single representative grade for each levelBadge category, so "Group
// Classes" can show/match on the specific grade a student saved at signup
// (e.g. dashboardStudent's "SSS2") rather than only the coarser exam-track
// badge. The existing seed data has one bucket per track, not per grade, so
// this picks the grade most students in that bucket would actually be in.
export function gradeLevelFor(levelBadge: string): string {
  switch (levelBadge) {
    case "Primary":
      return "Basic 5";
    case "Secondary":
      return "SSS2";
    case "WAEC / NECO":
    case "JAMB / UTME":
      return "SS3";
    case "Undergraduate":
      return "100 Level";
    case "Masters":
      return "Masters";
    case "PhD":
      return "PhD";
    default:
      return "All Levels";
  }
}

export function countSessionsPerWeek(days: string): number {
  if (days.includes("–") || days.includes("-")) return 5;
  return days.split(",").length;
}

const DAY_FULL_NAMES: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

// "Tue, Thu" -> "Tuesday & Thursday", "Mon – Fri" -> "Monday – Friday". Falls
// back to the original string for anything that isn't a recognized weekday
// abbreviation (e.g. the Spanish class's "Ongoing").
export function formatDaysFull(days: string): string {
  const isRange = days.includes("–") || days.includes("-");
  const tokens = days.split(isRange ? /[–-]/ : /,/).map((d) => d.trim()).filter(Boolean);
  const full = tokens.map((t) => DAY_FULL_NAMES[t]);
  if (full.some((t) => !t)) return days;
  if (isRange) return full.join(" – ");
  if (full.length === 1) return full[0]!;
  if (full.length === 2) return `${full[0]} & ${full[1]}`;
  return `${full.slice(0, -1).join(", ")} & ${full[full.length - 1]}`;
}

function parseClockToMinutes(label: string): number | null {
  const match = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// "6:00 PM – 7:30 PM" -> 90. Returns 0 for a time string that can't be
// parsed as a start–end clock range.
export function classDurationMinutes(time: string): number {
  const [start, end] = time.split(/[–-]/).map((s) => s.trim());
  if (!start || !end) return 0;
  const startMinutes = parseClockToMinutes(start);
  const endMinutes = parseClockToMinutes(end);
  if (startMinutes === null || endMinutes === null) return 0;
  return Math.max(0, endMinutes - startMinutes);
}

function roundTo100(value: number): number {
  return Math.round(value / 100) * 100;
}

export const FULL_COURSE_WEEKS = 8;
const WEEKLY_SAVE_PCT = 8;
const FULL_COURSE_SAVE_PCT = 15;

export function buildPricing(perSession: number, sessionsPerWeek: number): PricingPlans {
  // Each discount is applied to the plain (undiscounted) total for that
  // plan's period, not compounded on top of another plan's discount.
  const weeklyNormal = perSession * sessionsPerWeek;
  const weeklyPrice = roundTo100(weeklyNormal * (1 - WEEKLY_SAVE_PCT / 100));

  const fullCourseNormal = perSession * sessionsPerWeek * FULL_COURSE_WEEKS;
  const fullCoursePrice = roundTo100(fullCourseNormal * (1 - FULL_COURSE_SAVE_PCT / 100));

  return {
    perSession,
    weekly: { price: weeklyPrice, savePct: WEEKLY_SAVE_PCT },
    fullCourse: { price: fullCoursePrice, savePct: FULL_COURSE_SAVE_PCT },
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function firstWeekday(days: string): number {
  const token = days.split(/[,–-]/)[0].trim().slice(0, 3);
  return WEEKDAY_INDEX[token] ?? 1;
}

export function nextWeekdayDate(from: Date, targetDay: number, weeksAhead: number): Date {
  const result = new Date(from);
  const daysUntilTarget = (targetDay - result.getDay() + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilTarget + weeksAhead * 7);
  return result;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildCohorts(seed: Seed): Cohort[] {
  const today = new Date();
  const weekday = firstWeekday(seed.days);
  const variants: Array<{ weeksAhead: number; durationWeeks: number; seatsDelta: number }> = [
    { weeksAhead: 1, durationWeeks: 8, seatsDelta: 0 },
    { weeksAhead: 2, durationWeeks: 6, seatsDelta: 3 },
    { weeksAhead: 3, durationWeeks: 10, seatsDelta: -2 },
  ];

  return variants.map((variant) => ({
    startDate: toISODate(nextWeekdayDate(today, weekday, variant.weeksAhead)),
    days: seed.days,
    time: seed.time,
    durationWeeks: variant.durationWeeks,
    seatsTotal: seed.maxSeats,
    seatsFilled: Math.min(seed.maxSeats - 1, Math.max(0, seed.enrolled + variant.seatsDelta)),
  }));
}

let maleCycle = 0;
let femaleCycle = 0;

// Every class gets Tutoring plus a deterministic, varied subset of the
// coursework-support types (real variety for the new filter without
// hand-authoring each of the 24 seed rows) — Masters/PhD classes lean
// research-oriented instead, matching what those levels actually mean.
const supportTypeCycles: SupportTypeId[][] = [
  ["tutoring"],
  ["tutoring", "assignment-support"],
  ["tutoring", "assignment-support", "project-support"],
  ["tutoring", "presentation-support"],
  ["tutoring", "assignment-support", "presentation-support"],
];

function deriveGroupClassSupportTypes(levelBadge: string, index: number): SupportTypeId[] {
  if (levelBadge === "Masters" || levelBadge === "PhD") {
    return ["tutoring", "research-support", "academic-writing"];
  }
  return supportTypeCycles[index % supportTypeCycles.length];
}

export const groupClassListings: GroupClassListing[] = seeds.map((seed, index) => {
  const image =
    seed.gender === "m"
      ? teacherPhotos[maleCycle++ % 2 === 0 ? 0 : 2]
      : teacherPhotos[femaleCycle++ % 2 === 0 ? 1 : 3];

  const sessionsPerWeek = countSessionsPerWeek(seed.days);

  return {
    slug: slugify(seed.title),
    title: seed.title,
    description: seed.description,
    levelBadge: seed.levelBadge,
    gradeLevel: gradeLevelFor(seed.levelBadge),
    subject: seed.subject,
    supportTypes: deriveGroupClassSupportTypes(seed.levelBadge, index),
    days: seed.days,
    time: seed.time,
    price: seed.price,
    rating: seed.rating,
    reviews: seed.reviews,
    enrolled: seed.enrolled,
    maxSeats: seed.maxSeats,
    mode: seed.mode,
    image,
    ringColor: seed.ringColor,
    badgeColor: seed.badgeColor,
    tutorName: seed.tutorName,
    language: seed.language ?? "English",
    difficulty: difficultyFor(seed.levelBadge),
    completionRate: 85 + (seed.reviews % 12),
    learningOutcomes: outcomesBySubject[seed.subject] ?? ["Core Concepts", "Practice", "Weekly Assignments"],
    outcomeSentence: outcomeSentenceFor(seed.subject, seed.levelBadge),
    cohorts: buildCohorts(seed),
    pricing: buildPricing(seed.price, sessionsPerWeek),
  };
});

export function getGroupClassBySlug(slug: string): GroupClassListing | undefined {
  return groupClassListings.find((c) => c.slug === slug);
}

export function getSimilarGroupClasses(cls: GroupClassListing, count = 3): GroupClassListing[] {
  return groupClassListings
    .filter((c) => c.slug !== cls.slug && c.subject === cls.subject)
    .concat(groupClassListings.filter((c) => c.slug !== cls.slug && c.subject !== cls.subject))
    .slice(0, count);
}
