import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpClient } from "./sign-up-client";

export const metadata: Metadata = {
  title: "Become a Tutor: Sign Up | Ensena",
  description: "Create your Ensena tutor account in 4 simple steps.",
};

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpClient />
    </Suspense>
  );
}
