import {
  Briefcase,
  GraduationCap,
  MessageCircle,
  Plane,
  School,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const languageFlags: Record<string, string> = {
  French: "🇫🇷",
  Spanish: "🇪🇸",
  English: "🇬🇧",
  German: "🇩🇪",
  Mandarin: "🇨🇳",
  Arabic: "🇸🇦",
  Portuguese: "🇵🇹",
  Yoruba: "🇳🇬",
  Igbo: "🇳🇬",
  Hausa: "🇳🇬",
};

export interface PopularLanguage {
  name: string;
  flag: string;
}

export const popularLanguages: PopularLanguage[] = [
  "French",
  "Spanish",
  "English",
  "German",
  "Mandarin",
  "Arabic",
  "Portuguese",
  "Yoruba",
  "Igbo",
  "Hausa",
].map((name) => ({ name, flag: languageFlags[name] }));

export const languageLevelOptions = [
  "I'm completely new",
  "Beginner",
  "Intermediate",
  "Advanced",
  "I'm not sure",
];

export interface LanguageGoal {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const languageGoals: LanguageGoal[] = [
  { icon: MessageCircle, title: "Speak confidently", description: "Conversation & pronunciation" },
  { icon: School, title: "School & Exams", description: "Academic language support" },
  { icon: Plane, title: "Travel", description: "Practical everyday communication" },
  { icon: Briefcase, title: "Work & Business", description: "Professional communication" },
  { icon: GraduationCap, title: "Study Abroad", description: "Prepare for studying internationally" },
  { icon: Trophy, title: "Language Exams", description: "IELTS, TOEFL, DELF, DELE etc." },
];

export interface LanguageHowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export const languageHowItWorksSteps: LanguageHowItWorksStep[] = [
  { step: 1, title: "Choose your language", description: "Tell us what you want to learn." },
  { step: 2, title: "Find your tutor", description: "Compare tutors, specialties, availability and prices." },
  { step: 3, title: "Start with Discovery", description: "Meet your tutor and establish your level and goals." },
  { step: 4, title: "Get your learning plan", description: "Receive recommendations based on your goals." },
  { step: 5, title: "Keep learning", description: "Book private lessons or join group classes." },
];
