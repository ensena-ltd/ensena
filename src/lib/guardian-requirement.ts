// When a student has to add a parent/guardian:
//   - under 15                                   -> required
//   - 15–18 and at university (UG/Masters/PhD)   -> encouraged (optional)
//   - 15–18 and anywhere else (e.g. secondary)   -> required
//   - over 18                                    -> optional
// With no date of birth on file, school levels (K1-K3, Primary, Secondary)
// count as required and everything else as optional.
import { ageOn } from "@/lib/age";

export type GuardianRequirement = "required" | "encouraged" | "optional";

const UNIVERSITY_LEVELS = ["Undergraduate", "Masters", "PhD"];
const SCHOOL_LEVELS = ["K1-K3", "Primary", "Secondary"];

export function guardianRequirement(dob: string, academicLevel: string): GuardianRequirement {
  const age = ageOn(dob);
  const atUniversity = UNIVERSITY_LEVELS.includes(academicLevel);
  if (age === null) return SCHOOL_LEVELS.includes(academicLevel) ? "required" : "optional";
  if (age < 15) return "required";
  if (age <= 18) return atUniversity ? "encouraged" : "required";
  return "optional";
}

export function guardianRequirementMessage(req: GuardianRequirement, age: number | null): string {
  if (req === "required") {
    return age !== null && age < 15
      ? "Because you're under 15, a parent or guardian must be added to your account."
      : "Students aged 15–18 in school must add a parent or guardian.";
  }
  if (req === "encouraged") return "Adding a parent or guardian is optional at university, but recommended — they'll get booking and progress updates.";
  return "You can add a parent or guardian if you'd like them to follow your progress.";
}
