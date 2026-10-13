"use client";

import { useEffect, useState } from "react";

import {
  getActiveRestrictionResolved,
  getRestrictionHistoryResolved,
  subscribeRestrictions,
  type ActorRole,
  type RestrictionRecord,
} from "@/lib/moderation-store";

// A restriction expiring is a real-time event with no admin action behind
// it — nobody writes to storage the instant the clock passes `endAtMs`. So
// this can't rely on useSyncExternalStore alone (which only re-renders on an
// actual store write); it also re-checks on a light interval so "messaging
// becomes available again" and "the restriction notice updates" both happen
// automatically once the stored end date/time passes, per the platform's own
// "no manual action required" rule — and for a real, signed-up account, that
// end-time check is now genuinely server-side (getActiveRestrictionResolved
// reads get_effective_account_status), not just this interval re-rendering
// the same client-computed value. Starts undefined (SSR-safe placeholder,
// same pattern as useTodayISO) and resolves the real value post-mount.
export function useActiveRestriction(actorName: string, actorRole: ActorRole, actorEmail?: string): RestrictionRecord | undefined {
  const [restriction, setRestriction] = useState<RestrictionRecord | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      getActiveRestrictionResolved(actorName, actorRole, actorEmail).then((next) => {
        if (!cancelled) setRestriction(next);
      });
    }
    refresh();
    const unsubscribe = subscribeRestrictions(refresh);
    const interval = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [actorName, actorRole, actorEmail]);

  return restriction;
}

export function useRestrictionHistory(actorName: string, actorRole: ActorRole, actorEmail?: string): RestrictionRecord[] {
  const [history, setHistory] = useState<RestrictionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      getRestrictionHistoryResolved(actorName, actorRole, actorEmail).then((next) => {
        if (!cancelled) setHistory(next);
      });
    }
    refresh();
    const unsubscribe = subscribeRestrictions(refresh);
    const interval = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [actorName, actorRole, actorEmail]);

  return history;
}
