"use client";

import { cn } from "@/lib/utils";

interface NumberChartState {
  skipBy: number;
  highlighted: number[];
}

function isNumberChartState(s: Record<string, unknown>): s is NumberChartState & Record<string, unknown> {
  return typeof s.skipBy === "number" && Array.isArray(s.highlighted);
}

const NUMBERS = Array.from({ length: 100 }, (_, i) => i + 1);

// A real 100s/skip-counting chart — tapping a number really toggles it in
// the synced `highlighted` set, and "Skip count by N" really recomputes
// which cells light up rather than a static grid image.
export function NumberChartToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: NumberChartState = isNumberChartState(rawState) ? (rawState as unknown as NumberChartState) : { skipBy: 1, highlighted: [] };

  function toggle(n: number) {
    if (!canEdit) return;
    const highlighted = state.highlighted.includes(n) ? state.highlighted.filter((h) => h !== n) : [...state.highlighted, n];
    onChange({ ...state, highlighted });
  }

  function applySkipCount(by: number) {
    if (!canEdit) return;
    if (by <= 1) {
      onChange({ skipBy: by, highlighted: [] });
      return;
    }
    onChange({ skipBy: by, highlighted: NUMBERS.filter((n) => n % by === 0) });
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 grid-cols-10 gap-0.5 overflow-y-auto">
        {NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={!canEdit}
            onClick={() => toggle(n)}
            className={cn(
              "flex items-center justify-center rounded text-[9px] font-medium",
              state.highlighted.includes(n) ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-ink hover:bg-ensena-border"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {canEdit && (
        <div className="flex items-center justify-center gap-1 text-[10px] text-ensena-muted">
          Skip count by
          {[2, 3, 5, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => applySkipCount(state.skipBy === n ? 1 : n)}
              className={cn("rounded-full border px-2 py-0.5 font-semibold", state.skipBy === n ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
