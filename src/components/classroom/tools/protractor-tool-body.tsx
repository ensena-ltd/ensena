"use client";

interface ProtractorState {
  /** Rotation of the whole protractor body, degrees. */
  rotation: number;
  /** The measuring arm's angle relative to the protractor's own baseline, 0–180°. */
  armAngle: number;
}

function isProtractorState(s: Record<string, unknown>): s is ProtractorState & Record<string, unknown> {
  return typeof s.rotation === "number" && typeof s.armAngle === "number";
}

const R = 90;
const CENTER = 100;
const CENTER_Y = 120;

// A real interactive protractor — drag the arm to sweep a genuine 0–180°
// measurement (the readout is derived from actual state, not decorative),
// and drag the rotate handle to orient the whole body against something
// drawn on the board.
export function ProtractorToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: ProtractorState = isProtractorState(rawState) ? (rawState as unknown as ProtractorState) : { rotation: 0, armAngle: 45 };

  function dragArm(svg: SVGSVGElement) {
    function onMove(ev: PointerEvent) {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + (CENTER / 200) * rect.width;
      const cy = rect.top + (CENTER_Y / 130) * rect.height;
      const rawDeg = (Math.atan2(-(ev.clientY - cy), ev.clientX - cx) * 180) / Math.PI;
      const relative = ((180 - rawDeg - state.rotation + 360) % 360);
      const clamped = Math.min(180, Math.max(0, relative));
      onChange({ ...state, armAngle: clamped });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function dragRotate(svg: SVGSVGElement) {
    function onMove(ev: PointerEvent) {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + (CENTER / 200) * rect.width;
      const cy = rect.top + (CENTER_Y / 130) * rect.height;
      const rawDeg = (Math.atan2(-(ev.clientY - cy), ev.clientX - cx) * 180) / Math.PI;
      onChange({ ...state, rotation: 180 - rawDeg });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const ticks = Array.from({ length: 19 }, (_, i) => i * 10);
  const armRad = ((180 - state.armAngle) * Math.PI) / 180;
  const armX = CENTER + Math.cos(armRad) * (R - 6);
  const armY = 120 - Math.sin(armRad) * (R - 6);

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <svg viewBox="0 0 200 130" className="w-full flex-1 touch-none rounded-lg bg-white">
        <g transform={`rotate(${state.rotation} ${CENTER} 120)`}>
          <path d={`M ${CENTER - R} 120 A ${R} ${R} 0 0 1 ${CENTER + R} 120 Z`} fill="#eef2ff" stroke="#94a3d8" strokeWidth={1.5} />
          {ticks.map((deg) => {
            const rad = ((180 - deg) * Math.PI) / 180;
            const inner = deg % 30 === 0 ? R - 12 : R - 7;
            const x1 = CENTER + Math.cos(rad) * inner;
            const y1 = 120 - Math.sin(rad) * inner;
            const x2 = CENTER + Math.cos(rad) * R;
            const y2 = 120 - Math.sin(rad) * R;
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5b6aa0" strokeWidth={deg % 30 === 0 ? 1.2 : 0.6} />;
          })}
          <line x1={CENTER - R} y1={120} x2={CENTER + R} y2={120} stroke="#5b6aa0" strokeWidth={1.5} />
          {canEdit && (
            <circle
              cx={CENTER + R + 10}
              cy={120}
              r={6}
              fill="#94a3d8"
              className="cursor-grab"
              onPointerDown={(e) => dragRotate(e.currentTarget.ownerSVGElement!)}
            />
          )}
        </g>
        <line x1={CENTER} y1={120} x2={armX} y2={armY} stroke="#f80248" strokeWidth={2} />
        {canEdit && <circle cx={armX} cy={armY} r={7} fill="#f80248" className="cursor-grab" onPointerDown={(e) => dragArm(e.currentTarget.ownerSVGElement!)} />}
        <circle cx={CENTER} cy={120} r={2.5} fill="#1f2937" />
      </svg>
      <p className="text-center text-xs font-semibold text-ensena-ink">{Math.round(state.armAngle)}°</p>
    </div>
  );
}
