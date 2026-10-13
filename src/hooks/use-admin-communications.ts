"use client";

import { useSyncExternalStore } from "react";

import {
  getScheduledMessages,
  getSentMessages,
  seedSent,
  subscribeCommunications,
  type ScheduledMessage,
  type SentMessage,
} from "@/lib/admin-communications-store";

const EMPTY_SCHEDULED: ScheduledMessage[] = [];

export function useAdminCommunications(): { sent: SentMessage[]; scheduled: ScheduledMessage[] } {
  // Server snapshots pinned to the real seed values — see
  // use-lesson-confirmations.ts for why this must match what SSR renders.
  const sent = useSyncExternalStore(subscribeCommunications, getSentMessages, () => seedSent);
  const scheduled = useSyncExternalStore(subscribeCommunications, getScheduledMessages, () => EMPTY_SCHEDULED);
  return { sent, scheduled };
}
