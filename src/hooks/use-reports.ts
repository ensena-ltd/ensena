"use client";

import { useSyncExternalStore } from "react";

import { getReports, subscribeReports } from "@/lib/reports-store";
import { initialReports, type Report } from "@/lib/admin-reports-data";

// Server snapshot is pinned to the literal seed constant (never a live
// localStorage re-check) so SSR and the client's pre-hydration render match
// exactly — same rule as every other store this session.
export function useReports(): Report[] {
  return useSyncExternalStore(subscribeReports, getReports, () => initialReports);
}
