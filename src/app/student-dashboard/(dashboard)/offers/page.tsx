import type { Metadata } from "next";

import { StudentOffersClient } from "@/components/student-dashboard/offers/student-offers-client";

export const metadata: Metadata = {
  title: "Requests & Offers | Ensena Student Dashboard",
};

export default function StudentOffersPage() {
  return <StudentOffersClient />;
}
