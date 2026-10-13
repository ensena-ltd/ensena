"use client";

import { useSyncExternalStore } from "react";

import { initialPrivateLessons, type PrivateLesson } from "@/lib/tutor-dashboard-data";
import { getPrivateLessons, subscribePrivateLessons } from "@/lib/private-lessons-store";

// Server snapshot pinned to the literal seed array — same hydration-safety
// reasoning as use-lesson-confirmations.ts.
function getServerSnapshot(): PrivateLesson[] {
  return initialPrivateLessons;
}

export function usePrivateLessons(): PrivateLesson[] {
  return useSyncExternalStore(subscribePrivateLessons, getPrivateLessons, getServerSnapshot);
}
