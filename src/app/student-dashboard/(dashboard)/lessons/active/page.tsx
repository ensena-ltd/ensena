import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActiveClassesClient } from "@/components/student-dashboard/lessons/active-classes-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Active Classes | Ensena Student Dashboard",
};

// With a real account, My Classes lists every Active class itself.
export default function ActiveClassesPage() {
  if (isSupabaseConfigured()) redirect("/student-dashboard/lessons?tab=Active");
  return <ActiveClassesClient />;
}
