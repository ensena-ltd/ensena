export type BirthdayRole = "student" | "tutor";

// Privacy contract: a birthday card is built ONLY from these two fields.
// Never pass DOB, age, email, phone, academic level, tutor info, location,
// or account IDs into card generation or sharing — including for minor
// accounts, where this matters most.
export interface BirthdayCardData {
  firstName: string;
  role: BirthdayRole;
}

export interface BirthdayCopy {
  title: string;
  message: string;
}

export function buildBirthdayCopy({ firstName, role }: BirthdayCardData): BirthdayCopy {
  if (role === "tutor") {
    return {
      title: `Happy Birthday, ${firstName}!`,
      message: "Wishing you an amazing birthday. Thank you for being part of the Ensena community and helping learners achieve their goals.",
    };
  }
  return {
    title: `Happy Birthday, ${firstName}!`,
    message: "Wishing you a wonderful birthday filled with happiness, growth and new achievements. Keep learning. Keep becoming. 💗",
  };
}

export const birthdayBannerMessage = (firstName: string) => `🎂 Happy Birthday, ${firstName}! We hope you have an amazing day.`;

export const defaultShareCaption = "Celebrating another year and another chapter of my learning journey 🎉💗 #Ensena";

export const socialFooterText = "Celebrating my learning journey with Ensena";

// Deterministic scatter positions for the faint background pattern — fixed,
// not randomized, so server/client renders match and canvas export lines up
// with the DOM preview. Percent-based so it scales to any card size.
export interface PatternMark {
  xPct: number;
  yPct: number;
  sizePct: number;
  opacity: number;
}

export const birthdayPatternMarks: PatternMark[] = [
  { xPct: 6, yPct: 10, sizePct: 11, opacity: 0.07 },
  { xPct: 27, yPct: 4, sizePct: 5, opacity: 0.06 },
  { xPct: 51, yPct: 8, sizePct: 4.5, opacity: 0.07 },
  { xPct: 82, yPct: 9, sizePct: 6, opacity: 0.06 },
  { xPct: 95, yPct: 27, sizePct: 6.5, opacity: 0.08 },
  { xPct: 68, yPct: 24, sizePct: 6, opacity: 0.07 },
  { xPct: 18, yPct: 38, sizePct: 8, opacity: 0.08 },
  { xPct: 46, yPct: 41, sizePct: 5.5, opacity: 0.07 },
  { xPct: 4, yPct: 60, sizePct: 4.5, opacity: 0.06 },
  { xPct: 31, yPct: 61, sizePct: 5, opacity: 0.07 },
  { xPct: 58, yPct: 51, sizePct: 4, opacity: 0.06 },
  { xPct: 83, yPct: 53, sizePct: 8, opacity: 0.08 },
  { xPct: 57, yPct: 76, sizePct: 5, opacity: 0.07 },
  { xPct: 15, yPct: 79, sizePct: 9, opacity: 0.08 },
  { xPct: 35, yPct: 92, sizePct: 3.5, opacity: 0.06 },
  { xPct: 97, yPct: 74, sizePct: 4, opacity: 0.06 },
  { xPct: 84, yPct: 87, sizePct: 8.5, opacity: 0.08 },
];

// --- "Seen this year" tracking -------------------------------------------
// No real backend/database exists in this app, so this uses localStorage as
// the equivalent of a `birthday_popup_seen_year` field on the user record.
// Keyed per role since dashboards are demoed with a fixed mock user per
// role — swap the key for a real user id once auth exists.

function storageKey(role: BirthdayRole): string {
  return `ensena_birthday_popup_seen_year_${role}`;
}

export function hasSeenBirthdayPopupThisYear(role: BirthdayRole, year: number = new Date().getFullYear()): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(storageKey(role));
  return stored === String(year);
}

export function markBirthdayPopupSeen(role: BirthdayRole, year: number = new Date().getFullYear()): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(role), String(year));
}
