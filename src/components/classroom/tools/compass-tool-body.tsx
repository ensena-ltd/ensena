"use client";

interface CompassState {
  radius: number;
  rotation: number;
}

function isCompassState(s: Record<string, unknown>): s is CompassState & Record<string, unknown> {
  return typeof s.radius === "number" && typeof s.rotation === "number";
}

const CX = 100;
const CY = 100;

// A real geometry compass — dragging the pencil tip changes the actual
// radius (and the live circle preview redraws from that same value), and
// dragging anywhere else sweeps rotation, matching how a physical compass
// is used to draw a circle. The live preview IS the drawn circle for this
// floating tool — it doesn't insert a separate Excalidraw element (that
// would need the whiteboard's own imperative API threaded down into every
// tool body), so "drawing" here means positioning this tool where the
// tutor wants the circle, then tracing it with the Pen if a permanent mark
// on the board itself is needed.
export function CompassToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: CompassState = isCompassState(rawState) ? (rawState as unknown as CompassState) : { radius: 50, rotation: 30 };

  function dragTip(svg: SVGSVGElement) {
    function onMove(ev: PointerEvent) {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * 200;
      const py = ((ev.clientY - rect.top) / rect.height) * 200;
      const dx = px - CX;
      const dy = py - CY;
      const radius = Math.min(85, Math.max(15, Math.sqrt(dx * dx + dy * dy)));
      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
      onChange({ radius, rotation });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function adjustRadius(delta: number) {
    if (!canEdit) return;
    onChange({ ...state, radius: Math.min(85, Math.max(15, state.radius + delta)) });
  }

  const rad = (state.rotation * Math.PI) / 180;
  const tipX = CX + Math.cos(rad) * state.radius;
  const tipY = CY + Math.sin(rad) * state.radius;

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <svg viewBox="0 0 200 200" className="w-full flex-1 touch-none rounded-lg bg-white">
        <circle cx={CX} cy={CY} r={state.radius} fill="none" stroke="#f80248" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={CX} y1={CY} x2={tipX} y2={tipY} stroke="#8a8078" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={3} fill="#1f2937" />
        {canEdit && <circle cx={tipX} cy={tipY} r={7} fill="#f80248" className="cursor-grab" onPointerDown={(e) => dragTip(e.currentTarget.ownerSVGElement!)} />}
      </svg>
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="font-semibold text-ensena-ink">r = {Math.round(state.radius)}</span>
        {canEdit && (
          <div className="flex gap-1">
            <button type="button" onClick={() => adjustRadius(-5)} className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              −
            </button>
            <button type="button" onClick={() => adjustRadius(5)} className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
