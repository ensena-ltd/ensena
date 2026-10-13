"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { MessagesClient } from "@/components/tutor-dashboard/messages/messages-client";
import { TutorOffersClient } from "@/components/tutor-dashboard/offers/tutor-offers-client";
import { cn } from "@/lib/utils";

const viewTabs = ["Messages", "Requests & Pre-approvals"] as const;
type ViewTab = (typeof viewTabs)[number];

// MVP merge: "Inbox" is the single nav entry for conversations and the
// Requests & Pre-approvals list that flows out of them, via a lightweight
// tab switch. Both underlying components are reused as-is and untouched.
export function InboxHubClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [view, setView] = useState<ViewTab>(
    () => (viewTabs.find((t) => t === initialTab) as ViewTab | undefined) ?? "Messages"
  );

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {viewTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors",
              view === tab ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "Messages" ? <MessagesClient /> : <TutorOffersClient />}
      </div>
    </div>
  );
}
