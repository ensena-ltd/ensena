"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { SupportConversation } from "@/components/support/support-conversation";
import { useSupportRequests } from "@/hooks/use-support-requests";
import type { SupportRequest } from "@/lib/support-data";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";

export function TutorSupportDetailClient({ id, live, userName }: { id: string; live?: SupportRequest | null; userName?: string }) {
  const requests = useSupportRequests();
  const request = live !== undefined ? live : requests.find((r) => r.id === id && r.userName === dashboardTutor.name);

  if (!request) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This support request could not be found.</p>
        <Link href="/tutor-dashboard/support" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Support</Link>
      </div>
    );
  }

  const relatedRecordHref =
    request.relatedRecordType === "booking"
      ? request.relatedRecordId && /^[0-9a-f-]{36}$/i.test(request.relatedRecordId)
        ? `/tutor-dashboard/private-lessons/${request.relatedRecordId}`
        : "/tutor-dashboard/private-lessons"
      : request.relatedRecordType === "group-class"
        ? "/tutor-dashboard/group-classes"
        : request.relatedRecordType === "payout"
          ? "/tutor-dashboard/withdrawals"
          : undefined;

  return (
    <div>
      <Link href="/tutor-dashboard/support" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Support
      </Link>
      <div className="mt-3">
        <SupportConversation request={request} currentUserName={userName ?? dashboardTutor.name} relatedRecordHref={relatedRecordHref} live={live !== undefined} />
      </div>
    </div>
  );
}
