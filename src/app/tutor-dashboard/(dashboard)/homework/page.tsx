import type { Metadata } from "next";

import { HomeworkClient } from "@/components/tutor-dashboard/homework/homework-client";

export const metadata: Metadata = {
  title: "Homework | Ensena Tutor Dashboard",
};

export default function HomeworkPage() {
  return <HomeworkClient />;
}
