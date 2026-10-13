"use client";

import { Minus, Plus } from "lucide-react";

interface FractionCircleState {
  denominator: number;
  filled: number[];
}

function isFractionCircleState(s: Record<string, unknown>): boolean {
  return typeof s.denominator === "number" && Array.isArray(s.filled);
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 6;

function sliceAngles(index: number, denominator: number): { startAngle: number; endAngle: number } {
  const step = (Math.PI * 2) / denominator;
  return { startAngle: index * step - Math.PI / 2, endAngle: (index + 1) * step - Math.PI / 2 };
}

function pointOnCircle(angle: number): { x: number; y: number } {
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
}

function slicePath(index: number, denominator: number): string {
  const { startAngle, endAngle } = sliceAngles(index, denominator);
  const start = pointOnCircle(startAngle);
  const end = pointOnCircle(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

// A real interactive fraction model — tapping a slice toggles it between
// shaded/unshaded in the synced `filled` array, so "student sees the same
// fraction representation" is the same shared-state pattern as every other
// tool here, not a static illustration.
export function FractionCircleToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: FractionCircleState = isFractionCircleState(rawState) ? (rawState as unknown as FractionCircleState) : { denominator: 4, filled: [] };

  function toggleSlice(index: number) {
    if (!canEdit) return;
    const isFilled = state.filled.includes(index);
    onChange({ ...state, filled: isFilled ? state.filled.filter((i) => i !== index) : [...state.filled, index] });
  }
  function adjustDenominator(delta: number) {
    if (!canEdit) return;
    const next = Math.max(2, Math.min(12, state.denominator + delta));
    onChange({ denominator: next, filled: [] });
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto max-h-[70%] w-auto">
        {Array.from({ length: state.denominator }, (_, i) => (
          <path
            key={i}
            d={slicePath(i, state.denominator)}
            fill={state.filled.includes(i) ? "var(--ensena-primary)" : "#ffffff"}
            stroke="#1f2937"
            strokeWidth={1.5}
            onClick={() => toggleSlice(i)}
            className={canEdit ? "cursor-pointer" : undefined}
          />
        ))}
      </svg>
      <p className="text-sm font-semibold text-ensena-ink">
        {state.filled.length}/{state.denominator}
      </p>
      {canEdit && (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => adjustDenominator(-1)} aria-label="Fewer slices" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Minus className="size-3" />
          </button>
          <span className="text-[10px] text-ensena-muted">slices</span>
          <button type="button" onClick={() => adjustDenominator(1)} aria-label="More slices" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
