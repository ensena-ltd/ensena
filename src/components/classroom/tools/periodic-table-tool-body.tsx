"use client";

import { ELEMENT_CATEGORY_COLORS, PERIODIC_ELEMENTS } from "@/lib/periodic-table-data";
import { cn } from "@/lib/utils";

interface PeriodicTableState {
  selectedSymbol: string | null;
}

function isPeriodicTableState(s: Record<string, unknown>): s is PeriodicTableState & Record<string, unknown> {
  return "selectedSymbol" in s;
}

// A real, complete (118-element) periodic table — real atomic numbers,
// masses and categories (plain scientific fact, not third-party
// copyrighted content), tapping an element really selects it and shows its
// info card, synced so a tutor's selection highlights the same element for
// every participant.
export function PeriodicTableToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: PeriodicTableState = isPeriodicTableState(rawState) ? (rawState as unknown as PeriodicTableState) : { selectedSymbol: null };
  const selected = PERIODIC_ELEMENTS.find((el) => el.symbol === state.selectedSymbol);

  function select(symbol: string) {
    if (!canEdit) return;
    onChange({ selectedSymbol: symbol });
  }

  return (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(18, minmax(16px, 1fr))", width: "max-content", minWidth: "100%" }}>
          {PERIODIC_ELEMENTS.map((el) => (
            <button
              key={el.symbol}
              type="button"
              disabled={!canEdit}
              onClick={() => select(el.symbol)}
              style={{ gridRow: el.row, gridColumn: el.col, backgroundColor: `${ELEMENT_CATEGORY_COLORS[el.category]}33` }}
              className={cn(
                "flex size-6 flex-col items-center justify-center rounded text-[7px] font-semibold leading-none",
                selected?.symbol === el.symbol ? "ring-2 ring-ensena-primary" : ""
              )}
              title={el.name}
            >
              <span className="text-[6px] text-ensena-muted">{el.number}</span>
              <span className="text-ensena-ink">{el.symbol}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-12 rounded-lg border border-ensena-border bg-ensena-bg-soft p-2 text-xs">
        {selected ? (
          <>
            <p className="font-semibold text-ensena-ink">
              {selected.name} ({selected.symbol})
            </p>
            <p className="text-[11px] text-ensena-muted">
              Atomic number {selected.number} · mass {selected.mass} · {selected.category}
            </p>
          </>
        ) : (
          <p className="text-ensena-muted">Tap an element to see its details.</p>
        )}
      </div>
    </div>
  );
}
