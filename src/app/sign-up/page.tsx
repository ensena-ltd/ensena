import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpChooserClient } from "./sign-up-chooser-client";

export const metadata: Metadata = {
  title: "Join Ensena | Sign Up",
  description: "Create your account and start your learning journey, or share your knowledge by becoming a tutor on Ensena.",
};

export default function SignUpChooserPage() {
  return (
    <Suspense>
      <SignUpChooserClient />
    </Suspense>
  );
}
