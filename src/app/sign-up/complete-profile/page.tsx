import type { Metadata } from "next";
import { Suspense } from "react";

import { CompleteProfileClient } from "./complete-profile-client";

export const metadata: Metadata = {
  title: "Finish Setting Up | Ensena",
  description: "Tell us whether you're joining Ensena to learn or to teach.",
};

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileClient />
    </Suspense>
  );
}
