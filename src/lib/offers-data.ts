import { splitEarnings, type EarningsSplit } from "@/lib/commission";

// "request" = student-initiated, awaiting the tutor's response (Accept & Send
// Pre-approval / Send Special Offer / Suggest Changes / Decline). Once the
// tutor responds, the SAME record's kind flips to "pre-approval" or
// "special-offer" and status resets to "Sent" — now awaiting the student.
export type OfferKind = "pre-approval" | "special-offer" | "request";
export type BookingKind = "discovery" | "private-lesson" | "group-class";
export type OfferFrequency = "one-time" | "weekly" | "monthly";

export type OfferStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Paid"
  | "Declined"
  | "Expired"
  | "Withdrawn";

// An offer is "resolved" once the student or tutor has taken a final action
// on it — expiration no longer applies once it's resolved.
const RESOLVED_STATUSES: OfferStatus[] = ["Accepted", "Paid", "Declined", "Withdrawn"];

export interface Offer {
  id: string;
  kind: OfferKind;
  bookingKind: BookingKind;
  tutorName: string;
  tutorSlug: string;
  studentName: string;
  conversationId: string;
  subject: string;
  date: string; // ISO date, e.g. "2026-08-04"
  time: string; // 24-hour "HH:MM", e.g. "17:00" — always run through formatOfferTime() for display
  durationMins: number;
  frequency: OfferFrequency;
  daysPerWeek: number;
  lessonsCount: number;
  standardPricePerSession: number;
  discountPct: number | null;
  finalPricePerSession: number;
  message?: string;
  createdAt: string; // ISO datetime
  expiresAt: string; // ISO datetime
  status: OfferStatus;
  // "request"-only fields — a student's raw ask, before the tutor has
  // turned it into a priced pre-approval or special offer.
  preferredDays?: string[];
  // A student can describe what discount they're hoping for, but this is
  // never a binding price — only the tutor's response sets a real price.
  discountRequestMessage?: string;
  groupClassSlug?: string;
  groupClassTitle?: string;
  // Negotiation chain — set when this Offer record is itself a counter to a
  // previous one, and/or carries the running history of prices proposed so
  // far (₦50,000 → student proposes ₦40,000 → tutor counters ₦45,000 is
  // real, stored data here, not a client-side reconstruction).
  counterOfOfferId?: string;
  history?: { price: number; discountPct: number | null; by: "tutor" | "student"; at: string; note?: string }[];
}

// ---------------------------------------------------------------------------
// Admin-configurable policy — a Special Offer's discount can never bypass
// these limits, and Ensena's commission is always computed from the actual
// discounted total the student pays (never the standard/undiscounted price).
// ---------------------------------------------------------------------------

export interface OfferPolicySettings {
  specialOffersEnabled: boolean;
  maxTutorDiscountPct: number;
  defaultExpirationHours: number;
  allowDiscoverySessionOffers: boolean;
  minBookingPrice: number;
}

export const defaultOfferPolicySettings: OfferPolicySettings = {
  specialOffersEnabled: true,
  maxTutorDiscountPct: 20,
  defaultExpirationHours: 24,
  allowDiscoverySessionOffers: true,
  minBookingPrice: 500,
};

export function totalStandardPrice(offer: Pick<Offer, "standardPricePerSession" | "lessonsCount">): number {
  return offer.standardPricePerSession * offer.lessonsCount;
}

export function totalFinalPrice(offer: Pick<Offer, "finalPricePerSession" | "lessonsCount">): number {
  return offer.finalPricePerSession * offer.lessonsCount;
}

export function savingsAmount(offer: Pick<Offer, "standardPricePerSession" | "finalPricePerSession" | "lessonsCount">): number {
  return totalStandardPrice(offer) - totalFinalPrice(offer);
}

export function commissionSplitForOffer(offer: Pick<Offer, "finalPricePerSession" | "lessonsCount">): EarningsSplit {
  return splitEarnings(totalFinalPrice(offer));
}

