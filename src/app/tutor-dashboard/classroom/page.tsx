import type { Metadata } from "next";
import { Suspense } from "react";

import { ClassroomClient } from "@/components/tutor-dashboard/classroom/classroom-client";

export const metadata: Metadata = {
  title: "Virtual Classroom | Ensena",
};

export default function ClassroomPage() {
  return (
    <Suspense fallback={null}>
      <ClassroomClient />
    </Suspense>
  );
}
