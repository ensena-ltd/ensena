import type { Metadata } from "next";

import { StudentHomeworkClient } from "@/components/student-dashboard/homework/student-homework-client";

export const metadata: Metadata = {
  title: "Homework | Ensena Student Dashboard",
};

export default function StudentHomeworkPage() {
  return <StudentHomeworkClient />;
}
