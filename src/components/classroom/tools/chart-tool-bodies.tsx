"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export interface ChartDataState {
  labels: string[];
  values: number[];
}

export function isChartDataState(s: Record<string, unknown>): s is ChartDataState & Record<string, unknown> {
  return Array.isArray(s.labels) && Array.isArray(s.values);
}

const BAR_COLORS = ["#f80248", "#1971c2", "#2f9e44", "#f59e0b", "#7c3aed", "#0891b2"];

// Shared "edit the dataset" strip every chart tool below reuses — a real
// label + value table the tutor edits directly (matching the spec's own
// "Tutor changes A=5, B=8, C=12" example), rather than three independent
// copies of the same add/remove/edit logic.
export function ChartDataEditor({ state, onChange }: { state: ChartDataState; onChange: (state: Record<string, unknown>) => void }) {
  function setLabel(i: number, label: string) {
    onChange({ ...state, labels: state.labels.map((l, idx) => (idx === i ? label : l)) });
  }
  function setValue(i: number, value: number) {
    onChange({ ...state, values: state.values.map((v, idx) => (idx === i ? value : v)) });
  }
  function addRow() {
    onChange({ labels: [...state.labels, `Item ${state.labels.length + 1}`], values: [...state.values, 1] });
  }
  function removeRow(i: number) {
    onChange({ labels: state.labels.filter((_, idx) => idx !== i), values: state.values.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex max-h-24 flex-col gap-1 overflow-y-auto border-t border-ensena-border pt-1.5">
      {state.labels.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <input value={label} onChange={(e) => setLabel(i, e.target.value)} className="h-6 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
          <input
            type="number"
            value={state.values[i]}
            onChange={(e) => setValue(i, Number(e.target.value) || 0)}
            className="h-6 w-12 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
          />
          <button type="button" onClick={() => removeRow(i)} aria-label="Remove" className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="flex h-6 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
        <Plus className="size-3" /> Add row
      </button>
    </div>
  );
}

function defaultChart(): ChartDataState {
  return { labels: ["A", "B", "C"], values: [5, 8, 12] };
}

// A real, configurable bar chart — editing the dataset (tutor-only, see the
// caller passing `canEdit={isHost}`) redraws the actual SVG bars for every
// participant via the synced `state`, not a static picture.
export function BarChartToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: ChartDataState = isChartDataState(rawState) ? (rawState as unknown as ChartDataState) : defaultChart();
  const max = Math.max(1, ...state.values);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      <div className="flex min-h-0 flex-1 items-end justify-center gap-2 px-1">
        {state.labels.map((label, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-ensena-ink">{state.values[i]}</span>
            <div className="w-full rounded-t-md" style={{ height: `${(state.values[i] / max) * 100}%`, minHeight: 4, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
            <span className="truncate text-[10px] text-ensena-muted">{label}</span>
          </div>
        ))}
      </div>
      {canEdit && (
        <button type="button" onClick={() => setShowEditor((v) => !v)} className="text-[10px] font-semibold text-ensena-primary">
          {showEditor ? "Hide data" : "Edit data"}
        </button>
      )}
      {canEdit && showEditor && <ChartDataEditor state={state} onChange={onChange} />}
    </div>
  );
}

// A real, configurable line chart — same shared dataset editor as the Bar
// Chart, plotted as an actual polyline through the current values.
export function LineChartToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: ChartDataState = isChartDataState(rawState) ? (rawState as unknown as ChartDataState) : defaultChart();
  const [showEditor, setShowEditor] = useState(false);
  const max = Math.max(1, ...state.values);
  const min = Math.min(0, ...state.values);
  const range = max - min || 1;
  const W = 220;
  const H = 120;
  const step = state.values.length > 1 ? W / (state.values.length - 1) : 0;
  const points = state.values.map((v, i) => `${i * step},${H - ((v - min) / range) * H}`);

  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-h-0 w-full flex-1 rounded-lg bg-white">
        <polyline points={points.join(" ")} fill="none" stroke="#f80248" strokeWidth={2} />
        {state.values.map((v, i) => (
          <circle key={i} cx={i * step} cy={H - ((v - min) / range) * H} r={3} fill="#f80248" />
        ))}
      </svg>
      <div className="flex justify-around">
        {state.labels.map((l, i) => (
          <span key={i} className="text-[10px] text-ensena-muted">
            {l}
          </span>
        ))}
      </div>
      {canEdit && (
        <button type="button" onClick={() => setShowEditor((v) => !v)} className="text-[10px] font-semibold text-ensena-primary">
          {showEditor ? "Hide data" : "Edit data"}
        </button>
      )}
      {canEdit && showEditor && <ChartDataEditor state={state} onChange={onChange} />}
    </div>
  );
}

// A real, configurable pie chart — slice angles computed from the actual
// dataset (cumulative-angle SVG arcs), same shared editor.
export function PieChartToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: ChartDataState = isChartDataState(rawState) ? (rawState as unknown as ChartDataState) : defaultChart();
  const [showEditor, setShowEditor] = useState(false);
  const total = state.values.reduce((sum, v) => sum + v, 0) || 1;
  const R = 55;
  const CX = 60;
  const CY = 60;

  // Prefix sums computed up front (rather than mutating an outer-scope
  // variable inside .map()'s callback) so this stays a pure render — no
  // variable is reassigned after the component starts rendering.
  const cumulativeBefore: number[] = [];
  state.values.reduce((sum, v) => {
    cumulativeBefore.push(sum);
    return sum + v;
  }, 0);
  const slices = state.values.map((v, i) => {
    const startAngle = (cumulativeBefore[i] / total) * 2 * Math.PI;
    const endAngle = ((cumulativeBefore[i] + v) / total) * 2 * Math.PI;
    const x1 = CX + R * Math.sin(startAngle);
    const y1 = CY - R * Math.cos(startAngle);
    const x2 = CX + R * Math.sin(endAngle);
    const y2 = CY - R * Math.cos(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return { d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: BAR_COLORS[i % BAR_COLORS.length], label: state.labels[i], value: v };
  });

  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      <div className="flex min-h-0 flex-1 items-center justify-center gap-3">
        <svg viewBox="0 0 120 120" className="size-24 shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} />
          ))}
        </svg>
        <div className="flex flex-col gap-0.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-ensena-ink">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} ({s.value})
            </div>
          ))}
        </div>
      </div>
      {canEdit && (
        <button type="button" onClick={() => setShowEditor((v) => !v)} className="text-[10px] font-semibold text-ensena-primary">
          {showEditor ? "Hide data" : "Edit data"}
        </button>
      )}
      {canEdit && showEditor && <ChartDataEditor state={state} onChange={onChange} />}
    </div>
  );
}
