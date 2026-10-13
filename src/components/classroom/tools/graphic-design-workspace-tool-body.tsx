"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Circle, Copy, Download, Minus, Square, Trash2, Type } from "lucide-react";

import { cn } from "@/lib/utils";

type DesignShapeType = "rect" | "ellipse" | "line" | "text";

interface DesignShape {
  id: string;
  type: DesignShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  text: string;
  fontSize: number;
  z: number;
}

interface DesignDocument {
  shapes: DesignShape[];
}

interface GraphicDesignState {
  title: string;
  instructions: string;
  canvasWidth: number;
  canvasHeight: number;
  starterShapes: DesignShape[];
  launched: boolean;
  /** Each student's own independent design, keyed by their real display name. */
  responses: Record<string, DesignDocument>;
}

function isGraphicDesignState(s: Record<string, unknown>): s is GraphicDesignState & Record<string, unknown> {
  return Array.isArray(s.starterShapes) && typeof s.responses === "object";
}

function defaultState(): GraphicDesignState {
  return { title: "Graphic Design", instructions: "", canvasWidth: 320, canvasHeight: 220, starterShapes: [], launched: false, responses: {} };
}

const FILL_COLORS = ["#f80248", "#1971c2", "#2f9e44", "#f59e0b", "#7c3aed", "#111827", "#ffffff"];

const TOOL_DEFS: { type: DesignShapeType; icon: typeof Square; label: string }[] = [
  { type: "rect", icon: Square, label: "Rectangle" },
  { type: "ellipse", icon: Circle, label: "Ellipse" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "text", icon: Type, label: "Text" },
];

function ShapeView({ shape }: { shape: DesignShape }) {
  const style: CSSProperties = { position: "absolute", left: shape.x, top: shape.y, width: shape.width, height: shape.height, zIndex: shape.z };
  if (shape.type === "rect") return <div style={{ ...style, backgroundColor: shape.fill, border: `2px solid ${shape.stroke}` }} />;
  if (shape.type === "ellipse") return <div style={{ ...style, backgroundColor: shape.fill, border: `2px solid ${shape.stroke}`, borderRadius: "9999px" }} />;
  if (shape.type === "line") {
    const dx = shape.width;
    const dy = shape.height;
    const length = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return (
      <div
        style={{
          position: "absolute",
          left: shape.x,
          top: shape.y,
          width: length,
          height: Math.max(2, shape.fontSize ? 0 : 2),
          borderTop: `3px solid ${shape.stroke}`,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 0",
          zIndex: shape.z,
        }}
      />
    );
  }
  return (
    <p style={{ ...style, color: shape.fill, fontSize: shape.fontSize, whiteSpace: "pre-wrap", lineHeight: 1.15 }} className="font-semibold">
      {shape.text}
    </p>
  );
}

