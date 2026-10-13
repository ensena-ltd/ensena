import type { Metadata } from "next";

import { FindGroupClassesClient } from "@/components/student-dashboard/group-classes/find-group-classes-client";

export const metadata: Metadata = {
  title: "Group Classes | Ensena Student Dashboard",
};

export default function StudentGroupClassesPage() {
  return <FindGroupClassesClient />;
}
