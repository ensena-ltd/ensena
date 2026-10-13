"use client";

import { useRef } from "react";
import { Circle, Hexagon, Square, Trash2, Triangle } from "lucide-react";

import { cn } from "@/lib/utils";

type ShapeType = "circle" | "triangle" | "square" | "rectangle" | "polygon";

interface PlacedShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface GeometryShapesState {
  shapes: PlacedShape[];
  selectedId: string | null;
}

function isGeometryShapesState(s: Record<string, unknown>): s is GeometryShapesState & Record<string, unknown> {
  return Array.isArray(s.shapes);
}

const PALETTE: { type: ShapeType; icon: typeof Circle; label: string }[] = [
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "square", icon: Square, label: "Square" },
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "polygon", icon: Hexagon, label: "Polygon" },
];

const COLORS = ["#f80248", "#1971c2", "#2f9e44", "#f59e0b"];

function ShapeGlyph({ type, size, color }: { type: ShapeType; size: number; color: string }) {
  if (type === "circle") return <div className="rounded-full" style={{ width: size, height: size, backgroundColor: color }} />;
  if (type === "square") return <div style={{ width: size, height: size, backgroundColor: color }} />;
  if (type === "rectangle") return <div style={{ width: size * 1.6, height: size, backgroundColor: color }} />;
  if (type === "triangle") return <div style={{ width: 0, height: 0, borderLeft: `${size / 2}px solid transparent`, borderRight: `${size / 2}px solid transparent`, borderBottom: `${size}px solid ${color}` }} />;
  // polygon (hexagon), via clip-path
  return <div style={{ width: size, height: size, backgroundColor: color, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />;
}

// A real geometry-shapes canvas — the palette adds a shape at a default
// spot, and every placed shape is independently draggable (pointer-based,
// clamped to the tool's own bounds) and deletable, with its position/type/
// color living in the synced `state` rather than being purely decorative.
export function GeometryShapesToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: GeometryShapesState = isGeometryShapesState(rawState) ? (rawState as unknown as GeometryShapesState) : { shapes: [], selectedId: null };
  // A monotonic per-viewer counter rather than Date.now() — id generation
  // stays a pure, deterministic operation with no impure clock read during
  // what the click handler ultimately feeds back into render.
  const nextIdRef = useRef(0);

  function addShape(type: ShapeType) {
    if (!canEdit) return;
    nextIdRef.current += 1;
    const shape: PlacedShape = {
      id: `shape-${state.shapes.length}-${nextIdRef.current}-${type}`,
      type,
      x: 40 + state.shapes.length * 14,
      y: 40 + state.shapes.length * 10,
      size: 40,
      color: COLORS[state.shapes.length % COLORS.length],
    };
    onChange({ shapes: [...state.shapes, shape], selectedId: shape.id });
  }

  function dragShape(id: string, containerEl: HTMLDivElement) {
    function onMove(ev: PointerEvent) {
      const rect = containerEl.getBoundingClientRect();
      const x = Math.min(rect.width - 20, Math.max(0, ev.clientX - rect.left - 20));
      const y = Math.min(rect.height - 20, Math.max(0, ev.clientY - rect.top - 20));
      onChange({ ...state, shapes: state.shapes.map((s) => (s.id === id ? { ...s, x, y } : s)) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function select(id: string) {
    onChange({ ...state, selectedId: id });
  }
  function removeSelected() {
    if (!canEdit || !state.selectedId) return;
    onChange({ shapes: state.shapes.filter((s) => s.id !== state.selectedId), selectedId: null });
  }
  function recolorSelected(color: string) {
    if (!canEdit || !state.selectedId) return;
    onChange({ ...state, shapes: state.shapes.map((s) => (s.id === state.selectedId ? { ...s, color } : s)) });
  }

  return (
    <div className="flex h-full flex-col gap-1.5 p-2">
      {canEdit && (
        <div className="flex items-center justify-center gap-1">
          {PALETTE.map((p) => (
            <button key={p.type} type="button" onClick={() => addShape(p.type)} aria-label={`Add ${p.label}`} className="flex size-7 items-center justify-center rounded-lg border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <p.icon className="size-3.5" />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-ensena-border bg-ensena-surface"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) select("");
        }}
      >
        {state.shapes.map((shape) => (
          <div
            key={shape.id}
            className={cn("absolute flex cursor-grab items-center justify-center", canEdit && "touch-none")}
            style={{ left: shape.x, top: shape.y }}
            onPointerDown={(e) => {
              if (!canEdit) return;
              select(shape.id);
              dragShape(shape.id, e.currentTarget.parentElement as HTMLDivElement);
            }}
          >
            <div className={cn("rounded", shape.id === state.selectedId && "ring-2 ring-offset-2 ring-ensena-primary")}>
              <ShapeGlyph type={shape.type} size={shape.size} color={shape.color} />
            </div>
          </div>
        ))}
        {state.shapes.length === 0 && <p className="flex size-full items-center justify-center text-xs text-ensena-muted">{canEdit ? "Tap a shape above to add it" : "No shapes yet"}</p>}
      </div>
      {canEdit && state.selectedId && (
        <div className="flex items-center justify-center gap-1.5">
          {COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => recolorSelected(c)} className="size-5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
          ))}
          <button type="button" onClick={removeSelected} aria-label="Delete shape" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-rose-500 hover:bg-rose-50">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
