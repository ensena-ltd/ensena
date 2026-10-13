import type { Metadata } from "next";

import { MyCounsellingClient } from "@/components/student-dashboard/counselling/my-counselling-client";
import { dashboardStudent } from "@/lib/student-dashboard-data";

export const metadata: Metadata = {
  title: "My Counselling | Ensena Student Dashboard",
};

export default function MyCounsellingPage() {
  return <MyCounsellingClient studentName={dashboardStudent.name} />;
}
