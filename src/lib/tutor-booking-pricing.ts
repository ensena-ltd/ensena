import type { FrequencyKey } from "@/components/find-teachers/tutor-booking-sidebar";
import type { TutorListing } from "@/lib/tutors";

export interface TutorBookingPricing {
  pricePerSession: number;
  sessionsForFrequency: number;
  sessionsLabel: string;
  total: number;
}

// Same 4-week span + 10%-off-rounded-to-100 discount group classes already
// apply to their Monthly plan (group-class-booking-sidebar.tsx's
// MONTH_WEEKS/MONTHLY_SAVE_PCT) — kept in sync here so "Monthly" means the
// same thing (a discounted 4-week package) across both booking flows,
// rather than private lessons silently charging the undiscounted weekly
// rate ×4 for what's marketed as the same plan name.
const MONTH_WEEKS = 4;
const MONTHLY_SAVE_PCT = 10;

// Single source of truth for private-tutor session count + pricing, shared
// by the booking page (where the student picks these) and the review/
// confirmation pages (which recompute the same total from the same
// selections passed via URL params, rather than trusting a client-supplied
// total).
export function computeTutorBookingPricing(
  tutor: TutorListing,
  durationMinutes: number,
  frequency: FrequencyKey,
  selectedDays: string[]
): TutorBookingPricing {
  const sessionsForFrequency =
    frequency === "oneTime" ? 1 : frequency === "weekly" ? selectedDays.length : selectedDays.length * MONTH_WEEKS;
  const sessionsLabel =
    frequency === "oneTime"
      ? "1 session"
      : frequency === "weekly"
        ? `${sessionsForFrequency} session${sessionsForFrequency === 1 ? "" : "s"}/week`
        : `${sessionsForFrequency} session${sessionsForFrequency === 1 ? "" : "s"}/month`;

  // base30MinutePrice × (selectedDuration / 30) — tutor.price is the
  // existing hourly rate, so /2 gives the real 30-minute base rate.
  const base30MinutePrice = tutor.price / 2;
  const standardPricePerSession = Math.round(base30MinutePrice * (durationMinutes / 30));
  const standardTotal = standardPricePerSession * sessionsForFrequency;
  const total = frequency === "monthly" ? Math.round((standardTotal * (1 - MONTHLY_SAVE_PCT / 100)) / 100) * 100 : standardTotal;
  // For Monthly, show the discounted per-session average so the displayed
  // "per session" line stays consistent with the discounted total rather
  // than silently not adding up.
  const pricePerSession =
    frequency === "monthly" && sessionsForFrequency > 0 ? Math.round(total / sessionsForFrequency) : standardPricePerSession;

  return { pricePerSession, sessionsForFrequency, sessionsLabel, total };
}
