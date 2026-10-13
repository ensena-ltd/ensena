import type { Metadata } from "next";

import { GuardianDashboardClient } from "@/components/guardian-dashboard/guardian-dashboard-client";

export const metadata: Metadata = {
  title: "Guardian Dashboard | Ensena",
  description: "Keep track of your child's lessons, learning plan, progress, bookings and payments on Ensena.",
};

export default function GuardianDashboardPage() {
  return <GuardianDashboardClient />;
}
