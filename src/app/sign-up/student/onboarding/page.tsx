import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentOnboardingClient } from "./student-onboarding-client";

export const metadata: Metadata = {
  title: "Personalize Your Learning | Ensena",
  description: "Tell us your academic level and subjects so we can recommend the right tutors for you.",
};

export default function StudentOnboardingPage() {
  return (
    <Suspense>
      <StudentOnboardingClient />
    </Suspense>
  );
}
