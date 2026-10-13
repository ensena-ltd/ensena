"use client";

import Link from "next/link";

import { useSupportRequests } from "@/hooks/use-support-requests";
import { SupportSubmittedConfirmation } from "@/components/support/support-request-form";
import { SUPPORT_EMAIL } from "@/lib/support-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Anonymous/guest requests have no session to prove ownership on a return
// visit, so this is a plain confirmation (not a persistent conversation
// view) — it only resolves within the same browser that just submitted the
// request, via the same local store every other role reads.
export function SupportConfirmationClient({ id }: { id: string }) {
  const requests = useSupportRequests();
  const request = requests.find((r) => r.id === id);

  // Real tickets live in the database, which a signed-out visitor can't
  // read back — so this just confirms the reference; replies go by email.
  if (isSupabaseConfigured()) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <SupportSubmittedConfirmation supportId={id.toUpperCase()} />
        <p className="mx-auto -mt-4 max-w-md text-center text-sm text-ensena-muted">
          We&apos;ll reply to the email address you gave us. You can also write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(id.toUpperCase())}`} className="font-semibold text-ensena-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
          and quote this reference.
        </p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-ensena-muted">We couldn&apos;t find that support request in this browser.</p>
        <Link href="/support/new" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← Submit a new request
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <SupportSubmittedConfirmation supportId={request.id} />
    </div>
  );
}
