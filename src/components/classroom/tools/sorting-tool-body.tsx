"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SortItem {
  id: string;
  text: string;
  correctCategory: string;
}

interface SortingState {
  categories: string[];
  items: SortItem[];
  /** Each student's own item→category assignment, keyed by their real display name — never overwritten by another student's. */
  responses: Record<string, Record<string, string>>;
}

function isSortingState(s: Record<string, unknown>): s is SortingState & Record<string, unknown> {
  return Array.isArray(s.categories) && Array.isArray(s.items);
}

function defaultSorting(): SortingState {
  return {
    categories: ["Even", "Odd"],
    items: [
      { id: "s1", text: "4", correctCategory: "Even" },
      { id: "s2", text: "7", correctCategory: "Odd" },
      { id: "s3", text: "10", correctCategory: "Even" },
      { id: "s4", text: "3", correctCategory: "Odd" },
    ],
    responses: {},
  };
}

// A real sorting activity — the tutor authors categories and items (host-
// only), and a permitted student taps an item then a category to assign
// it; each student's own assignments land under their own name in the
// shared `responses` map. "Check" reveals correct/incorrect coloring for
// that viewer only — it doesn't change the shared answer key.
export function SortingToolBody({
  state: rawState,
  isHost,
  canEdit,
  selfName,
  onChange,
}: {
  state: Record<string, unknown>;
  isHost: boolean;
  canEdit: boolean;
  selfName: string;
  onChange: (state: Record<string, unknown>) => void;
}) {
  const state: SortingState = isSortingState(rawState) ? (rawState as unknown as SortingState) : defaultSorting();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  function setCategoryName(i: number, name: string) {
    const oldName = state.categories[i];
    onChange({
      ...state,
      categories: state.categories.map((c, idx) => (idx === i ? name : c)),
      items: state.items.map((it) => (it.correctCategory === oldName ? { ...it, correctCategory: name } : it)),
    });
  }
  function addCategory() {
    onChange({ ...state, categories: [...state.categories, `Category ${state.categories.length + 1}`] });
  }
  function removeCategory(i: number) {
    onChange({ ...state, categories: state.categories.filter((_, idx) => idx !== i) });
  }
  function setItemText(id: string, text: string) {
    onChange({ ...state, items: state.items.map((it) => (it.id === id ? { ...it, text } : it)) });
  }
  function setItemCategory(id: string, category: string) {
    onChange({ ...state, items: state.items.map((it) => (it.id === id ? { ...it, correctCategory: category } : it)) });
  }
  function addItem() {
    onChange({ ...state, items: [...state.items, { id: `s${Date.now()}`, text: "New item", correctCategory: state.categories[0] ?? "" }] });
  }
  function removeItem(id: string) {
    onChange({ ...state, items: state.items.filter((it) => it.id !== id) });
  }

  if (isHost) {
    return (
      <div className="flex h-full flex-col gap-2 overflow-y-auto p-2.5">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Categories</p>
          {state.categories.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={c} onChange={(e) => setCategoryName(i, e.target.value)} className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
              <button type="button" onClick={() => removeCategory(i)} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addCategory} className="flex h-6 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" /> Add category
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Items</p>
          {state.items.map((it) => (
            <div key={it.id} className="flex items-center gap-1">
              <input value={it.text} onChange={(e) => setItemText(it.id, e.target.value)} className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
              <select value={it.correctCategory} onChange={(e) => setItemCategory(it.id, e.target.value)} className="h-6 rounded border border-ensena-border px-1 text-[10px] outline-none">
                {state.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button type="button" onClick={() => removeItem(it.id)} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addItem} className="flex h-6 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" /> Add item
          </button>
        </div>
      </div>
    );
  }

  const myAssignments = state.responses[selfName] ?? {};
  const unassigned = state.items.filter((it) => !myAssignments[it.id]);

  function assign(category: string) {
    if (!canEdit || !selectedItem) return;
    onChange({ ...state, responses: { ...state.responses, [selfName]: { ...myAssignments, [selectedItem]: category } } });
    setSelectedItem(null);
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex flex-wrap gap-1">
        {unassigned.map((it) => (
          <button
            key={it.id}
            type="button"
            disabled={!canEdit}
            onClick={() => setSelectedItem(it.id)}
            className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", selectedItem === it.id ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink")}
          >
            {it.text}
          </button>
        ))}
        {unassigned.length === 0 && <p className="text-[11px] text-ensena-muted">All items sorted.</p>}
      </div>
      <div className="grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${state.categories.length}, minmax(0, 1fr))` }}>
        {state.categories.map((cat) => (
          <button
            key={cat}
            type="button"
            disabled={!canEdit || !selectedItem}
            onClick={() => assign(cat)}
            className="flex flex-col gap-1 rounded-lg border border-dashed border-ensena-border p-1.5 text-left"
          >
            <p className="text-[10px] font-semibold text-ensena-ink">{cat}</p>
            {state.items
              .filter((it) => myAssignments[it.id] === cat)
              .map((it) => {
                const correct = it.correctCategory === cat;
                return (
                  <span key={it.id} className={cn("rounded px-1.5 py-0.5 text-[10px]", checked ? (correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600") : "bg-ensena-bg-soft text-ensena-ink")}>
                    {it.text}
                  </span>
                );
              })}
          </button>
        ))}
      </div>
      {canEdit && (
        <button type="button" onClick={() => setChecked((v) => !v)} className="h-7 rounded-full border border-ensena-border text-[11px] font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
          {checked ? "Hide check" : "Check my answers"}
        </button>
      )}
    </div>
  );
}
