import type { Metadata } from "next";

import { StudentNotificationsClient } from "@/components/student-dashboard/notifications/student-notifications-client";

export const metadata: Metadata = {
  title: "Notifications | Ensena Student Dashboard",
};

export default function StudentNotificationsPage() {
  return <StudentNotificationsClient />;
}
