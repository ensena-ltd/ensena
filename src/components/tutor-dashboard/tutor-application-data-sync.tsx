"use client";

import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Covers the one case sign-up-client.tsx's immediate tutor_profiles update
// can't handle: email confirmation was required, so there was no session
// yet to write with. The wizard's full application still exists — it rode
// along as user_metadata.application_data at signUp — so the first real
// authenticated page load (this welcome screen) is where it finally lands.
// Silent and one-shot: does nothing once tutor_profiles already has data.
export function TutorApplicationDataSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      const pending = user?.user_metadata?.application_data as Record<string, unknown> | undefined;
      if (!user || !pending || Object.keys(pending).length === 0) return;

      const { data: profile } = await supabase.from("tutor_profiles").select("application_data").eq("id", user.id).maybeSingle();
      const existing = profile?.application_data as Record<string, unknown> | undefined;
      if (profile && (!existing || Object.keys(existing).length === 0)) {
        await supabase.from("tutor_profiles").update({ application_data: pending }).eq("id", user.id);
      }
    });
  }, []);

  return null;
}
