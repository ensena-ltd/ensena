"use client";

import { useEffect, useState } from "react";

import {
  accountIdForName,
  effectiveAccountStatus,
  getAccountStatus,
  getAccountStatusSeed,
  subscribeAccountStatus,
  type AccountEntityType,
  type AccountStatusRecord,
} from "@/lib/account-status-store";
import { isDiscoveryBlockingStatus } from "@/lib/account-permissions";
import { useNowMs } from "@/hooks/use-now-ms";

// For list pages (Admin Tutors/Students tables) that read getAccountStatus()
// per-row inline during render rather than through the single-entity hook
// above — this just forces a re-render whenever any account status changes,
// so every row's inline lookup picks up the new value.
export function useAccountStatusVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeAccountStatus(() => setVersion((v) => v + 1)), []);
  return version;
}

// The initializer must return the same value on the server and on the
// client's pre-hydration render, so it always starts from the
// deterministic admin-data.ts seed (never reads localStorage) — any real
// override is only applied inside useEffect, post-hydration, same pattern
// as use-saved-tutor.ts.
export function useAccountStatus(type: AccountEntityType, id: string): AccountStatusRecord {
  const [record, setRecord] = useState<AccountStatusRecord>(() => getAccountStatusSeed(type, id));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(getAccountStatus(type, id));
    return subscribeAccountStatus(() => setRecord(getAccountStatus(type, id)));
  }, [type, id]);

  return record;
}

// The RAW record above never flips a Restricted/Suspended status back to
// Active on its own once its expiresAt passes — this derives the live
// EFFECTIVE status from it every render, re-checked on a real ticking
// clock (useNowMs), so a dashboard banner genuinely disappears the moment
// a restriction expires rather than only after the next store write.
export function useEffectiveAccountStatus(type: AccountEntityType, id: string): AccountStatusRecord {
  const record = useAccountStatus(type, id);
  // useNowMs starts at epoch 0 pre-hydration (its own SSR-safety contract)
  // — kept as-is here rather than falling back to a real Date.now(), which
  // would make the server and the client's first render disagree about
  // whether a restriction has expired and risk a hydration mismatch.
  const nowMs = useNowMs();
  return effectiveAccountStatus(record, new Date(nowMs));
}

// For a component (e.g. a tutor's public profile page) that only has the
// tutor's display NAME on hand, not their admin id — resolves it and
// reports whether the profile should present as bookable right now. A
// plain (non-hook) call to canTutorAppearInDiscoveryByName would call
// Date.now() during render (account-status-store's default `now` param),
// which React's purity rules disallow — this hook goes through the same
// real, ticking clock every other status read in this file uses instead.
export function useCanTutorAppearInDiscovery(tutorName: string): boolean {
  const id = accountIdForName("tutor", tutorName);
  const record = useEffectiveAccountStatus("tutor", id ?? "");
  if (!id) return true;
  return !isDiscoveryBlockingStatus(record.status);
}
