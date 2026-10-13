"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupportRequests } from "@/hooks/use-support-requests";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import type { SupportRequest } from "@/lib/support-data";
import { cn } from "@/lib/utils";
import { supportStatusStyles } from "@/components/support/support-conversation";

// `live` = the signed-in tutor's own requests from the database; without
// it (Supabase not configured) this falls back to the browser demo store.
export function TutorSupportListClient({ live }: { live?: SupportRequest[] } = {}) {
  const demo = useSupportRequests().filter((r) => r.userName === dashboardTutor.name);
  const requests = live ?? demo;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Support</h1>
          <p className="mt-1 text-sm text-ensena-muted">Your support requests and conversations with the Ensena team.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/tutor-dashboard/support/new?context=tutor" />} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
          Contact Support
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border bg-ensena-surface py-16 text-center">
          <LifeBuoy className="size-8 text-ensena-border" />
          <p className="text-sm font-medium text-ensena-ink">You don&apos;t have any support requests yet.</p>
          <p className="max-w-sm text-xs text-ensena-muted">When you submit a ticket or report an issue, it shows up here so you can follow our replies.</p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2.5">
          {requests
            .slice()
            .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
            .map((r) => (
              <li key={r.id}>
                <Link href={`/tutor-dashboard/support/${r.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 hover:bg-ensena-bg-soft">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{r.subject}</p>
                    <p className="truncate text-xs text-ensena-muted">{r.id} · {r.source === "Report" ? "Issue report" : r.category}{r.relatedRecordLabel ? ` · ${r.relatedRecordLabel}` : ""} · {new Date(r.createdAtISO).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", supportStatusStyles[r.status])}>{r.status}</span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
