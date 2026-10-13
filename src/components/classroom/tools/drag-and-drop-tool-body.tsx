"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface DropZone {
  id: string;
  label: string;
  description: string;
}

interface DragItem {
  id: string;
  text: string;
  color: string;
  correctZoneId: string;
}

interface DragAndDropState {
  zones: DropZone[];
  items: DragItem[];
  /** Each student's own item→zone placement, keyed by their real display name — never overwritten by another student's. */
  responses: Record<string, Record<string, string>>;
}

function isDragAndDropState(s: Record<string, unknown>): s is DragAndDropState & Record<string, unknown> {
  return Array.isArray(s.zones) && Array.isArray(s.items);
}

const ITEM_COLORS = ["#fee2e2", "#fef3c7", "#dcfce7", "#dbeafe", "#ede9fe", "#fce7f3"];

function defaultDragAndDrop(): DragAndDropState {
  const zones: DropZone[] = [
    { id: "z1", label: "Fruits", description: "" },
    { id: "z2", label: "Vegetables", description: "" },
  ];
  return {
    zones,
    items: [
      { id: "d1", text: "Apple", color: ITEM_COLORS[0], correctZoneId: "z1" },
      { id: "d2", text: "Carrot", color: ITEM_COLORS[1], correctZoneId: "z2" },
      { id: "d3", text: "Banana", color: ITEM_COLORS[2], correctZoneId: "z1" },
    ],
    responses: {},
  };
}

function scoreFor(state: DragAndDropState, studentName: string) {
  const placements = state.responses[studentName] ?? {};
  const placedIds = Object.keys(placements);
  const correct = state.items.filter((it) => placements[it.id] === it.correctZoneId).length;
  return { placed: placedIds.length, correct, total: state.items.length };
}

