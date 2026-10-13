import type { Metadata } from "next";
import { Suspense } from "react";

import { TutorHelpCenterClient } from "@/components/tutor-dashboard/help/help-center-client";

export const metadata: Metadata = {
  title: "Help Center | Ensena Tutor Dashboard",
};

export default function HelpCenterPage() {
  return (
    <Suspense fallback={null}>
      <TutorHelpCenterClient />
    </Suspense>
  );
}
