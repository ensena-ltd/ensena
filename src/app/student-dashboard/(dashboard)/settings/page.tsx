import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentSettingsClient, type StudentAccountSettings } from "@/components/student-dashboard/settings/student-settings-client";
import { getAccountSettings } from "@/lib/account-settings";
import { getPreferences } from "@/lib/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings | Ensena Student Dashboard",
};

export default async function StudentSettingsPage() {
  let initialPrefs = null;
  let initialSettings: StudentAccountSettings | null = null;
  if (isSupabaseConfigured()) {
    const profile = await requireRole("student");
    if (profile) {
      const supabase = await getSupabaseServerClient();
      const [prefs, settings, { data: student }, { data: authData }] = await Promise.all([
        getPreferences(profile.id),
        getAccountSettings(profile.id),
        // "*" so this works before migration 0016 adds the privacy columns.
        supabase.from("student_profiles").select("*").eq("id", profile.id).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      const user = authData.user;
      const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
      initialPrefs = prefs;
      initialSettings = {
        profilePublic: (student?.profile_public as boolean | undefined) ?? false,
        shareProgressWithGuardian: (student?.share_progress_with_guardian as boolean | undefined) ?? true,
        loginAlerts: settings.loginAlerts,
        theme: settings.saved ? settings.theme : null,
        calendarToken: settings.calendarToken,
        hasPassword: providers.includes("email") || !!user?.identities?.some((i) => i.provider === "email"),
      };
    }
  }
  return (
    <Suspense fallback={null}>
      <StudentSettingsClient initialPrefs={initialPrefs} initialSettings={initialSettings} />
    </Suspense>
  );
}
