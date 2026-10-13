// The one centralized place every part of the platform asks "can this
// account do X right now?" — booking creation, tutor search/discovery, and
// (eventually) any other gated action all read the SAME effective status
// via account-status-store.ts's getEffectiveAccountStatus(), rather than
// each screen re-deriving its own slightly different restriction logic.
import { accountIdForName, getEffectiveAccountStatus, type AccountEntityType, type AccountStatus } from "@/lib/account-status-store";

// UnderReview/Restricted/Suspended/Banned all block NEW bookings — Warning
// is a recorded consequence but doesn't itself disable anything (matching
// "a warning should not automatically disable unrelated functionality").
export function isBookingBlockingStatus(status: AccountStatus): boolean {
  return status === "UnderReview" || status === "Restricted" || status === "Suspended" || status === "Banned";
}

// Only Suspended/Banned remove an account from public search/discovery —
// UnderReview/Restricted still block new bookings (via
// isBookingBlockingStatus) but don't hide the profile outright, since
// those are lighter, still-under-review states.
export function isDiscoveryBlockingStatus(status: AccountStatus): boolean {
  return status === "Suspended" || status === "Banned";
}

export interface BookingEligibility {
  allowed: boolean;
  status: AccountStatus;
  reason?: string;
}

function eligibility(type: AccountEntityType, id: string | undefined): BookingEligibility {
  if (!id) return { allowed: true, status: "Active" }; // no matching account record — fail open, same as "not found" elsewhere in this app
  const record = getEffectiveAccountStatus(type, id);
  return { allowed: !isBookingBlockingStatus(record.status), status: record.status, reason: record.reason };
}

export function tutorBookingEligibility(tutorId: string | undefined): BookingEligibility {
  return eligibility("tutor", tutorId);
}

export function studentBookingEligibility(studentId: string | undefined): BookingEligibility {
  return eligibility("student", studentId);
}

// Convenience wrappers for the common case of having a display name
// (dashboardTutor.name / a tutor listing's name / dashboardStudent.name)
// rather than an admin id already in hand.
export function tutorBookingEligibilityByName(tutorName: string): BookingEligibility {
  return tutorBookingEligibility(accountIdForName("tutor", tutorName));
}

export function studentBookingEligibilityByName(studentName: string): BookingEligibility {
  return studentBookingEligibility(accountIdForName("student", studentName));
}

export function canTutorAppearInDiscoveryByName(tutorName: string): boolean {
  const id = accountIdForName("tutor", tutorName);
  if (!id) return true;
  return !isDiscoveryBlockingStatus(getEffectiveAccountStatus("tutor", id).status);
}

// A clear, user-facing reason a booking was blocked — never exposes
// internal moderation detail, only what the user needs to know and (where
// applicable) when it lifts.
export function bookingBlockedMessage(who: "tutor" | "student", eligibility: BookingEligibility): string {
  const subject = who === "tutor" ? "This tutor's account" : "Your account";
  switch (eligibility.status) {
    case "UnderReview":
      return `${subject} is currently under review, so new bookings can't be made right now.`;
    case "Restricted":
      return `${subject} is temporarily restricted from new bookings right now.`;
    case "Suspended":
      return `${subject} is currently suspended, so new bookings can't be made.`;
    case "Banned":
      return `${subject} is no longer available on Ensena.`;
    default:
      return `${subject} can't complete this booking right now.`;
  }
}
