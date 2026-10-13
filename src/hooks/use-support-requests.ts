"use client";

import { useSyncExternalStore } from "react";

import { getSupportRequests, subscribeSupportRequests } from "@/lib/support-store";
import type { SupportRequest } from "@/lib/support-data";

// getSupportRequests() now includes real, seeded historical requests (see
// support-store.ts) and already returns a stable, cached reference on the
// server (window is undefined there, so it's always the same seed-merged
// array) — so it doubles as the server snapshot directly instead of a
// separate hardcoded empty array, which would otherwise make the Admin
// Support Inbox render empty until the first client-side re-render.
export function useSupportRequests(): SupportRequest[] {
  return useSyncExternalStore(subscribeSupportRequests, getSupportRequests, getSupportRequests);
}