// A real drag-and-drop activity — genuine pointer-drag (not tap-to-assign;
// see the Sorting tool for that model) of item chips onto labelled drop
// zones. Each student's own placement lands under their own name in the
// shared `responses` map, never overwriting a classmate's. The host view
// shows a live per-student score summary derived straight from `responses`
// against each item's `correctZoneId` — no separate "grading" step needed.
export function DragAndDropToolBody({
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
  const state: DragAndDropState = isDragAndDropState(rawState) ? (rawState as unknown as DragAndDropState) : defaultDragAndDrop();
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  function setZoneLabel(id: string, label: string) {
    onChange({ ...state, zones: state.zones.map((z) => (z.id === id ? { ...z, label } : z)) });
  }
  function setZoneDescription(id: string, description: string) {
    onChange({ ...state, zones: state.zones.map((z) => (z.id === id ? { ...z, description } : z)) });
  }
  function addZone() {
    onChange({ ...state, zones: [...state.zones, { id: `z${Date.now()}`, label: "New zone", description: "" }] });
  }
  function removeZone(id: string) {
    onChange({ ...state, zones: state.zones.filter((z) => z.id !== id) });
  }
  function setItemText(id: string, text: string) {
    onChange({ ...state, items: state.items.map((it) => (it.id === id ? { ...it, text } : it)) });
  }
  function setItemColor(id: string, color: string) {
    onChange({ ...state, items: state.items.map((it) => (it.id === id ? { ...it, color } : it)) });
  }
  function setItemZone(id: string, correctZoneId: string) {
    onChange({ ...state, items: state.items.map((it) => (it.id === id ? { ...it, correctZoneId } : it)) });
  }
  function addItem() {
    onChange({ ...state, items: [...state.items, { id: `d${Date.now()}`, text: "New item", color: ITEM_COLORS[state.items.length % ITEM_COLORS.length], correctZoneId: state.zones[0]?.id ?? "" }] });
  }
  function removeItem(id: string) {
    onChange({ ...state, items: state.items.filter((it) => it.id !== id) });
  }

  if (isHost) {
    const studentNames = Object.keys(state.responses);
    return (
      <div className="flex h-full flex-col gap-2 overflow-y-auto p-2.5">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Drop zones</p>
          {state.zones.map((z) => (
            <div key={z.id} className="flex flex-col gap-1 rounded border border-ensena-border p-1.5">
              <div className="flex items-center gap-1">
                <input value={z.label} onChange={(e) => setZoneLabel(z.id, e.target.value)} className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
                <button type="button" onClick={() => removeZone(z.id)} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
                  <Trash2 className="size-3" />
                </button>
              </div>
              <input
                value={z.description}
                onChange={(e) => setZoneDescription(z.id, e.target.value)}
                placeholder="Description (optional)"
                className="h-6 rounded border border-ensena-border px-1.5 text-[10px] outline-none focus:border-ensena-primary"
              />
            </div>
          ))}
          <button type="button" onClick={addZone} className="flex h-6 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" /> Add zone
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Items</p>
          {state.items.map((it) => (
            <div key={it.id} className="flex items-center gap-1">
              <input value={it.text} onChange={(e) => setItemText(it.id, e.target.value)} className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
              <div className="flex shrink-0 items-center gap-0.5">
                {ITEM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setItemColor(it.id, c)}
                    className={cn("size-4 rounded-full border", it.color === c ? "border-ensena-primary ring-1 ring-ensena-primary" : "border-black/10")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <select value={it.correctZoneId} onChange={(e) => setItemZone(it.id, e.target.value)} className="h-6 rounded border border-ensena-border px-1 text-[10px] outline-none">
                {state.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
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
        <div className="flex flex-col gap-1 border-t border-ensena-border pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Student progress</p>
          {studentNames.length === 0 ? (
            <p className="text-[11px] text-ensena-muted">No student has placed any items yet.</p>
          ) : (
            studentNames.map((name) => {
              const { placed, correct, total } = scoreFor(state, name);
              const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
              return (
                <div key={name} className="flex items-center justify-between rounded border border-ensena-border px-2 py-1 text-[11px]">
                  <span className="font-medium text-ensena-ink">{name}</span>
                  <span className={cn("font-semibold", pct === 100 ? "text-emerald-600" : "text-ensena-muted")}>
                    {correct}/{total} correct ({pct}%) · {placed}/{total} placed
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const myPlacements = state.responses[selfName] ?? {};
  const unplaced = state.items.filter((it) => !myPlacements[it.id]);

  function startDrag(itemId: string) {
    if (!canEdit) return;
    setDraggingId(itemId);
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointerup", onUp);
      const container = containerRef.current;
      if (!container) return;
      const zoneEls = container.querySelectorAll<HTMLElement>("[data-zone-id]");
      for (const el of Array.from(zoneEls)) {
        const rect = el.getBoundingClientRect();
        if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          const zoneId = el.dataset.zoneId!;
          onChange({ ...state, responses: { ...state.responses, [selfName]: { ...myPlacements, [itemId]: zoneId } } });
          break;
        }
      }
      setDraggingId(null);
    }
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex flex-wrap gap-1.5">
        {unplaced.map((it) => (
          <div
            key={it.id}
            onPointerDown={() => startDrag(it.id)}
            className={cn("cursor-grab touch-none rounded-full border border-ensena-border px-2.5 py-1 text-[11px] font-medium text-ensena-ink shadow-sm", draggingId === it.id && "opacity-50")}
            style={{ backgroundColor: it.color }}
          >
            {it.text}
          </div>
        ))}
        {unplaced.length === 0 && <p className="text-[11px] text-ensena-muted">Everything&apos;s placed.</p>}
      </div>
      <div className="grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${state.zones.length}, minmax(0, 1fr))` }}>
        {state.zones.map((z) => (
          <div key={z.id} data-zone-id={z.id} className="flex flex-col gap-1 rounded-lg border border-dashed border-ensena-border p-1.5">
            <p className="text-[10px] font-semibold text-ensena-ink">{z.label}</p>
            {z.description && <p className="text-[9px] text-ensena-muted">{z.description}</p>}
            {state.items
              .filter((it) => myPlacements[it.id] === z.id)
              .map((it) => {
                const correct = it.correctZoneId === z.id;
                return (
                  <span
                    key={it.id}
                    className={cn("rounded px-1.5 py-0.5 text-[10px]", checked && (correct ? "ring-1 ring-emerald-500" : "ring-1 ring-rose-500"))}
                    style={{ backgroundColor: it.color }}
                  >
                    {it.text}
                  </span>
                );
              })}
          </div>
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