function drawShapeOnCanvas(ctx: CanvasRenderingContext2D, shape: DesignShape) {
  ctx.fillStyle = shape.fill;
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = 2;
  if (shape.type === "rect") {
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  } else if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(shape.x + shape.width / 2, shape.y + shape.height / 2, Math.abs(shape.width) / 2, Math.abs(shape.height) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === "line") {
    ctx.beginPath();
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.font = `600 ${shape.fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(shape.text, shape.x, shape.y);
  }
}

function exportToPng(doc: DesignDocument, width: number, height: number, filename: string) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  for (const shape of [...doc.shapes].sort((a, b) => a.z - b.z)) drawShapeOnCanvas(ctx, shape);
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// A real shape-based design canvas: rectangles/ellipses/lines/text, each
// independently draggable and resizable (pointer-based, same convention as
// the Geometry Shapes tool) with fill/stroke color and a working "Export
// PNG" that rasterizes the shape list onto an offscreen <canvas> — real
// output, not a screenshot-of-the-DOM hack, since every shape here already
// has a direct 1:1 canvas-drawing equivalent.
function DesignCanvas({
  doc,
  width,
  height,
  canEdit,
  onChange,
}: {
  doc: DesignDocument;
  width: number;
  height: number;
  canEdit: boolean;
  onChange: (doc: DesignDocument) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nextIdRef = useRef(0);
  const shapes = doc.shapes;
  const selected = shapes.find((s) => s.id === selectedId) ?? null;

  function update(id: string, patch: Partial<DesignShape>) {
    onChange({ shapes: shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function addShape(type: DesignShapeType) {
    if (!canEdit) return;
    nextIdRef.current += 1;
    const maxZ = shapes.reduce((m, s) => Math.max(m, s.z), 0);
    const base = { id: `shape-${shapes.length}-${nextIdRef.current}`, type, x: 20, y: 20, z: maxZ + 1, fill: "#f80248", stroke: "#111827", text: "Text", fontSize: 18 };
    const shape: DesignShape =
      type === "line" ? { ...base, width: 80, height: 0 } : type === "text" ? { ...base, width: 100, height: 24 } : { ...base, width: 80, height: 60 };
    onChange({ shapes: [...shapes, shape] });
    setSelectedId(shape.id);
  }
  function removeSelected() {
    if (!canEdit || !selectedId) return;
    onChange({ shapes: shapes.filter((s) => s.id !== selectedId) });
    setSelectedId(null);
  }
  function duplicateSelected() {
    if (!canEdit || !selected) return;
    nextIdRef.current += 1;
    const maxZ = shapes.reduce((m, s) => Math.max(m, s.z), 0);
    const copy: DesignShape = { ...selected, id: `shape-${shapes.length}-${nextIdRef.current}`, x: selected.x + 12, y: selected.y + 12, z: maxZ + 1 };
    onChange({ shapes: [...shapes, copy] });
    setSelectedId(copy.id);
  }
  function bringToFront() {
    if (!canEdit || !selected) return;
    const maxZ = shapes.reduce((m, s) => Math.max(m, s.z), 0);
    update(selected.id, { z: maxZ + 1 });
  }

  function startDrag(id: string, containerEl: HTMLDivElement, anchorClientX: number, anchorClientY: number) {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;
    const startX = shape.x;
    const startY = shape.y;
    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - anchorClientX;
      const dy = ev.clientY - anchorClientY;
      const rect = containerEl.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, startX + dx));
      const y = Math.min(rect.height, Math.max(0, startY + dy));
      update(id, { x, y });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(id: string, anchorClientX: number, anchorClientY: number) {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;
    const startW = shape.width;
    const startH = shape.height;
    const isLine = shape.type === "line";
    function onMove(ev: PointerEvent) {
      const dw = ev.clientX - anchorClientX;
      const dh = ev.clientY - anchorClientY;
      update(id, { width: Math.max(10, startW + dw), height: isLine ? startH + dh : Math.max(10, startH + dh) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="flex h-full flex-col gap-1.5">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-1">
          {TOOL_DEFS.map((t) => (
            <button key={t.type} type="button" onClick={() => addShape(t.type)} aria-label={`Add ${t.label}`} className="flex size-6 items-center justify-center rounded border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <t.icon className="size-3.5" />
            </button>
          ))}
          {selected && (
            <>
              <span className="mx-0.5 h-4 w-px bg-ensena-border" />
              {FILL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Fill ${c}`}
                  onClick={() => update(selected.id, { fill: c })}
                  className={cn("size-4 rounded-full border", selected.fill === c ? "border-ensena-primary ring-1 ring-ensena-primary" : "border-black/20")}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button type="button" onClick={duplicateSelected} aria-label="Duplicate" className="flex size-6 items-center justify-center rounded text-ensena-muted hover:bg-ensena-bg-soft">
                <Copy className="size-3.5" />
              </button>
              <button type="button" onClick={removeSelected} aria-label="Delete" className="flex size-6 items-center justify-center rounded text-rose-500 hover:bg-rose-50">
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => exportToPng(doc, width, height, "design.png")}
            className="ml-auto flex items-center gap-1 rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Download className="size-3" /> Export PNG
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-ensena-border bg-ensena-bg-soft p-2">
        <div
          className="relative bg-white shadow-sm"
          style={{ width, height }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          {[...shapes]
            .sort((a, b) => a.z - b.z)
            .map((shape) => (
              <div
                key={shape.id}
                className={cn(canEdit && "cursor-grab touch-none", shape.id === selectedId && "outline outline-2 outline-offset-1 outline-ensena-primary")}
                style={{ position: "absolute", left: shape.x - 1, top: shape.y - 1, width: shape.type === "line" ? Math.max(shape.width, 1) : shape.width + 2, height: shape.type === "line" ? Math.max(Math.abs(shape.height), 1) : shape.height + 2, zIndex: shape.z }}
                onPointerDown={(e) => {
                  if (!canEdit) return;
                  setSelectedId(shape.id);
                  startDrag(shape.id, e.currentTarget.parentElement as HTMLDivElement, e.clientX, e.clientY);
                }}
              >
                <ShapeView shape={{ ...shape, x: 0, y: 0 }} />
              </div>
            ))}
          {canEdit && selected && selected.type !== "line" && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                startResize(selected.id, e.clientX, e.clientY);
              }}
              className="absolute size-3 touch-none cursor-nwse-resize rounded-sm bg-ensena-primary"
              style={{ left: selected.x + selected.width - 5, top: selected.y + selected.height - 5, zIndex: 999 }}
            />
          )}
        </div>
      </div>
      {canEdit && selected && (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={bringToFront} className="rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            Bring to front
          </button>
          {selected.type === "text" && (
            <input
              value={selected.text}
              onChange={(e) => update(selected.id, { text: e.target.value })}
              className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function GraphicDesignWorkspaceToolBody({
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
  const state: GraphicDesignState = isGraphicDesignState(rawState) ? (rawState as unknown as GraphicDesignState) : defaultState();
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
  const studentNames = Object.keys(state.responses);
  const myDoc = state.responses[selfName] ?? null;

  useEffect(() => {
    if (isHost || !state.launched || myDoc) return;
    onChange({ ...state, responses: { ...state.responses, [selfName]: { shapes: state.starterShapes } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, state.launched, myDoc, selfName]);

  if (isHost) {
    const viewedDoc = viewingStudent ? state.responses[viewingStudent] : null;
    return (
      <div className="flex h-full flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <input
            value={state.title}
            onChange={(e) => onChange({ ...state, title: e.target.value })}
            className="h-7 min-w-0 flex-1 rounded-lg border border-ensena-border px-2 text-xs font-semibold outline-none focus:border-ensena-primary"
          />
          <button
            type="button"
            onClick={() => onChange({ ...state, launched: !state.launched })}
            className={cn("h-7 shrink-0 rounded-full px-3 text-[11px] font-semibold", state.launched ? "bg-emerald-100 text-emerald-700" : "bg-ensena-primary text-white")}
          >
            {state.launched ? "Launched" : "Launch"}
          </button>
        </div>
        {studentNames.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-ensena-muted">Viewing:</span>
            <select value={viewingStudent ?? ""} onChange={(e) => setViewingStudent(e.target.value || null)} className="h-6 rounded border border-ensena-border px-1 text-[11px] outline-none">
              <option value="">My starter template</option>
              {studentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {viewedDoc ? (
            <DesignCanvas doc={viewedDoc} width={state.canvasWidth} height={state.canvasHeight} canEdit={false} onChange={() => {}} />
          ) : (
            <DesignCanvas doc={{ shapes: state.starterShapes }} width={state.canvasWidth} height={state.canvasHeight} canEdit onChange={(doc) => onChange({ ...state, starterShapes: doc.shapes })} />
          )}
        </div>
      </div>
    );
  }

  if (!state.launched) {
    return <div className="flex h-full items-center justify-center p-4 text-center text-xs text-ensena-muted">Waiting for your tutor to launch the design activity…</div>;
  }

  if (!myDoc) {
    return <div className="flex h-full items-center justify-center p-4 text-center text-xs text-ensena-muted">Loading your canvas…</div>;
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <p className="truncate text-xs font-semibold text-ensena-ink">{state.title}</p>
      {state.instructions && <p className="rounded-lg bg-ensena-bg-soft p-1.5 text-[11px] text-ensena-ink">{state.instructions}</p>}
      <div className="min-h-0 flex-1">
        <DesignCanvas doc={myDoc} width={state.canvasWidth} height={state.canvasHeight} canEdit={canEdit} onChange={(doc) => onChange({ ...state, responses: { ...state.responses, [selfName]: doc } })} />
      </div>
    </div>
  );
}
