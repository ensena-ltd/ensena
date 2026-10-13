import { Calendar } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function AppointmentsPage() {
  return <ComingSoon title="Appointments" description="Manage upcoming, pending, and past counselling sessions." icon={Calendar} />;
}
