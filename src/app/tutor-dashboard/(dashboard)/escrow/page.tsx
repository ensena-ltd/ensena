import type { Metadata } from "next";

import { EscrowClient } from "@/components/tutor-dashboard/escrow/escrow-client";

export const metadata: Metadata = {
  title: "Escrow | Ensena Tutor Dashboard",
};

export default function EscrowPage() {
  return <EscrowClient />;
}
