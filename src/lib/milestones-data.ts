import { Award, Calendar, CheckCircle2, Rocket, Trophy, TrendingUp, type LucideIcon } from "lucide-react";

export interface CelebrationContent {
  title: string;
  message: string;
  signature?: string;
}

export function buildBirthdayCelebration(firstName: string, audience: "student" | "tutor"): CelebrationContent {
  if (audience === "tutor") {
    return {
      title: `Happy Birthday, ${firstName}!`,
      message: "Thank you for being part of the Ensena learning community and helping students grow.",
      signature: "From Team Ensena",
    };
  }
  return {
    title: `Happy Birthday, ${firstName}!`,
    message: "We hope your day is filled with happiness and growth. Keep learning, keep becoming.",
    signature: "From Team Ensena",
  };
}

export function isBirthdayToday(dob: string, today: Date = new Date()): boolean {
  const dobDate = new Date(dob);
  return dobDate.getMonth() === today.getMonth() && dobDate.getDate() === today.getDate();
}

export interface MilestoneBannerContent {
  id: string;
  icon: LucideIcon;
  message: string;
}

export const studentMilestoneExamples: MilestoneBannerContent[] = [
  { id: "first-lesson", icon: Rocket, message: "Your learning journey starts today." },
  { id: "lessons-10", icon: CheckCircle2, message: "You've completed 10 lessons." },
  { id: "plan-halfway", icon: TrendingUp, message: "You're 50% through your WAEC Mathematics plan." },
  { id: "goal-achieved", icon: Award, message: "You completed your Mathematics learning goal." },
];

export const tutorMilestoneExamples: MilestoneBannerContent[] = [
  { id: "lessons-100", icon: Trophy, message: "You've taught 100 lessons on Ensena." },
  { id: "anniversary", icon: Calendar, message: "It's been one year since you joined Ensena." },
  { id: "first-booking", icon: CheckCircle2, message: "You just received your first booking." },
];

export interface EnsenaJourneyStep {
  label: string;
  date?: string;
  done: boolean;
}

export const studentEnsenaJourney: EnsenaJourneyStep[] = [
  { label: "Joined Ensena", date: "14 Jan 2024", done: true },
  { label: "First Discovery Session", done: true },
  { label: "First Private Lesson", done: true },
  { label: "10 Lessons Completed", done: true },
  { label: "First Learning Goal Achieved", done: true },
];

export const studentNextMilestone = "25 lessons";
