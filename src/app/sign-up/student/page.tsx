import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentSignUpClient } from "./student-sign-up-client";

export const metadata: Metadata = {
  title: "Create Your Student Account | Ensena",
  description: "Join Ensena as a student and get the academic support you need to succeed.",
};

export default function StudentSignUpPage() {
  return (
    <Suspense>
      <StudentSignUpClient />
    </Suspense>
  );
}
