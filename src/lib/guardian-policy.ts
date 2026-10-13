// Central age/guardian policy layer.
//
// This is UI/UX scaffolding only. It demonstrates where age-based branching
// and guardian consent should live in the product, using a single threshold
// that can be changed in one place. It is NOT a compliant implementation of
// the Nigeria Data Protection Act 2023 (or any other child-data-protection
// law) on its own — there is no backend here to enforce any of this, no real
// identity/age verification, and no reviewed consent flow. Real compliance
// requires: server-side enforcement (never just hiding UI), a lawyer-reviewed
// consent and verification process, and a real data-retention/privacy policy
// explaining why DOB is collected. Treat everything in this file as a
// placeholder for where that real logic would plug in.

export const MINOR_AGE_THRESHOLD = 16;

export function calculateAge(dob: string, today: Date = new Date()): number {
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function requiresGuardianConsent(dob: string, today: Date = new Date()): boolean {
  return calculateAge(dob, today) < MINOR_AGE_THRESHOLD;
}

export type AgeBand = "Under 13" | "13–15" | "16–17" | "18+";

export function ageBand(dob: string, today: Date = new Date()): AgeBand {
  const age = calculateAge(dob, today);
  if (age < 13) return "Under 13";
  if (age < 16) return "13–15";
  if (age < 18) return "16–17";
  return "18+";
}

export interface GuardianInfo {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}
