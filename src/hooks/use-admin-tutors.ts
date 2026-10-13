"use client";

import { useSyncExternalStore } from "react";

import { initialAdminTutors, type AdminTutor } from "@/lib/admin-data";
import { getAdminTutors, subscribeAdminTutors } from "@/lib/tutor-verification-store";

// Server snapshot pinned to the literal seed array — same hydration-safety
// reasoning as use-private-lessons.ts.
function getServerSnapshot(): AdminTutor[] {
  return initialAdminTutors;
}

export function useAdminTutors(): AdminTutor[] {
  return useSyncExternalStore(subscribeAdminTutors, getAdminTutors, getServerSnapshot);
}
