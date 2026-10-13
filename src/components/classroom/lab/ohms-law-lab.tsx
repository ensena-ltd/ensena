"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

function Slider({ label, value, unit, min, max, step = 1, onChange }: { label: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center justify-between">
        <span className="font-medium text-ensena-ink">{label}</span>
        <span className="font-mono text-xs font-semibold text-ensena-primary">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ensena-primary"
      />
    </label>
  );
}

// Genuinely interactive (not a preset click-through): current is computed
// live from I = V / R and the circuit's bulb glow / ammeter needle both
// react to it in real time.
export function OhmsLawLab() {
  const [voltage, setVoltage] = useState(6);
  const [resistance, setResistance] = useState(10);
  const current = voltage / resistance;
  const power = voltage * current;
  const glow = Math.min(1, current / 1.5);
  const needleDeg = -60 + Math.min(1, current / 2) * 120;

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
      <div className="rounded-xl border border-ensena-border bg-ensena-bg-soft p-4">
        <svg viewBox="0 0 320 150" className="w-full">
          <rect x="14" y="55" width="18" height="40" rx="3" fill="#111827" />
          <rect x="14" y="55" width="18" height="14" rx="3" fill="#F80248" />
          <text x="23" y="50" fontSize="11" textAnchor="middle" fill="#6B7280">
            +
          </text>
          <line x1="23" y1="55" x2="23" y2="30" stroke="#111827" strokeWidth="3" />
          <line x1="23" y1="30" x2="130" y2="30" stroke="#111827" strokeWidth="3" />
          <polyline points="130,30 138,15 146,45 154,15 162,45 170,15 178,30" fill="none" stroke="#6C63FF" strokeWidth="3" strokeLinejoin="round" />
          <line x1="178" y1="30" x2="280" y2="30" stroke="#111827" strokeWidth="3" />
          <line x1="280" y1="30" x2="280" y2="55" stroke="#111827" strokeWidth="3" />

          {/* bulb */}
          <circle cx="280" cy="80" r="20" fill={`rgba(229,138,42,${0.15 + glow * 0.75})`} stroke="#E58A2A" strokeWidth="2" />
          <line x1="270" y1="70" x2="290" y2="90" stroke="#E58A2A" strokeWidth="1.5" />
          <line x1="290" y1="70" x2="270" y2="90" stroke="#E58A2A" strokeWidth="1.5" />

          {/* ammeter */}
          <circle cx="130" cy="90" r="18" fill="white" stroke="#111827" strokeWidth="2" />
          <text x="130" y="94" fontSize="11" textAnchor="middle" fill="#111827">
            A
          </text>
          <line x1="130" y1="90" x2="130" y2="76" stroke="#F80248" strokeWidth="2" transform={`rotate(${needleDeg} 130 90)`} />

          <line x1="23" y1="95" x2="112" y2="90" stroke="#111827" strokeWidth="3" />
          <line x1="148" y1="90" x2="280" y2="95" stroke="#111827" strokeWidth="3" />
          <line x1="23" y1="95" x2="23" y2="95" stroke="#111827" strokeWidth="3" />
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white p-2">
            <p className="text-ensena-muted">Voltage</p>
            <p className="font-semibold text-ensena-ink">{voltage.toFixed(1)} V</p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="text-ensena-muted">Resistance</p>
            <p className="font-semibold text-ensena-ink">{resistance} Ω</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <p className="text-emerald-700">Current</p>
            <p className="font-semibold text-emerald-700">{current.toFixed(2)} A</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-ensena-muted">Power: {power.toFixed(2)} W</p>
      </div>

      <div className="flex flex-col gap-4">
        <Slider label="Voltage" value={voltage} unit="V" min={1} max={20} step={0.5} onChange={setVoltage} />
        <Slider label="Resistance" value={resistance} unit="Ω" min={1} max={100} onChange={setResistance} />
        <button
          type="button"
          onClick={() => {
            setVoltage(6);
            setResistance(10);
          }}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <RotateCcw className="size-3.5" /> Reset Experiment
        </button>
      </div>
    </div>
  );
}
