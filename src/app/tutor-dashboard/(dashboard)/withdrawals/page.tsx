import type { Metadata } from "next";

import { WithdrawalsClient } from "@/components/tutor-dashboard/withdrawals/withdrawals-client";

export const metadata: Metadata = {
  title: "Withdrawals | Ensena Tutor Dashboard",
};

export default function WithdrawalsPage() {
  return <WithdrawalsClient />;
}
