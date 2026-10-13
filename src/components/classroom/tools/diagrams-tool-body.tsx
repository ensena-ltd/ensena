"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface DiagramLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface DiagramsState {
  labels: DiagramLabel[];
}

function isDiagramsState(s: Record<string, unknown>): s is DiagramsState & Record<string, unknown> {
  return Array.isArray(s.labels);
}

// A real, reusable labelled-diagram framework — click anywhere on the
// blank canvas to drop a numbered pin, then edit its label text; every
// pin's position and text lives in the synced `state`. Deliberately
// content-agnostic (no biology/physics-specific artwork) so the same tool
// works for labelling any diagram a tutor sketches on the whiteboard
// underneath it or describes verbally, per the spec's own "framework for
// future subjects" framing.
export function DiagramsToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: DiagramsState = isDiagramsState(rawState) ? (rawState as unknown as DiagramsState) : { labels: [] };
  const [editingId, setEditingId] = useState<string | null>(null);

  function addLabel(e: React.MouseEvent<SVGSVGElement>) {
    if (!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const label: DiagramLabel = { id: `lbl-${Date.now()}`, x, y, text: `Label ${state.labels.length + 1}` };
    onChange({ labels: [...state.labels, label] });
    setEditingId(label.id);
  }

  function setText(id: string, text: string) {
    onChange({ labels: state.labels.map((l) => (l.id === id ? { ...l, text } : l)) });
  }
  function removeLabel(id: string) {
    onChange({ labels: state.labels.filter((l) => l.id !== id) });
  }

  return (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <svg viewBox="0 0 100 100" onClick={addLabel} className={cn("relative min-h-0 w-full flex-1 rounded-lg border border-ensena-border bg-ensena-surface", canEdit && "cursor-crosshair")}>
        {state.labels.map((l, idx) => (
          <g key={l.id}>
            <circle cx={l.x} cy={l.y} r={2.4} fill="#f80248" />
            <text x={l.x + 3} y={l.y - 2} fontSize={3.5} fill="#1f2937">
              {idx + 1}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
        {state.labels.map((l, idx) => (
          <div key={l.id} className="flex items-center gap-1">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-bold text-white">{idx + 1}</span>
            {canEdit ? (
              <input
                value={l.text}
                onFocus={() => setEditingId(l.id)}
                onBlur={() => setEditingId(null)}
                onChange={(e) => setText(l.id, e.target.value)}
                autoFocus={editingId === l.id}
                className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
              />
            ) : (
              <span className="text-[11px] text-ensena-ink">{l.text}</span>
            )}
            {canEdit && (
              <button type="button" onClick={() => removeLabel(l.id)} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        ))}
        {state.labels.length === 0 && <p className="text-[11px] text-ensena-muted">{canEdit ? "Tap the diagram to add a label." : "No labels yet."}</p>}
      </div>
    </div>
  );
}

