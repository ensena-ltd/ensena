"use client";

import { useState } from "react";
import { Shuffle, X } from "lucide-react";

interface RandomPickerState {
  items: string[];
  result: string | null;
}

function isRandomPickerState(s: Record<string, unknown>): boolean {
  return Array.isArray(s.items);
}

// Picking itself is instant and local (there's nothing meaningful to
// animate in real time across the network) — only the final settled result
// is broadcast, via the normal onChange path. The brief spin animation is
// purely cosmetic local state so the tutor's click feels like something
// happened before the result appears for everyone.
export function RandomPickerToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: RandomPickerState = isRandomPickerState(rawState) ? (rawState as unknown as RandomPickerState) : { items: [], result: null };
  const [draft, setDraft] = useState("");
  const [spinning, setSpinning] = useState(false);

  function addItem() {
    const value = draft.trim();
    if (!value || !canEdit) return;
    onChange({ ...state, items: [...state.items, value] });
    setDraft("");
  }
  function removeItem(index: number) {
    if (!canEdit) return;
    onChange({ ...state, items: state.items.filter((_, i) => i !== index) });
  }
  function spin() {
    if (!canEdit || state.items.length === 0 || spinning) return;
    setSpinning(true);
    window.setTimeout(() => {
      const picked = state.items[Math.floor(Math.random() * state.items.length)];
      onChange({ ...state, result: picked });
      setSpinning(false);
    }, 500);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex min-h-14 items-center justify-center rounded-lg bg-ensena-bg-soft px-3 py-2 text-center">
        <p className="text-sm font-bold text-ensena-ink">{spinning ? "…" : (state.result ?? "No pick yet")}</p>
      </div>

      {canEdit && (
        <>
          <button
            type="button"
            onClick={spin}
            disabled={state.items.length === 0 || spinning}
            className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
          >
            <Shuffle className="size-3.5" /> Pick
          </button>
          <div className="flex gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Add a name or item…"
              className="h-7 min-w-0 flex-1 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
            />
            <button type="button" onClick={addItem} className="h-7 shrink-0 rounded-lg border border-ensena-border px-2 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              Add
            </button>
          </div>
          <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
            {state.items.map((item, i) => (
              <span key={`${item}-${i}`} className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-medium text-ensena-ink">
                {item}
                <button type="button" onClick={() => removeItem(i)} aria-label={`Remove ${item}`}>
                  <X className="size-2.5 text-ensena-muted" />
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
