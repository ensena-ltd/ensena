"use client";

import { useRef } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

interface PlanePoint {
  id: string;
  x: number;
  y: number;
}

interface CoordinatePlaneState {
  range: number;
  points: PlanePoint[];
}

function isCoordinatePlaneState(s: Record<string, unknown>): boolean {
  return typeof s.range === "number" && Array.isArray(s.points);
}

const VIEWBOX = 300;

// Real click-to-plot: every tap resolves to an exact integer grid
// coordinate and is written into the synced `points` array, so "Tutor
// plots (3,5), student sees (3,5)" is just this state's onChange landing on
// both ends of the real-time channel — there is no separate "tutor view"
// and "student view" of the plane.
export function CoordinatePlaneToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: CoordinatePlaneState = isCoordinatePlaneState(rawState) ? (rawState as unknown as CoordinatePlaneState) : { range: 10, points: [] };
  const svgRef = useRef<SVGSVGElement>(null);
  const scale = VIEWBOX / 2 / state.range;

  function handleClick(clientX: number, clientY: number) {
    if (!canEdit || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * VIEWBOX;
    const py = ((clientY - rect.top) / rect.height) * VIEWBOX;
    const gx = Math.round((px - VIEWBOX / 2) / scale);
    const gy = Math.round((VIEWBOX / 2 - py) / scale);
    if (Math.abs(gx) > state.range || Math.abs(gy) > state.range) return;

    const existing = state.points.find((p) => p.x === gx && p.y === gy);
    if (existing) {
      onChange({ ...state, points: state.points.filter((p) => p.id !== existing.id) });
    } else {
      onChange({ ...state, points: [...state.points, { id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, x: gx, y: gy }] });
    }
  }

  function adjustRange(delta: number) {
    if (!canEdit) return;
    const next = Math.max(4, Math.min(50, state.range + delta));
    onChange({ ...state, range: next, points: state.points.filter((p) => Math.abs(p.x) <= next && Math.abs(p.y) <= next) });
  }
  function clearPoints() {
    if (!canEdit) return;
    onChange({ ...state, points: [] });
  }

  const axisTicks = Array.from({ length: state.range * 2 + 1 }, (_, i) => i - state.range);
  const labelEvery = state.range <= 10 ? 1 : state.range <= 25 ? 5 : 10;

  return (
    <div className="flex h-full flex-col p-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="w-full flex-1 cursor-crosshair"
        onClick={(e) => handleClick(e.clientX, e.clientY)}
      >
        <rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} fill="var(--ensena-bg-soft)" />
        {axisTicks.map((v) =>
          v % labelEvery === 0 ? (
            <line key={`gv-${v}`} x1={VIEWBOX / 2 + v * scale} y1={0} x2={VIEWBOX / 2 + v * scale} y2={VIEWBOX} stroke="#e5e7eb" strokeWidth={1} />
          ) : null
        )}
        {axisTicks.map((v) =>
          v % labelEvery === 0 ? (
            <line key={`gh-${v}`} x1={0} y1={VIEWBOX / 2 - v * scale} x2={VIEWBOX} y2={VIEWBOX / 2 - v * scale} stroke="#e5e7eb" strokeWidth={1} />
          ) : null
        )}
        <line x1={0} y1={VIEWBOX / 2} x2={VIEWBOX} y2={VIEWBOX / 2} stroke="#1f2937" strokeWidth={1.5} />
        <line x1={VIEWBOX / 2} y1={0} x2={VIEWBOX / 2} y2={VIEWBOX} stroke="#1f2937" strokeWidth={1.5} />
        {state.points.map((p) => (
          <g key={p.id}>
            <circle cx={VIEWBOX / 2 + p.x * scale} cy={VIEWBOX / 2 - p.y * scale} r={5} fill="var(--ensena-primary)" />
            <text x={VIEWBOX / 2 + p.x * scale + 8} y={VIEWBOX / 2 - p.y * scale - 6} fontSize={11} fill="#1f2937">
              ({p.x},{p.y})
            </text>
          </g>
        ))}
      </svg>
      {canEdit && (
        <div className="flex shrink-0 items-center justify-center gap-1.5 pt-1.5">
          <button type="button" onClick={() => adjustRange(-2)} aria-label="Zoom in" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Minus className="size-3" />
          </button>
          <span className="text-[10px] text-ensena-muted">±{state.range}</span>
          <button type="button" onClick={() => adjustRange(2)} aria-label="Zoom out" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" />
          </button>
          <button type="button" onClick={clearPoints} aria-label="Clear points" className="ml-1 flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <RotateCcw className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
