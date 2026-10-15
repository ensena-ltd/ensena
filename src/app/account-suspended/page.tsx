import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";

import { Logo } from "@/components/logo";
import { activeSuspension, dashboardHrefByRole, type AppRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Account suspended | Ensena" };

// Where requireRole() sends an account with a suspension in force.
export default async function AccountSuspendedPage() {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const suspension = await activeSuspension(user.id);
  if (!suspension) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    redirect(dashboardHrefByRole[(profile?.role as AppRole) ?? "student"] ?? "/");
  }

  const until = suspension.endAt
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(suspension.endAt))
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-2xl border border-ensena-border bg-ensena-surface p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Ban className="size-6" />
        </span>
        <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Your account is suspended</h1>
        <p className="mt-2 text-sm text-ensena-muted">{until ? `You can use Ensena again from ${until} (WAT).` : "This lasts until the Ensena team lifts it."}</p>
        <div className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-left text-sm text-ensena-ink">
          <p className="text-xs font-medium text-ensena-muted">Reason</p>
          <p className="mt-0.5 whitespace-pre-wrap">{suspension.reason}</p>
        </div>
        <p className="mt-4 text-sm text-ensena-muted">
          Think this is a mistake? Email <a href="mailto:support@ensena.co" className="font-medium text-ensena-primary hover:underline">support@ensena.co</a>.
        </p>
        <Link href="/logout" className="mt-5 flex h-11 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
          Log out
        </Link>
      </div>
    </main>
  );
}
