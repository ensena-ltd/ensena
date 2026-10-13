import { Suspense } from "react";

import { AcademicProgramsClient } from "@/components/admin/academic-programs-client";

export default function AdminAcademicProgramsPage() {
  return (
    <Suspense fallback={null}>
      <AcademicProgramsClient />
    </Suspense>
  );
}
