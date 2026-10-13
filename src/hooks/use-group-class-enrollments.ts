"use client";

import { useSyncExternalStore } from "react";

import {
  getGroupClassEnrollments,
  subscribeGroupClassEnrollments,
  type GroupClassEnrollment,
} from "@/lib/group-class-enrollment-store";

const EMPTY: GroupClassEnrollment[] = [];

// Server snapshot pinned to the empty array (no enrollments exist until a
// student makes one) — same hydration-safety reasoning as use-blocked-times.ts.
function getServerSnapshot(): GroupClassEnrollment[] {
  return EMPTY;
}

export function useGroupClassEnrollments(): GroupClassEnrollment[] {
  return useSyncExternalStore(subscribeGroupClassEnrollments, getGroupClassEnrollments, getServerSnapshot);
}
