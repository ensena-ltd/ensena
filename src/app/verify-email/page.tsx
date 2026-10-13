import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verify Your Email | Ensena",
  description: "Check your inbox to verify your Ensena account.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailClient />
    </Suspense>
  );
}
