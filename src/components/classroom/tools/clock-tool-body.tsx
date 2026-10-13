"use client";

import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

interface ClockState {
  hours: number;
  minutes: number;
}

function isClockState(s: Record<string, unknown>): s is ClockState & Record<string, unknown> {
  return typeof s.hours === "number" && typeof s.minutes === "number";
}

function formatDigital(hours: number, minutes: number): string {
  const h = hours % 12 === 0 ? 12 : hours % 12;
  const period = hours >= 12 ? "PM" : "AM";
  return `${h}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// A real analog + digital clock — dragging either hand computes a genuine
// angle-to-time conversion and writes it into the synced `state`, so a
// tutor's drag and the resulting face are the same shared value every
// participant sees, not a decorative always-live system clock.
export function ClockToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const now = new Date();
  const state: ClockState = isClockState(rawState) ? (rawState as unknown as ClockState) : { hours: now.getHours(), minutes: now.getMinutes() };
  const faceRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<"hour" | "minute" | null>(null);

  const minuteAngle = state.minutes * 6;
  const hourAngle = (state.hours % 12) * 30 + state.minutes * 0.5;

  function angleFromPointer(clientX: number, clientY: number): number {
    const rect = faceRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const deg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI;
    return (deg + 360) % 360;
  }

  function applyDrag(hand: "hour" | "minute", clientX: number, clientY: number) {
    const angle = angleFromPointer(clientX, clientY);
    if (hand === "minute") {
      const minutes = Math.round(angle / 6) % 60;
      onChange({ ...state, minutes });
    } else {
      const hour12 = Math.round(angle / 30) % 12;
      const nextHours = (Math.floor(state.hours / 12) * 12 + hour12) % 24;
      onChange({ ...state, hours: nextHours });
    }
  }

  function onPointerDown(hand: "hour" | "minute") {
    return (e: React.PointerEvent) => {
      if (!canEdit) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(hand);
    };
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !canEdit) return;
    applyDrag(dragging, e.clientX, e.clientY);
  }
  function onPointerUp() {
    setDragging(null);
  }

  function reset() {
    if (!canEdit) return;
    const n = new Date();
    onChange({ hours: n.getHours(), minutes: n.getMinutes() });
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
      <svg
        ref={faceRef}
        viewBox="0 0 100 100"
        className="size-32 touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <circle cx={50} cy={50} r={47} fill="white" stroke="#e5e0da" strokeWidth={2} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 50 + Math.sin(a) * 40;
          const y1 = 50 - Math.cos(a) * 40;
          const x2 = 50 + Math.sin(a) * 44;
          const y2 = 50 - Math.cos(a) * 44;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8a8078" strokeWidth={1.5} />;
        })}
        {/* Hour hand */}
        <line
          x1={50}
          y1={50}
          x2={50 + Math.sin((hourAngle * Math.PI) / 180) * 22}
          y2={50 - Math.cos((hourAngle * Math.PI) / 180) * 22}
          stroke="#1f2937"
          strokeWidth={3.5}
          strokeLinecap="round"
          onPointerDown={onPointerDown("hour")}
          className={canEdit ? "cursor-grab" : undefined}
        />
        {/* Minute hand */}
        <line
          x1={50}
          y1={50}
          x2={50 + Math.sin((minuteAngle * Math.PI) / 180) * 34}
          y2={50 - Math.cos((minuteAngle * Math.PI) / 180) * 34}
          stroke="#f80248"
          strokeWidth={2.5}
          strokeLinecap="round"
          onPointerDown={onPointerDown("minute")}
          className={canEdit ? "cursor-grab" : undefined}
        />
        <circle cx={50} cy={50} r={2.5} fill="#1f2937" />
      </svg>
      <p className="font-mono text-sm font-semibold text-ensena-ink">{formatDigital(state.hours, state.minutes)}</p>
      {canEdit && (
        <button type="button" onClick={reset} className="flex items-center gap-1 rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
          <RotateCcw className="size-3" /> Set to now
        </button>
      )}
    </div>
  );
}
