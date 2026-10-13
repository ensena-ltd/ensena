import type { Metadata } from "next";

import { StudentTransactionsClient } from "@/components/student-dashboard/transactions/student-transactions-client";

export const metadata: Metadata = {
  title: "Transactions | Ensena Student Dashboard",
};

export default function StudentTransactionsPage() {
  return <StudentTransactionsClient />;
}
