"use client";

import { usePageViewTracking } from "@/hooks/use-page-view-tracking";

// Renders nothing — mounted once in the root layout so every real route
// change across the whole site is tracked from one single place, instead of
// each page independently deciding whether to instrument itself.
export function PageViewTracker() {
  usePageViewTracking();
  return null;
}
