export const currentRoleOptions = [
  "University student",
  "University graduate",
  "Certified teacher",
  "Working professional",
  "Retired educator",
];

export const educationLevelOptions = [
  "Secondary school",
  "Undergraduate degree",
  "Master's degree",
  "PhD / Doctorate",
];

export const experienceOptions = [
  "Less than 1 year",
  "1 – 2 years",
  "3 – 5 years",
  "6 – 10 years",
  "10+ years",
];

export const teachingStyleOptions = [
  "Interactive",
  "Discussion-based",
  "Practical",
  "Project-based",
  "Exam-focused",
  "One-on-one",
];

export const responseTimeOptions = [
  { value: "Within 1 hour", description: "Usually responds within 1 hour" },
  { value: "Within 6 hours", description: "Usually responds within 6 hours" },
  { value: "Within 24 hours", description: "Usually responds within 24 hours" },
];


// A tutor's expertise for one selected academic level — kept distinct by
// category (never a flat generic "subject" string) so the frontend data
// shape can eventually be split per-category on the backend: Subject,
// Course, Discipline, Specialization, Research Area, Language, Exam, Exam
// Expertise. `exams` is only meaningful when level === "Exams".
export type ExpertiseCategory = "subject" | "examExpertise" | "language" | "course" | "specialization" | "researchArea";

export interface LevelExpertise {
  level: string;
  category: ExpertiseCategory;
  items: string[];
  exams?: string[];
}

// Masters/PhD tutoring eligibility (see src/lib/academic-matching.ts) is
// gated on these two fields plus admin verification — never on the
// "Academic Levels You Teach" toggle alone.
export const highestQualificationOptions = ["Secondary School", "Diploma", "Bachelor's", "Master's", "PhD"];
export const academicStatusOptions = ["Completed", "Currently In Progress"];

export const teachingFormatOptions = ["Private", "Group"];

export const sessionTypeOptions = [
  "1-on-1 Lessons",
  "Group Classes",
  "Homework Help",
  "Exam Preparation",
  "Mentorship",
];

export const classDurationOptions = ["30 Minutes", "45 Minutes", "60 Minutes", "90 Minutes", "120 Minutes"];

export const bookingPreferenceOptions = [
  { value: "Book Instantly", description: "Students can book and pay instantly" },
  { value: "Send Pre-approval Request", description: "Students send you a request before booking" },
  { value: "I'll approve each booking", description: "You approve all booking requests" },
];

export const cancellationPolicyOptions = [
  { value: "Flexible", description: "Cancel up to 24 hours before the session." },
  { value: "Moderate", description: "Cancel up to 48 hours before the session." },
  { value: "Strict", description: "No refund within 24 hours." },
];

export const teachingResourceOptions = [
  "Homework",
  "Practice Tests",
  "Notes",
  "Recorded Sessions",
  "Assignments",
  "Progress Reports",
  "Other",
];

export const dayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const idTypeOptions = [
  "National ID (NIN)",
  "International Passport",
  "Driver's License",
  "Voter's Card",
];

export const qualificationOptions = [
  "SSCE / WAEC",
  "OND / NCE",
  "HND / B.Sc.",
  "M.Sc. / M.A.",
  "PhD",
];

export const relationshipOptions = ["Parent", "Sibling", "Spouse", "Friend", "Other"];

export const notificationPreferenceOptions = [
  "Booking notifications",
  "Payment notifications",
  "Student messages",
  "Marketing emails",
  "Weekly earnings summary",
];

export const communityGuidelines = [
  { key: "tos", label: "I agree to Ensena's Terms of Service" },
  { key: "privacy", label: "I agree to the Privacy Policy" },
  { key: "code", label: "I agree to the Tutor Code of Conduct" },
  {
    key: "accuracy",
    label:
      "I understand that submitting false information may result in account suspension.",
  },
];

export const whatHappensNext = [
  "Your application enters the verification queue.",
  "Our team reviews your identity and qualifications.",
  "You'll receive an email once approved.",
  "Your profile goes live and students can begin booking sessions.",
];

export const verificationBenefits = [
  "Get the Verified Tutor badge",
  "Rank higher in search results",
  "Build trust with students and parents",
  "Unlock instant bookings",
  "Qualify for featured tutor promotions",
];

export interface TimeRange {
  start: string;
  end: string;
}

export interface AvailabilityDay {
  enabled: boolean;
  ranges: TimeRange[];
}

export interface WorkExperience {
  institution: string;
  role: string;
  from: string;
  to: string;
  current: boolean;
}

export interface TutorSignupForm {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;

  profilePhotoName: string | null;
  headline: string;
  bio: string;
  languagesSpoken: string[];
  nationality: string;
  country: string;
  stateCity: string;
  yearsExperience: string;
  teachingStyles: string[];
  introVideoName: string | null;
  responseTimeGoal: string;

  levels: string[];
  levelExpertise: LevelExpertise[];
  teachingFormats: string[];

  // Undergraduate specialization — only meaningful when levels includes "Undergraduate".
  academicFacultyIds: string[];
  academicDepartmentIds: string[];
  academicCourseIds: string[];
  undergradLevelsTaught: string[];

