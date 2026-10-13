import type { Metadata } from "next";

import { VerificationClient } from "./verification-client";

export const metadata: Metadata = {
  title: "Verification | Ensena Tutor Dashboard",
};

export default function TutorVerificationPage() {
  return <VerificationClient />;
}
