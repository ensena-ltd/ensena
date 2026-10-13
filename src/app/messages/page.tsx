import { redirect } from "next/navigation";

import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// The database's new-message notification links to "/messages" for every
// role — send each person to their own dashboard's inbox.
export default async function MessagesRedirect() {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?redirectTo=/messages");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data?.role as AppRole) ?? "student";
  const home = dashboardHrefByRole[role] ?? "/student-dashboard";
  // Only these dashboards have an inbox.
  redirect(role === "student" || role === "tutor" || role === "counsellor" ? `${home}/messages` : home);
}
