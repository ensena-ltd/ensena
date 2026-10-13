"use client";

import { useSyncExternalStore } from "react";

import { initialPayoutRequests, type PayoutRequest } from "@/lib/admin-tutor-payouts-data";
import { earningsBalances } from "@/lib/tutor-dashboard-data";
import { getPayoutRequests, getTutorBalance, subscribePayouts, type TutorBalance } from "@/lib/payout-store";

// Server snapshots pinned to the literal seed values — same hydration-safety
// reasoning as use-private-lessons.ts.
const seedBalance: TutorBalance = {
  escrow: earningsBalances.escrow,
  available: earningsBalances.available,
  pending: earningsBalances.pending,
};

export function usePayoutRequests(): PayoutRequest[] {
  return useSyncExternalStore(subscribePayouts, getPayoutRequests, () => initialPayoutRequests);
}

export function useTutorBalance(): TutorBalance {
  return useSyncExternalStore(subscribePayouts, getTutorBalance, () => seedBalance);
}
