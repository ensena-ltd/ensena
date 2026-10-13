import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UpcomingClassesClient } from "@/components/student-dashboard/lessons/upcoming-classes-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Upcoming Classes | Ensena Student Dashboard",
};

// With a real account, My Classes lists every Upcoming class itself.
export default function UpcomingClassesPage() {
  if (isSupabaseConfigured()) redirect("/student-dashboard/lessons?tab=Upcoming");
  return <UpcomingClassesClient />;
}
