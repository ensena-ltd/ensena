import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInClient } from "./sign-in-client";

export const metadata: Metadata = {
  title: "Log In | Ensena",
  description: "Log in to your Ensena account to continue learning, teaching or managing your platform.",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignInClient />
    </Suspense>
  );
}
