"use client";

import { useSyncExternalStore } from "react";

import type { AvailabilityDay, BlockedDate, CounsellorSessionSettings, SpecialAvailabilityDate } from "@/lib/admin-counselling-center-data";
import {
  initialAvailability,
  initialBlockedDates,
  initialCounsellorSessionSettings,
  initialSpecialAvailability,
} from "@/lib/admin-counselling-center-data";
import {
  getAvailability,
  getAvailabilityVersion,
  getBlockedDates,
  getSessionSettings,
  getSpecialDates,
  subscribeCounsellorAvailability,
} from "@/lib/counsellor-availability-store";

// Server snapshots pinned to the literal seed values — same hydration-safety
// reasoning as use-private-lessons.ts.
export function useAvailability(): AvailabilityDay[] {
  return useSyncExternalStore(subscribeCounsellorAvailability, getAvailability, () => initialAvailability);
}

export function useBlockedDates(): BlockedDate[] {
  return useSyncExternalStore(subscribeCounsellorAvailability, getBlockedDates, () => initialBlockedDates);
}

export function useSpecialDates(): SpecialAvailabilityDate[] {
  return useSyncExternalStore(subscribeCounsellorAvailability, getSpecialDates, () => initialSpecialAvailability);
}

export function useSessionSettings(): CounsellorSessionSettings {
  return useSyncExternalStore(subscribeCounsellorAvailability, getSessionSettings, () => initialCounsellorSessionSettings);
}

// A cheap re-render trigger for consumers (like the student-facing schedule
// picker) that recompute derived data from the store's getters directly
// rather than needing one of the typed hooks above. Must return a stable
// value that only changes when the store actually changed — Date.now()
// here would return a new value on every call and re-render forever.
export function useCounsellorAvailabilityTick(): number {
  return useSyncExternalStore(subscribeCounsellorAvailability, getAvailabilityVersion, () => 0);
}
