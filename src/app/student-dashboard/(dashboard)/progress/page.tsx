import type { Metadata } from "next";

import { StudentProgressClient } from "@/components/student-dashboard/progress/student-progress-client";

export const metadata: Metadata = {
  title: "Progress | Ensena Student Dashboard",
};

export default function StudentProgressPage() {
  return <StudentProgressClient />;
}
