import type { Metadata } from "next";

import { StudentWalletClient } from "@/components/student-dashboard/wallet/student-wallet-client";

export const metadata: Metadata = {
  title: "Wallet | Ensena Student Dashboard",
};

export default function StudentWalletPage() {
  return <StudentWalletClient />;
}
