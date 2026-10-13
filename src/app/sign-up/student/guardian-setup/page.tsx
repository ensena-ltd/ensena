import { redirect } from "next/navigation";

// The parent/guardian screens now live inside the student sign-up itself
// (GuardianConsentSteps) — old links land back at the start of sign-up.
export default function GuardianSetupPage() {
  redirect("/sign-up/student");
}
