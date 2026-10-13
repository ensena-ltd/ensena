"use client";

import { useRef } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

interface NumberLineState {
  min: number;
  max: number;
  markers: number[];
}

function isNumberLineState(s: Record<string, unknown>): boolean {
  return typeof s.min === "number" && typeof s.max === "number";
}

// A genuinely interactive number line — tapping anywhere on the line places
// (or removes) a marker at the nearest integer, and the range itself can be
// widened/narrowed. Every value here lives in the synced `state`, so a
// tutor's tap and a student's tap (when permitted) both land in the same
// shared markers array rather than two independent local copies.
export function NumberLineToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: NumberLineState = isNumberLineState(rawState) ? (rawState as unknown as NumberLineState) : { min: -10, max: 10, markers: [] };
  const trackRef = useRef<HTMLDivElement>(null);
  const range = state.max - state.min;
  const values = Array.from({ length: range + 1 }, (_, i) => state.min + i);
  const labelEvery = range <= 12 ? 1 : range <= 30 ? 5 : 10;

  function toggleMarkerAt(clientX: number) {
    if (!canEdit || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const value = Math.round(state.min + ratio * range);
    const exists = state.markers.includes(value);
    onChange({ ...state, markers: exists ? state.markers.filter((m) => m !== value) : [...state.markers, value] });
  }

  function expandRange() {
    if (!canEdit) return;
    onChange({ ...state, min: state.min - 1, max: state.max + 1 });
  }
  function shrinkRange() {
    if (!canEdit || range <= 4) return;
    onChange({ ...state, min: state.min + 1, max: state.max - 1 });
  }
  function clearMarkers() {
    if (!canEdit) return;
    onChange({ ...state, markers: [] });
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4 p-4">
      <div
        ref={trackRef}
        onClick={(e) => toggleMarkerAt(e.clientX)}
        className="relative h-10 cursor-pointer"
      >
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ensena-ink" />
        {values.map((v) => {
          const percent = ((v - state.min) / range) * 100;
          const isMarked = state.markers.includes(v);
          const showLabel = v % labelEvery === 0;
          return (
            <div key={v} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${percent}%` }}>
              <div className={isMarked ? "size-3 rounded-full bg-ensena-primary" : "h-2.5 w-0.5 bg-ensena-ink/70"} />
              {showLabel && <span className="mt-4 text-[10px] font-medium text-ensena-muted">{v}</span>}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" onClick={shrinkRange} aria-label="Narrower range" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Minus className="size-3" />
          </button>
          <span className="text-[10px] text-ensena-muted">
            {state.min} to {state.max}
          </span>
          <button type="button" onClick={expandRange} aria-label="Wider range" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" />
          </button>
          <button type="button" onClick={clearMarkers} aria-label="Clear markers" className="ml-1 flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <RotateCcw className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