// Ensena's commission is always computed from the actual total the student
// pays (never the standard/undiscounted price) — used while composing an
// offer, before an Offer record exists yet.
export function splitEarningsForTotal(total: number): EarningsSplit {
  return splitEarnings(total);
}

export function discountPctFromFinal(standardPerSession: number, finalPerSession: number): number {
  if (standardPerSession <= 0) return 0;
  return Math.round((1 - finalPerSession / standardPerSession) * 100);
}

export function finalPriceFromDiscountPct(standardPerSession: number, discountPct: number): number {
  return Math.round(standardPerSession * (1 - discountPct / 100));
}

export function exceedsMaxDiscount(
  standardPerSession: number,
  finalPerSession: number,
  policy: OfferPolicySettings
): boolean {
  return discountPctFromFinal(standardPerSession, finalPerSession) > policy.maxTutorDiscountPct;
}

// Whoever made the most recent price proposal on this offer — the other
// party is the one who can now Accept/Decline/Counter. Falls back to the
// implicit sender when no negotiation has happened yet: a "request" always
// starts with the student asking; any priced offer always starts with the
// tutor sending it.
export function lastProposalBy(offer: Pick<Offer, "kind" | "history">): "tutor" | "student" {
  if (offer.history && offer.history.length > 0) return offer.history[offer.history.length - 1].by;
  return offer.kind === "request" ? "student" : "tutor";
}

// The status an offer effectively has right now — Sent/Viewed offers flip to
// Expired once their expiresAt passes, without mutating the stored record.
export function effectiveStatus(offer: Pick<Offer, "status" | "expiresAt">, now: Date = new Date()): OfferStatus {
  if (RESOLVED_STATUSES.includes(offer.status)) return offer.status;
  if (new Date(offer.expiresAt) < now) return "Expired";
  return offer.status;
}

