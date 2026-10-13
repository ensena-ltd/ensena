import type { Metadata } from "next";

import { AdminOffersClient } from "@/components/admin/offers/admin-offers-client";

export const metadata: Metadata = {
  title: "Pre-approvals & Special Offers | Ensena Admin",
};

export default function AdminOffersPage() {
  return <AdminOffersClient />;
}
