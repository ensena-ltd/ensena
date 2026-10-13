"use client";

import { useEffect, useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

interface TimerState {
  durationSec: number;
  /** Remaining seconds as of the last start/pause/reset/duration change — combined with startedAtMs, this is enough for every participant to independently compute the live countdown without a broadcast every second. */
  remainingAtLastChangeSec: number;
  startedAtMs: number | null;
  status: "idle" | "running" | "paused";
}

function isTimerState(s: Record<string, unknown>): s is TimerState & Record<string, unknown> {
  return typeof s.durationSec === "number" && typeof s.remainingAtLastChangeSec === "number";
}

function computeRemaining(state: TimerState, nowMs: number): number {
  if (state.status !== "running" || state.startedAtMs === null) return state.remainingAtLastChangeSec;
  const elapsed = (nowMs - state.startedAtMs) / 1000;
  return Math.max(0, state.remainingAtLastChangeSec - elapsed);
}

function formatTime(totalSeconds: number): string {
  const s = Math.ceil(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const PRESETS_SECONDS = [60, 180, 300, 600];

// A real, shared countdown — every participant computes the same remaining
// time from `startedAtMs` + `remainingAtLastChangeSec` (see computeRemaining
// above) via their own local tick, so the tutor's Start/Pause/Reset are the
// only things that need to actually broadcast — the second-by-second
// countdown itself never touches the network.
export function TimerToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: TimerState = isTimerState(rawState) ? (rawState as unknown as TimerState) : { durationSec: 300, remainingAtLastChangeSec: 300, startedAtMs: null, status: "idle" };
  // `now` (not a bare Date.now() call during render) is what keeps this
  // pure — the interval below is the only place that actually reads the
  // clock, and it does so inside a callback, not render itself.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [state.status]);

  const remaining = computeRemaining(state, now);
  const done = remaining <= 0;

  function start() {
    if (!canEdit || state.status === "running") return;
    onChange({ ...state, startedAtMs: Date.now(), status: "running" });
  }
  function pause() {
    if (!canEdit || state.status !== "running") return;
    onChange({ ...state, remainingAtLastChangeSec: computeRemaining(state, Date.now()), startedAtMs: null, status: "paused" });
  }
  function reset() {
    if (!canEdit) return;
    onChange({ ...state, remainingAtLastChangeSec: state.durationSec, startedAtMs: null, status: "idle" });
  }
  function adjustDuration(deltaSec: number) {
    if (!canEdit || state.status === "running") return;
    const nextDuration = Math.max(10, state.durationSec + deltaSec);
    onChange({ ...state, durationSec: nextDuration, remainingAtLastChangeSec: nextDuration });
  }
  function setPreset(sec: number) {
    if (!canEdit) return;
    onChange({ durationSec: sec, remainingAtLastChangeSec: sec, startedAtMs: null, status: "idle" });
  }

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <p className={cn("font-mono text-3xl font-bold", done ? "text-rose-600" : "text-ensena-ink")}>{formatTime(remaining)}</p>
      {done && <p className="text-[11px] font-semibold text-rose-600">Time&apos;s up</p>}

      {canEdit && (
        <>
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => adjustDuration(-30)} aria-label="Subtract 30 seconds" className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={state.status === "running" ? pause : start}
              className="flex h-8 items-center gap-1.5 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              {state.status === "running" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} {state.status === "running" ? "Pause" : "Start"}
            </button>
            <button type="button" onClick={() => adjustDuration(30)} aria-label="Add 30 seconds" className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {PRESETS_SECONDS.map((s) => (
              <button key={s} type="button" onClick={() => setPreset(s)} className="rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                {s / 60}m
              </button>
            ))}
            <button type="button" aria-label="Reset" onClick={reset} className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <RotateCcw className="size-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