// Converts the canonical 24-hour "HH:MM" storage format to a human-friendly
// "H:MM AM/PM" string. This is the only place that should do this conversion
// — every UI that displays offer.time should call this rather than
// re-deriving it, to avoid format mismatches.
export function formatOfferTime(time24: string): string {
  const [hh, mm] = time24.split(":");
  const hour24 = Number(hh);
  const period = hour24 >= 12 ? "PM" : "AM";
  const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${displayHour}:${mm} ${period}`;
}

export function bookingKindLabel(bookingKind: BookingKind): string {
  if (bookingKind === "discovery") return "Discovery Session";
  if (bookingKind === "group-class") return "Group Class";
  return "Private Lessons";
}

export function formatCountdown(expiresAt: string, now: Date = new Date()): string {
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();

// ---------------------------------------------------------------------------
// Seed offers — demo data only, no real persistence/backend.
// Adaeze Okonkwo (the tutor-dashboard persona) <-> Cynthia Ejie (the
// student-dashboard persona) share conversation c-1 / sc-1 in the existing
// messages data, so offers attach to that same thread from each side.
// ---------------------------------------------------------------------------

export const offers: Offer[] = [
  {
    id: "off-6",
    kind: "request",
    bookingKind: "private-lesson",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "Cynthia Ejie",
    conversationId: "c-1",
    subject: "Mathematics",
    date: new Date(now + 5 * 24 * HOUR).toISOString().slice(0, 10),
    time: "17:00",
    durationMins: 60,
    frequency: "weekly",
    daysPerWeek: 2,
    lessonsCount: 8,
    standardPricePerSession: 0,
    discountPct: null,
    finalPricePerSession: 0,
    preferredDays: ["Tuesday", "Thursday"],
    message: "I'm preparing for WAEC and would like lessons twice a week.",
    discountRequestMessage: "I'm booking for the whole month. Is there a discount available?",
    createdAt: new Date(now - 3 * HOUR).toISOString(),
    expiresAt: new Date(now + 21 * HOUR).toISOString(),
    status: "Sent",
  },
  {
    id: "off-1",
    kind: "special-offer",
    bookingKind: "private-lesson",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "Cynthia Ejie",
    conversationId: "c-1",
    subject: "Mathematics",
    date: new Date(now + 5 * 24 * HOUR).toISOString().slice(0, 10),
    time: "17:00",
    durationMins: 60,
    frequency: "weekly",
    daysPerWeek: 2,
    lessonsCount: 8,
    standardPricePerSession: 6000,
    discountPct: 17,
    finalPricePerSession: 5000,
    message: "Since you're booking a full month, here's a discounted rate. Let's lock in your Tue/Thu slot.",
    createdAt: new Date(now - 2 * HOUR).toISOString(),
    expiresAt: new Date(now + 22 * HOUR).toISOString(),
    status: "Sent",
  },
  {
    id: "off-2",
    kind: "pre-approval",
    bookingKind: "private-lesson",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "James O.",
    conversationId: "c-2",
    subject: "Mathematics",
    date: new Date(now + 2 * 24 * HOUR).toISOString().slice(0, 10),
    time: "18:00",
    durationMins: 60,
    frequency: "one-time",
    daysPerWeek: 1,
    lessonsCount: 1,
    standardPricePerSession: 3000,
    discountPct: null,
    finalPricePerSession: 3000,
    createdAt: new Date(now - 26 * HOUR).toISOString(),
    expiresAt: new Date(now - 2 * HOUR).toISOString(),
    status: "Accepted",
  },
  {
    id: "off-3",
    kind: "special-offer",
    bookingKind: "private-lesson",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "Mary U.",
    conversationId: "c-3",
    subject: "Mathematics",
    date: new Date(now - 3 * 24 * HOUR).toISOString().slice(0, 10),
    time: "16:00",
    durationMins: 45,
    frequency: "weekly",
    daysPerWeek: 3,
    lessonsCount: 12,
    standardPricePerSession: 2800,
    discountPct: 10,
    finalPricePerSession: 2520,
    createdAt: new Date(now - 10 * 24 * HOUR).toISOString(),
    expiresAt: new Date(now - 9 * 24 * HOUR).toISOString(),
    status: "Paid",
  },
  {
    id: "off-4",
    kind: "pre-approval",
    bookingKind: "discovery",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "David O.",
    conversationId: "c-5",
    subject: "Mathematics",
    date: new Date(now - 5 * 24 * HOUR).toISOString().slice(0, 10),
    time: "16:00",
    durationMins: 25,
    frequency: "one-time",
    daysPerWeek: 1,
    lessonsCount: 1,
    standardPricePerSession: 0,
    discountPct: null,
    finalPricePerSession: 0,
    createdAt: new Date(now - 7 * 24 * HOUR).toISOString(),
    expiresAt: new Date(now - 6 * 24 * HOUR).toISOString(),
    status: "Expired",
  },
  {
    id: "off-5",
    kind: "special-offer",
    bookingKind: "private-lesson",
    tutorName: "Adaeze Okonkwo",
    tutorSlug: "adaeze-okonkwo",
    studentName: "Grace A.",
    conversationId: "c-6",
    subject: "Mathematics",
    date: new Date(now - 1 * 24 * HOUR).toISOString().slice(0, 10),
    time: "15:00",
    durationMins: 60,
    frequency: "monthly",
    daysPerWeek: 2,
    lessonsCount: 8,
    standardPricePerSession: 3000,
    discountPct: 15,
    finalPricePerSession: 2550,
    createdAt: new Date(now - 3 * 24 * HOUR).toISOString(),
    expiresAt: new Date(now - 2 * 24 * HOUR).toISOString(),
    status: "Declined",
  },
];

export function getOfferById(id: string): Offer | undefined {
  return offers.find((o) => o.id === id);
}
