import type { Metadata } from "next";
import { Suspense } from "react";

import { MyProfileClient, type LiveProfileData } from "@/components/tutor-dashboard/profile/my-profile-client";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorProfile } from "@/lib/tutor-directory-server";
import { loadTutorAvailability } from "@/lib/tutor-settings-server";

export const metadata: Metadata = {
  title: "My Profile | Ensena Tutor Dashboard",
};

export default async function MyProfilePage() {
  let live: LiveProfileData | null = null;
  if (isSupabaseConfigured()) {
    const profile = await requireRole("tutor");
    if (profile) {
      const [availability, preview] = await Promise.all([loadTutorAvailability(profile.id), loadTutorProfile(profile.id, { preview: true })]);
      live = { availability, preview, nowMs: getPlatformNowMs() };
    }
  }
  return (
    <Suspense fallback={null}>
      <MyProfileClient live={live} />
    </Suspense>
  );
}
