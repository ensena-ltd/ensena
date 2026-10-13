import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsClient } from "@/components/tutor-dashboard/settings/settings-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadTutorSettings } from "@/lib/tutor-settings-server";

export const metadata: Metadata = {
  title: "Settings | Ensena Tutor Dashboard",
};

export default async function SettingsPage() {
  let initial = null;
  if (isSupabaseConfigured()) {
    const profile = await requireRole("tutor");
    if (profile) {
      const {
        data: { user },
      } = await (await getSupabaseServerClient()).auth.getUser();
      const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
      const hasPassword = providers.includes("email") || !!user?.identities?.some((i) => i.provider === "email");
      initial = await loadTutorSettings(profile.id, hasPassword);
    }
  }
  return (
    <Suspense fallback={null}>
      <SettingsClient initial={initial} />
    </Suspense>
  );
}
