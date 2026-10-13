import type { Metadata } from "next";

import { AdminLessonsClient } from "@/components/admin/admin-lessons-client";

export const metadata: Metadata = {
  title: "Lessons | Ensena Admin",
};

export default function AdminLessonsPage() {
  return <AdminLessonsClient />;
}
