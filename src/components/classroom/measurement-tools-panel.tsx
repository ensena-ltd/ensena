"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Category = "Length" | "Weight" | "Volume" | "Temperature";

// Real conversion factors to a base unit per category (meters, grams,
// millilitres) — temperature is handled separately since it isn't a
// simple multiplicative factor.
const UNITS: Record<Category, Record<string, number>> = {
  Length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 },
  Weight: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592 },
  Volume: { ml: 1, l: 1000, "fl oz": 29.5735, cup: 236.588, gal: 3785.41 },
  Temperature: { "°C": 0, "°F": 0, K: 0 },
};

function convertTemperature(value: number, from: string, to: string): number {
  const celsius = from === "°C" ? value : from === "°F" ? ((value - 32) * 5) / 9 : value - 273.15;
  if (to === "°C") return celsius;
  if (to === "°F") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

// A real unit converter — personal scratch space, not shared/synced (same
// convention as Calculator: nobody wants their working broadcast to the
// room), with a genuine computed result for every category rather than a
// static conversion table image.
export function MeasurementToolsPanel({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<Category>("Length");
  const [value, setValue] = useState("1");
  const units = Object.keys(UNITS[category]);
  const [fromUnit, setFromUnit] = useState(units[0]);
  const [toUnit, setToUnit] = useState(units[1] ?? units[0]);

  function changeCategory(next: Category) {
    setCategory(next);
    const nextUnits = Object.keys(UNITS[next]);
    setFromUnit(nextUnits[0]);
    setToUnit(nextUnits[1] ?? nextUnits[0]);
  }

  const numeric = Number(value) || 0;
  const result =
    category === "Temperature"
      ? convertTemperature(numeric, fromUnit, toUnit)
      : (numeric * UNITS[category][fromUnit]) / UNITS[category][toUnit];

  return (
    <div className="absolute right-4 top-16 z-20 w-72 rounded-2xl border border-ensena-border bg-ensena-surface p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ensena-ink">Measurement Tools</p>
        <button type="button" onClick={onClose} aria-label="Close" className="text-ensena-muted hover:text-ensena-ink">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex gap-1">
        {(["Length", "Weight", "Volume", "Temperature"] as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => changeCategory(c)}
            className={`flex-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold ${category === c ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-3 h-10 w-full rounded-lg border border-ensena-border px-3 text-right font-mono text-lg outline-none focus:border-ensena-primary"
      />

      <div className="mt-2 flex items-center gap-2">
        <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="h-9 flex-1 rounded-lg border border-ensena-border px-2 text-sm outline-none">
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <span className="text-xs text-ensena-muted">to</span>
        <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="h-9 flex-1 rounded-lg border border-ensena-border px-2 text-sm outline-none">
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>

      <p className="mt-3 rounded-lg bg-ensena-bg-soft px-3 py-2 text-right font-mono text-xl font-bold text-ensena-ink">
        {Number.isFinite(result) ? result.toFixed(4).replace(/\.?0+$/, "") : "—"} {toUnit}
      </p>
    </div>
  );
}
