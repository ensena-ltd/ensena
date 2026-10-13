"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { EarningsClient } from "@/components/tutor-dashboard/earnings/earnings-client";
import { WithdrawalsClient } from "@/components/tutor-dashboard/withdrawals/withdrawals-client";

const viewTabs = ["Earnings", "Withdrawals"] as const;
type ViewTab = (typeof viewTabs)[number];

// Case-insensitive so a mangled URL (mobile autofill/history, manual
// typing) still lands on the right tab instead of silently falling back —
// see the matching comment in my-lessons-hub-client.tsx.
function resolveTab(raw: string | null): ViewTab {
  if (!raw) return "Earnings";
  const normalized = raw.trim().toLowerCase();
  const match = viewTabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "Earnings";
}

// "Earnings" nav item covers both the earnings overview and withdrawal
// history/requests, via a lightweight tab switch (deep-linkable via
// `?tab=`, same pattern as the Classes hub) — sidebar's Earnings > Overview
// / Withdraw children drive it, and EarningsClient's own "Withdraw" button
// links to `?tab=Withdrawals` too. No visible pill switcher here (the
// mockup shows neither page with one, and each view already has its own
// header), just the tab-resolution plumbing so those links work.
export function EarningsHubClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<ViewTab>(() => resolveTab(tabParam));

  // Keep in sync with sidebar navigation to the same route with a
  // different `?tab=` (Next.js updates the URL without remounting this
  // component). Adjusted during render rather than in a useEffect — React's
  // recommended pattern for "derive state from a changed prop" — see the
  // matching comment in my-lessons-hub-client.tsx.
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setView(resolveTab(tabParam));
  }

  return view === "Earnings" ? <EarningsClient /> : <WithdrawalsClient />;
}
