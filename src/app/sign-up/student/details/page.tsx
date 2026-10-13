import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentDetailsClient } from "./student-details-client";

export const metadata: Metadata = {
  title: "Finish Your Student Account | Ensena",
  description: "Add a few details to finish setting up your Ensena student account.",
};

export default function StudentDetailsPage() {
  return (
    <Suspense>
      <StudentDetailsClient />
    </Suspense>
  );
}
