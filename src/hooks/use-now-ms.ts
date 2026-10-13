"use client";

import { useEffect, useState } from "react";

// A live "now" for anything deriving a real time-based UI state (entry
// windows, live/ended transitions, countdowns) from it — re-renders the
// caller on an interval instead of freezing at whatever moment the
// component happened to mount, which is what let a class silently stay
// "too early" (or "Enter Classroom" stay live) long after the real clock
// had moved past that state.
//
// Starts at a fixed SSR-safe placeholder (epoch 0 — always "too early" for
// any real class) so the server render and the client's first render agree,
// same pattern as use-today-iso.ts; the real clock only ever applies
// post-mount, client-side.
export function useNowMs(intervalMs = 15_000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the real, external wall clock, not a value derivable from props
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
