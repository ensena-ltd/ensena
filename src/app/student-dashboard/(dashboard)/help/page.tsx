import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentHelpCenterClient } from "@/components/student-dashboard/help/student-help-center-client";

export const metadata: Metadata = {
  title: "Help Center | Ensena Student Dashboard",
};

export default function StudentHelpCenterPage() {
  return (
    <Suspense fallback={null}>
      <StudentHelpCenterClient />
    </Suspense>
  );
}
