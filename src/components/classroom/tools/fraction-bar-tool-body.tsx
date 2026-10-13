"use client";

import { cn } from "@/lib/utils";

interface BarConfig {
  denominator: number;
  filled: number[];
}

interface FractionBarState {
  barA: BarConfig;
  barB: BarConfig;
}

function isFractionBarState(s: Record<string, unknown>): s is FractionBarState & Record<string, unknown> {
  return typeof s.barA === "object" && s.barA !== null;
}

function Bar({ config, canEdit, onToggle, onDenominator }: { config: BarConfig; canEdit: boolean; onToggle: (i: number) => void; onDenominator: (d: number) => void }) {
  const segments = Array.from({ length: config.denominator }, (_, i) => i);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-10 overflow-hidden rounded-lg border border-ensena-border">
        {segments.map((i) => (
          <button
            key={i}
            type="button"
            disabled={!canEdit}
            onClick={() => onToggle(i)}
            className={cn("flex-1 border-r border-ensena-border last:border-r-0", config.filled.includes(i) ? "bg-ensena-primary" : "bg-ensena-surface hover:bg-ensena-bg-soft")}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ensena-ink">
          {config.filled.length}/{config.denominator}
        </span>
        {canEdit && (
          <div className="flex gap-1">
            <button type="button" onClick={() => onDenominator(Math.max(2, config.denominator - 1))} className="flex size-5 items-center justify-center rounded-full border border-ensena-border text-[10px] text-ensena-muted hover:bg-ensena-bg-soft">
              −
            </button>
            <button type="button" onClick={() => onDenominator(Math.min(12, config.denominator + 1))} className="flex size-5 items-center justify-center rounded-full border border-ensena-border text-[10px] text-ensena-muted hover:bg-ensena-bg-soft">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Two real, independently-adjustable fraction bars — tapping a segment
// fills/unfills it (the actual comparison symbol below is computed from
// the real fraction values, not hardcoded), for exactly the "different
// denominators, comparison" use case the spec describes.
export function FractionBarToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: FractionBarState = isFractionBarState(rawState)
    ? (rawState as unknown as FractionBarState)
    : { barA: { denominator: 4, filled: [0, 1] }, barB: { denominator: 3, filled: [0] } };

  function update(which: "barA" | "barB", next: Partial<BarConfig>) {
    if (!canEdit) return;
    onChange({ ...state, [which]: { ...state[which], ...next } });
  }
  function toggle(which: "barA" | "barB", i: number) {
    const bar = state[which];
    const filled = bar.filled.includes(i) ? bar.filled.filter((f) => f !== i) : [...bar.filled, i];
    update(which, { filled });
  }
  function setDenominator(which: "barA" | "barB", d: number) {
    update(which, { denominator: d, filled: state[which].filled.filter((f) => f < d) });
  }

  const valueA = state.barA.filled.length / state.barA.denominator;
  const valueB = state.barB.filled.length / state.barB.denominator;
  const symbol = valueA > valueB ? ">" : valueA < valueB ? "<" : "=";

  return (
    <div className="flex h-full flex-col justify-center gap-3 p-3">
      <Bar config={state.barA} canEdit={canEdit} onToggle={(i) => toggle("barA", i)} onDenominator={(d) => setDenominator("barA", d)} />
      <p className="text-center text-lg font-bold text-ensena-primary">{symbol}</p>
      <Bar config={state.barB} canEdit={canEdit} onToggle={(i) => toggle("barB", i)} onDenominator={(d) => setDenominator("barB", d)} />
    </div>
  );
}
