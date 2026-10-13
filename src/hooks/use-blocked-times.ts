"use client";

import { useSyncExternalStore } from "react";

import { getBlockedTimes, subscribeBlockedTimes, type BlockedTimeEntry } from "@/lib/tutor-availability-store";

const EMPTY: BlockedTimeEntry[] = [];

// Server snapshot pinned to the empty array (no blocks exist until a tutor
// creates one) — same hydration-safety reasoning as every other store hook
// in this app.
function getServerSnapshot(): BlockedTimeEntry[] {
  return EMPTY;
}

export function useBlockedTimes(): BlockedTimeEntry[] {
  return useSyncExternalStore(subscribeBlockedTimes, getBlockedTimes, getServerSnapshot);
}
