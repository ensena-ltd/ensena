import type { Metadata } from "next";

import { StudentNotificationsReal } from "@/components/student-dashboard/live/notifications-live";
import { StudentNotificationsClient } from "@/components/student-dashboard/notifications/student-notifications-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Notifications | Ensena Student Dashboard",
};

// Signed-in students see their real notifications (loaded once by the
// dashboard layout's StudentNotificationsProvider); demo mode keeps the
// local demo store.
export default async function StudentNotificationsPage() {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  return profile ? <StudentNotificationsReal /> : <StudentNotificationsClient />;
}
