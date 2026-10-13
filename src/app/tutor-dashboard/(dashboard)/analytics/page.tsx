import type { Metadata } from "next";

import { AnalyticsClient } from "@/components/tutor-dashboard/analytics/analytics-client";

export const metadata: Metadata = {
  title: "Analytics | Ensena Tutor Dashboard",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
