import type { Metadata } from "next";

import { TutorOffersClient } from "@/components/tutor-dashboard/offers/tutor-offers-client";

export const metadata: Metadata = {
  title: "Requests & Pre-approvals | Ensena Tutor Dashboard",
};

export default function TutorOffersPage() {
  return <TutorOffersClient />;
}
