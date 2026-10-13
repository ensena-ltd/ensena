"use client";

import type { ReactNode } from "react";

import { useNowMs } from "@/hooks/use-now-ms";

// Every "classroom opens at HH:MM" hint across the app should call this
// instead of formatting its own ternary — one place decides when a live
// countdown replaces the static clock-time text (within an hour of
// opening; a live MM:SS countdown for a class that's days away would be
// nonsensical), so every dashboard/list agrees on the exact same threshold
// and copy.
export function entryOpensHint(opensAtMs: number, nowMs: number, label: "Classroom" | "Session" = "Classroom"): ReactNode {
  if (opensAtMs - nowMs <= 60 * 60 * 1000) return <EntryCountdown opensAtMs={opensAtMs} />;
  return `${label} opens at ${new Date(opensAtMs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// A real, ticking "Classroom opens in MM:SS" countdown — never hardcoded,
// always derived from the session's own real scheduled start time (via
// `opensAtMs`, the caller's start time minus its own entry window). Ticks
// every second on its own (a dedicated useNowMs interval, not the page's
// usual slower one) so it stays accurate without forcing the whole page to
// re-render every second. Renders nothing once the window has opened — the
// caller's own entry-state check (getClassEntryState) is what actually
// flips the button to enabled; this is purely the countdown display.
export function EntryCountdown({ opensAtMs }: { opensAtMs: number }) {
  const nowMs = useNowMs(1000);
  const remainingMs = opensAtMs - nowMs;
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    <span>
      Classroom opens in {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
