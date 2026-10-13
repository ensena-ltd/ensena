import type { Metadata } from "next";
import { Suspense } from "react";

import { EarningsHubClient } from "@/components/tutor-dashboard/earnings/earnings-hub-client";

export const metadata: Metadata = {
  title: "Earnings | Ensena Tutor Dashboard",
};

export default function EarningsPage() {
  return (
    <Suspense fallback={null}>
      <EarningsHubClient />
    </Suspense>
  );
}
