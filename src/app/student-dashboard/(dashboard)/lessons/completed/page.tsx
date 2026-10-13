import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompletedClassesClient } from "@/components/student-dashboard/lessons/completed-classes-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Completed Classes | Ensena Student Dashboard",
};

// With a real account, My Classes lists every Completed class itself.
export default function CompletedClassesPage() {
  if (isSupabaseConfigured()) redirect("/student-dashboard/lessons?tab=Completed");
  return <CompletedClassesClient />;
}
