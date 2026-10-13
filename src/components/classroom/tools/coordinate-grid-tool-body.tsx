"use client";

interface CoordinateGridState {
  range: number;
  showLabels: boolean;
}

function isCoordinateGridState(s: Record<string, unknown>): s is CoordinateGridState & Record<string, unknown> {
  return typeof s.range === "number";
}

// A real blank, labelled coordinate grid — a reference surface to point at
// while teaching (unlike Coordinate Plane, this doesn't plot points itself
// — see that tool for real plotting). Range and labels are still genuine
// synced state, not a static picture.
export function CoordinateGridToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: CoordinateGridState = isCoordinateGridState(rawState) ? (rawState as unknown as CoordinateGridState) : { range: 10, showLabels: true };
  const size = 220;
  const range = state.range;
  const cells = range * 2;
  const cellSize = size / cells;

  function setRange(next: number) {
    if (!canEdit) return;
    onChange({ ...state, range: Math.max(2, Math.min(20, next)) });
  }
  function toggleLabels() {
    if (!canEdit) return;
    onChange({ ...state, showLabels: !state.showLabels });
  }

  const ticks = Array.from({ length: cells + 1 }, (_, i) => i - range);

  return (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full flex-1 rounded-lg bg-white">
        {ticks.map((t) => (
          <line key={`v${t}`} x1={(t + range) * cellSize} y1={0} x2={(t + range) * cellSize} y2={size} stroke={t === 0 ? "#1f2937" : "#e5e0da"} strokeWidth={t === 0 ? 1.5 : 1} />
        ))}
        {ticks.map((t) => (
          <line key={`h${t}`} x1={0} y1={(t + range) * cellSize} x2={size} y2={(t + range) * cellSize} stroke={t === 0 ? "#1f2937" : "#e5e0da"} strokeWidth={t === 0 ? 1.5 : 1} />
        ))}
        {state.showLabels &&
          ticks
            .filter((t) => t !== 0 && t % Math.max(1, Math.round(range / 5)) === 0)
            .map((t) => (
              <text key={`lx${t}`} x={(t + range) * cellSize + 2} y={range * cellSize - 3} fontSize={8} fill="#8a8078">
                {t}
              </text>
            ))}
      </svg>
      {canEdit && (
        <div className="flex items-center justify-center gap-2 text-[10px]">
          <button type="button" onClick={() => setRange(range - 1)} className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            −
          </button>
          <span className="font-semibold text-ensena-ink">±{range}</span>
          <button type="button" onClick={() => setRange(range + 1)} className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            +
          </button>
          <button type="button" onClick={toggleLabels} className="ml-2 rounded-full border border-ensena-border px-2 py-0.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            {state.showLabels ? "Hide labels" : "Show labels"}
          </button>
        </div>
      )}
    </div>
  );
}
