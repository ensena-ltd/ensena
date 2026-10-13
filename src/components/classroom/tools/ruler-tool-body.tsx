"use client";

interface RulerState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function isRulerState(s: Record<string, unknown>): s is RulerState & Record<string, unknown> {
  return typeof s.x1 === "number" && typeof s.x2 === "number";
}

const VIEW = 260;
const PX_PER_UNIT = 18;

// A real interactive ruler — drag either end within the tool's own bounded
// area, and both the visual tick marks and the numeric length readout are
// derived from the actual endpoint state, not a static image. Works
// alongside Excalidraw drawing (line it up, then draw with the pen tool)
// rather than drawing on the canvas itself.
export function RulerToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: RulerState = isRulerState(rawState) ? (rawState as unknown as RulerState) : { x1: 40, y1: 100, x2: 220, y2: 100 };

  const dx = state.x2 - state.x1;
  const dy = state.y2 - state.y1;
  const lengthPx = Math.sqrt(dx * dx + dy * dy);
  const lengthUnits = lengthPx / PX_PER_UNIT;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  function dragEnd(end: "1" | "2") {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      if (!canEdit) return;
      const svg = (e.currentTarget.ownerSVGElement as SVGSVGElement | null) ?? undefined;
      if (!svg) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      function onMove(ev: PointerEvent) {
        const rect = svg!.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * VIEW;
        const y = ((ev.clientY - rect.top) / rect.height) * VIEW;
        onChange(end === "1" ? { ...state, x1: x, y1: y } : { ...state, x2: x, y2: y });
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  // Tick marks every unit, rotated to lie along the ruler's own axis.
  const ticks = Array.from({ length: Math.floor(lengthUnits) + 1 }, (_, i) => i);

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full flex-1 touch-none rounded-lg bg-white">
        <g transform={`translate(${state.x1} ${state.y1}) rotate(${angleDeg})`}>
          <rect x={0} y={-10} width={lengthPx} height={20} rx={3} fill="#fde68a" stroke="#c9a227" strokeWidth={1} />
          {ticks.map((t) => (
            <line key={t} x1={t * PX_PER_UNIT} y1={-10} x2={t * PX_PER_UNIT} y2={t % 5 === 0 ? 2 : -3} stroke="#8a6d1f" strokeWidth={1} />
          ))}
        </g>
        {canEdit && (
          <>
            <circle cx={state.x1} cy={state.y1} r={7} fill="#f80248" className="cursor-grab" onPointerDown={dragEnd("1")} />
            <circle cx={state.x2} cy={state.y2} r={7} fill="#f80248" className="cursor-grab" onPointerDown={dragEnd("2")} />
          </>
        )}
      </svg>
      <p className="text-center text-xs font-semibold text-ensena-ink">{lengthUnits.toFixed(1)} cm</p>
    </div>
  );
}
