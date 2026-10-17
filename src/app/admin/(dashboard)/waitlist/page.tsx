import type { Metadata } from "next";

import { AdminWaitlistClient } from "@/components/admin/admin-waitlist-client";
import { loadWaitlistSignups } from "@/lib/admin-waitlist-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Waitlist | Ensena Admin",
};

// Sign-ups from the Student Waitlist and Tutor Circle landing pages.
export default async function AdminWaitlistPage() {
  const profile = isSupabaseConfigured() ? await requireRole("admin") : null;
  const data = profile ? await loadWaitlistSignups() : { signups: [], errors: ["Connect Supabase to see waitlist sign-ups."] };
  return <AdminWaitlistClient signups={data.signups} errors={data.errors} />;
}
