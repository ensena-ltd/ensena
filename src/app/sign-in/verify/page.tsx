import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { dashboardHrefByRole, type AppRole } from "@/lib/supabase/roles";
import { safeRedirectPath } from "@/lib/utils";

import { VerifyCodeClient } from "./verify-code-client";

export const metadata: Metadata = {
  title: "Two-Step Verification | Ensena",
};

// Second sign-in step for accounts with an authenticator app
// (Settings → Security → Two-Factor Authentication). requireRole sends
// every not-yet-verified session here before a dashboard renders.
export default async function VerifySignInPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const destination = safeRedirectPath((await searchParams).redirectTo) ?? dashboardHrefByRole[(profile?.role as AppRole) ?? "student"] ?? "/";

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel !== "aal2" || aal.currentLevel === "aal2") redirect(destination);

  return <VerifyCodeClient destination={destination} email={user.email ?? ""} />;
}
