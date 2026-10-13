"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

interface StopwatchState {
  accumulatedSec: number;
  startedAtMs: number | null;
  status: "idle" | "running" | "paused";
}

function isStopwatchState(s: Record<string, unknown>): boolean {
  return typeof s.accumulatedSec === "number";
}

function computeElapsed(state: StopwatchState, nowMs: number): number {
  if (state.status !== "running" || state.startedAtMs === null) return state.accumulatedSec;
  return state.accumulatedSec + (nowMs - state.startedAtMs) / 1000;
}

function formatTime(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const tenths = Math.floor((totalSeconds - s) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${tenths}`;
}

// Elapsed-time counterpart to TimerToolBody — same "compute from a shared
// anchor timestamp, tick locally" model, so Start/Pause/Reset are the only
// events that cross the network.
export function StopwatchToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: StopwatchState = isStopwatchState(rawState) ? (rawState as unknown as StopwatchState) : { accumulatedSec: 0, startedAtMs: null, status: "idle" };
  // See TimerToolBody's matching comment — `now` keeps this pure; only the
  // interval callback itself reads the clock.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [state.status]);

  const elapsed = computeElapsed(state, now);

  function start() {
    if (!canEdit || state.status === "running") return;
    onChange({ ...state, startedAtMs: Date.now(), status: "running" });
  }
  function pause() {
    if (!canEdit || state.status !== "running") return;
    onChange({ accumulatedSec: computeElapsed(state, Date.now()), startedAtMs: null, status: "paused" });
  }
  function reset() {
    if (!canEdit) return;
    onChange({ accumulatedSec: 0, startedAtMs: null, status: "idle" });
  }

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <p className="font-mono text-3xl font-bold text-ensena-ink">{formatTime(elapsed)}</p>
      {canEdit && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={state.status === "running" ? pause : start}
            className="flex h-8 items-center gap-1.5 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            {state.status === "running" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} {state.status === "running" ? "Pause" : "Start"}
          </button>
          <button type="button" aria-label="Reset" onClick={reset} className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
