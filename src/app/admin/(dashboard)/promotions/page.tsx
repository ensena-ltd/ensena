import type { Metadata } from "next";

import { AdminPromotionsClient } from "@/components/admin/admin-promotions-client";

export const metadata: Metadata = {
  title: "Promotions | Ensena Admin",
};

export default function AdminPromotionsPage() {
  return <AdminPromotionsClient />;
}
