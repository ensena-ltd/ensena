"use client";

import { useSyncExternalStore } from "react";

import { getAdminAuditLog, seedEntries, subscribeAuditLog, type AdminAuditEntry } from "@/lib/admin-audit-log";

// Server snapshot must be pinned to the exact value the server actually
// rendered (the seed array) — see use-lesson-confirmations.ts for the same
// hydration-mismatch trap this avoids. Returning `[]` here would mismatch
// the server's real seedEntries-based render.
export function useAdminAuditLog(): AdminAuditEntry[] {
  return useSyncExternalStore(subscribeAuditLog, getAdminAuditLog, () => seedEntries);
}
