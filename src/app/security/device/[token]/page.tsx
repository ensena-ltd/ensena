import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { DeviceReviewClient } from "./device-review-client";

export const metadata: Metadata = {
  title: "Was this you? | Ensena",
  robots: { index: false, follow: false },
};

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

function describe(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "an unknown device";
  return `${browser} on ${os}`;
}

// Opened from a login-alert email. Nothing changes until the person presses
// a button, so email link scanners that open links can't answer for them.
export default async function DeviceReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ answer?: string }> }) {
  const { token } = await params;
  const { answer } = await searchParams;
  let device: { user_agent: string | null; ip: string | null; location: string | null; last_seen_at: string } | null = null;
  if (isSupabaseConfigured() && TOKEN.test(token)) {
    const { data } = await getServiceRoleClient().from("known_devices").select("user_agent, ip, location, last_seen_at, status").eq("review_token", token).maybeSingle();
    if (data?.status === "pending") device = data;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-ensena-bg-soft px-4 py-10">
      <Link href="/" aria-label="Ensena home">
        <Logo size={36} />
      </Link>
      <div className="mt-8 w-full max-w-md rounded-3xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
        {device ? (
          <DeviceReviewClient
            token={token}
            initialAnswer={answer === "no" ? "no" : answer === "yes" ? "yes" : null}
            device={{
              name: describe(device.user_agent ?? ""),
              when: new Date(device.last_seen_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" }) + " (WAT)",
              location: device.location,
              ip: device.ip,
            }}
          />
        ) : (
          <div className="text-center">
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">This link has already been used</h1>
            <p className="mt-2 text-sm text-ensena-muted">
              You&apos;ve already answered this sign-in alert, or the link has expired. If you&apos;re worried about your account, reset your password now.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/forgot-password" className="rounded-full bg-ensena-primary px-5 py-2.5 text-sm font-semibold text-white">
                Reset my password
              </Link>
              <Link href="/sign-in" className="text-sm font-medium text-ensena-primary hover:underline">
                Go to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
