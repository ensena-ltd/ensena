export type DiscountCodeStatus = "Active" | "Scheduled" | "Expired" | "Disabled";

export interface DiscountCode {
  id: string;
  code: string;
  type: "Percentage" | "Fixed Amount";
  value: number;
  usageCount: number;
  usageLimit: number;
  expiresAt: string;
  status: DiscountCodeStatus;
}

export const discountCodes: DiscountCode[] = [
  { id: "promo-1", code: "WELCOME20", type: "Percentage", value: 20, usageCount: 342, usageLimit: 1000, expiresAt: "Jun 30, 2026", status: "Active" },
  { id: "promo-2", code: "WAEC2026", type: "Fixed Amount", value: 2000, usageCount: 118, usageLimit: 500, expiresAt: "Aug 15, 2026", status: "Active" },
  { id: "promo-3", code: "REFER500", type: "Fixed Amount", value: 500, usageCount: 89, usageLimit: 2000, expiresAt: "Dec 31, 2026", status: "Active" },
  { id: "promo-4", code: "BLACKFRIDAY25", type: "Percentage", value: 25, usageCount: 0, usageLimit: 1500, expiresAt: "Nov 27, 2026", status: "Scheduled" },
  { id: "promo-5", code: "LAUNCH10", type: "Percentage", value: 10, usageCount: 764, usageLimit: 750, expiresAt: "Jan 31, 2026", status: "Expired" },
];

export const referralProgram = {
  referrerReward: 1000,
  refereeReward: 500,
  totalReferrals: 1284,
  successfulReferrals: 842,
  totalPayout: 842000,
};

export interface FreeTrialCampaign {
  id: string;
  name: string;
  audience: string;
  durationDays: number;
  signups: number;
  conversionPct: number;
  status: "Active" | "Ended";
}

export const freeTrialCampaigns: FreeTrialCampaign[] = [
  { id: "trial-1", name: "New Student 7-Day Free Trial", audience: "New Students", durationDays: 7, signups: 2104, conversionPct: 34, status: "Active" },
  { id: "trial-2", name: "WAEC Bootcamp Trial Week", audience: "WAEC Students", durationDays: 5, signups: 618, conversionPct: 41, status: "Active" },
  { id: "trial-3", name: "Back to School 2025", audience: "New Students", durationDays: 3, signups: 1340, conversionPct: 28, status: "Ended" },
];

export interface FeaturedTutorSlot {
  id: string;
  name: string;
  subject: string;
  rating: number;
  image: string;
  featuredUntil: string;
}

export const featuredTutorSlots: FeaturedTutorSlot[] = [
  { id: "feat-t-1", name: "Adaeze Okonkwo", subject: "Mathematics", rating: 4.98, image: "/teacher-2.jpg.png", featuredUntil: "Jul 31, 2026" },
  { id: "feat-t-2", name: "Michael Adewale", subject: "Physics", rating: 4.95, image: "/teacher-3.jpg.png", featuredUntil: "Jul 31, 2026" },
  { id: "feat-t-3", name: "Cynthia Ejie", subject: "Academic Counselling", rating: 4.98, image: "/teacher-4.jpg.png", featuredUntil: "Aug 15, 2026" },
];

export interface FeaturedGroupClassSlot {
  id: string;
  title: string;
  tutor: string;
  seatsFilled: number;
  seatsTotal: number;
  featuredUntil: string;
}

export const featuredGroupClassSlots: FeaturedGroupClassSlot[] = [
  { id: "feat-gc-1", title: "WAEC Mathematics Bootcamp 2024", tutor: "Adaeze Okonkwo", seatsFilled: 9, seatsTotal: 10, featuredUntil: "Jul 31, 2026" },
  { id: "feat-gc-2", title: "NECO & WAEC Biology Prep", tutor: "Fatima Bello", seatsFilled: 17, seatsTotal: 20, featuredUntil: "Aug 10, 2026" },
];
