import Link from "next/link";
import { Headset } from "lucide-react";

import { buildContactSupportHref, type SupportRole } from "@/lib/support-links";
import type { RelatedRecordType, SupportContext } from "@/lib/support-data";

// "Contact Support" always opens the role's Help Center first (search, FAQ,
// Knowledge Base, then Submit a Ticket/Report an Issue from inside it) —
// never the ticket form directly. The context/related-record params still
// travel through so the eventual ticket, if one is filed, is exactly as
// pre-filled as before; see buildContactSupportHref.
export function NeedHelpCard({
  role = "Guest",
  context = "public",
  relatedRecordType,
  relatedRecordId,
  relatedRecordLabel,
}: {
  role?: SupportRole;
  context?: SupportContext;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
}) {
  const href = buildContactSupportHref({ role, context, relatedRecordType, relatedRecordId, relatedRecordLabel });

  return (
    <div className="rounded-2xl bg-ensena-primary/5 p-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-white text-ensena-primary">
        <Headset className="size-4" />
      </span>
      <p className="mt-2 text-sm font-semibold text-ensena-ink">Need help?</p>
      <p className="mt-0.5 text-xs text-ensena-muted">Our support team is here to help you if you have any questions.</p>
      <Link
        href={href}
        className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-primary/30 text-xs font-semibold text-ensena-primary hover:bg-white"
      >
        Contact Support
      </Link>
    </div>
  );
}
