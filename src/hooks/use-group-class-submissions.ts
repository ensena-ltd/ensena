"use client";

import { useSyncExternalStore } from "react";

import {
  getGroupClassSubmissions,
  subscribeGroupClassSubmissions,
  type GroupClassSubmission,
} from "@/lib/group-class-submission-store";

const EMPTY: GroupClassSubmission[] = [];

// Server snapshot pinned to the empty array (no submissions exist until a
// tutor creates one) — same hydration-safety reasoning as use-blocked-times.ts.
function getServerSnapshot(): GroupClassSubmission[] {
  return EMPTY;
}

export function useGroupClassSubmissions(): GroupClassSubmission[] {
  return useSyncExternalStore(subscribeGroupClassSubmissions, getGroupClassSubmissions, getServerSnapshot);
}
