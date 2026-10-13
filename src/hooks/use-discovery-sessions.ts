"use client";

import { useSyncExternalStore } from "react";

import type { DiscoverySession } from "@/lib/discovery-sessions-data";
import { getAllDiscoverySessions, subscribeDiscoverySessions } from "@/lib/discovery-sessions-store";

const EMPTY: DiscoverySession[] = [];

// Server snapshot pinned to a stable empty array (must be a cached reference,
// not a fresh `[]` literal each call, or React logs "getServerSnapshot
// should be cached" and can loop) — same hydration-safety reasoning as
// use-private-lessons.ts.
function getServerSnapshot(): DiscoverySession[] {
  return EMPTY;
}

// Seed sessions + any booked during this browser session + any later
// updates (fit feedback, funnel-stage/status transitions, a submitted
// recommendation, conversion outcome — see updateDiscoverySession),
// combined and reactive — use this instead of importing `discoverySessions`
// directly anywhere a session's current state should actually show up
// (dashboards, calendars, upcoming-classes lists). Delegates entirely to
// getAllDiscoverySessions() so this hook and any direct store read always
// agree on what "the current session list" means.
export function useAllDiscoverySessions(): DiscoverySession[] {
  return useSyncExternalStore(subscribeDiscoverySessions, getAllDiscoverySessions, getServerSnapshot);
}
