import type { Metadata } from "next";
import { Suspense } from "react";

import { AcceptGuardianInvitationClient } from "./accept-guardian-invitation-client";

export const metadata: Metadata = {
  title: "Confirm Guardian Consent | Ensena",
  description: "Confirm consent and set up your Ensena Guardian Dashboard.",
};

export default function AcceptGuardianInvitationPage() {
  return (
    <Suspense>
      <AcceptGuardianInvitationClient />
    </Suspense>
  );
}
