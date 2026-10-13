import type { Metadata } from "next";

import { LearningPathsClient } from "@/components/student-dashboard/learning-paths/learning-paths-client";

export const metadata: Metadata = {
  title: "Learning Paths | Ensena Student Dashboard",
};

export default function LearningPathsPage() {
  return <LearningPathsClient />;
}