  // Masters/PhD specialization — only meaningful when levels includes "Masters"/"PhD".
  researchFieldIds: string[];
  researchAreaIds: string[];
  researchServiceIds: string[];

  // Structured graduate qualification profile — required before a tutor can
  // be considered eligible to offer Masters/PhD services (subject to admin
  // verification; see src/lib/academic-matching.ts).
  highestQualification: string;
  academicStatus: string;
  gradInstitution: string;
  gradProgramme: string;
  gradFieldOfStudy: string;
  gradDepartment: string;
  gradResearchArea: string;
  graduationYear: string;
  expectedGraduationYear: string;
  gradTeachingExperienceYears: string;
  gradResearchExperienceNotes: string;
  qualificationDocumentNames: string[];

  teachingModes: string[];
  sessionTypes: string[];
  oneOnOnePrice: string;
  groupPrice: string;
  maxGroupStudents: string;
  classDurations: string[];
  teachingLanguages: string[];
  availability: Record<(typeof dayLabels)[number], AvailabilityDay>;
  bookingPreferences: string[];
  cancellationPolicy: string;
  trialLessonEnabled: boolean;
  trialPrice: string;
  teachingResources: string[];
  additionalNotes: string;

  idType: string;
  idFileName: string | null;
  selfieFileName: string | null;
  qualification: string;
  certificateFileName: string | null;
  certificationFileNames: string[];
  hasTeachingExperience: boolean | null;
  workExperiences: WorkExperience[];
  backgroundCheckConsent: boolean;
  teachingSampleFileName: string | null;
  introLessonVideoFileName: string | null;
  linkedin: string;
  website: string;
  youtube: string;
  github: string;

  bankName: string;
  accountNumber: string;
  accountName: string;
  taxCountry: string;
  tin: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  notificationPreferences: string[];
  guidelinesAccepted: Record<string, boolean>;
}

function defaultAvailability(): Record<(typeof dayLabels)[number], AvailabilityDay> {
  const weekday: AvailabilityDay = { enabled: true, ranges: [{ start: "10:00", end: "18:00" }] };
  const saturday: AvailabilityDay = { enabled: true, ranges: [{ start: "09:00", end: "14:00" }] };
  const sunday: AvailabilityDay = { enabled: false, ranges: [{ start: "09:00", end: "14:00" }] };
  return {
    Monday: { enabled: weekday.enabled, ranges: [...weekday.ranges] },
    Tuesday: { enabled: weekday.enabled, ranges: [...weekday.ranges] },
    Wednesday: { enabled: weekday.enabled, ranges: [...weekday.ranges] },
    Thursday: { enabled: weekday.enabled, ranges: [...weekday.ranges] },
    Friday: { enabled: weekday.enabled, ranges: [...weekday.ranges] },
    Saturday: saturday,
    Sunday: sunday,
  };
}

export function createDefaultTutorSignupForm(): TutorSignupForm {
  return {
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",

    profilePhotoName: null,
    headline: "",
    bio: "",
    languagesSpoken: ["English"],
    nationality: "",
    country: "Nigeria",
    stateCity: "",
    yearsExperience: "",
    teachingStyles: [],
    introVideoName: null,
    responseTimeGoal: responseTimeOptions[0].value,

    levels: [],
    levelExpertise: [],
    teachingFormats: [],

    academicFacultyIds: [],
    academicDepartmentIds: [],
    academicCourseIds: [],
    undergradLevelsTaught: [],

    researchFieldIds: [],
    researchAreaIds: [],
    researchServiceIds: [],

    highestQualification: "",
    academicStatus: "",
    gradInstitution: "",
    gradProgramme: "",
    gradFieldOfStudy: "",
    gradDepartment: "",
    gradResearchArea: "",
    graduationYear: "",
    expectedGraduationYear: "",
    gradTeachingExperienceYears: "",
    gradResearchExperienceNotes: "",
    qualificationDocumentNames: [],

    teachingModes: ["Online"],
    sessionTypes: [],
    oneOnOnePrice: "",
    groupPrice: "",
    maxGroupStudents: "10",
    classDurations: [],
    teachingLanguages: ["English"],
    availability: defaultAvailability(),
    bookingPreferences: [],
    cancellationPolicy: cancellationPolicyOptions[0].value,
    trialLessonEnabled: false,
    trialPrice: "",
    teachingResources: [],
    additionalNotes: "",

    idType: "",
    idFileName: null,
    selfieFileName: null,
    qualification: "",
    certificateFileName: null,
    certificationFileNames: [],
    hasTeachingExperience: null,
    workExperiences: [],
    backgroundCheckConsent: false,
    teachingSampleFileName: null,
    introLessonVideoFileName: null,
    linkedin: "",
    website: "",
    youtube: "",
    github: "",

    bankName: "",
    accountNumber: "",
    accountName: "",
    taxCountry: "Nigeria",
    tin: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    notificationPreferences: [...notificationPreferenceOptions],
    guidelinesAccepted: {},
  };
}
