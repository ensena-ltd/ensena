"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Operator = "+" | "−" | "×" | "÷" | "^" | null;

function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    case "^":
      return Math.pow(a, b);
    default:
      return b;
  }
}

// A real, working calculator — personal scratch space, not shared/synced
// (nobody wants their arithmetic broadcast to the room, and it isn't part
// of the lesson's persisted state), same "local floating panel" convention
// the whiteboard's Timer used before it became a real synced ToolInstance.
// Normal/Scientific are the same component with a real mode toggle (per
// the Ensena Teaching Tools spec's own "Calculator ↔ Scientific Calculator"
// requirement) — `defaultScientific` just decides which mode it opens in,
// depending on which registry entry the tutor picked.
export function ClassroomCalculatorTool({ onClose, defaultScientific = false }: { onClose: () => void; defaultScientific?: boolean }) {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [awaitingOperand, setAwaitingOperand] = useState(false);
  const [scientific, setScientific] = useState(defaultScientific);
  const [memory, setMemory] = useState(0);
  const [degrees, setDegrees] = useState(true);

  function inputDigit(digit: string) {
    if (awaitingOperand) {
      setDisplay(digit);
      setAwaitingOperand(false);
      return;
    }
    setDisplay(display === "0" ? digit : display + digit);
  }
  function inputDecimal() {
    if (awaitingOperand) {
      setDisplay("0.");
      setAwaitingOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }
  function clearAll() {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setAwaitingOperand(false);
  }
  function backspace() {
    if (awaitingOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }
  function toggleSign() {
    setDisplay((Number(display) * -1).toString());
  }
  function inputPercent() {
    setDisplay((Number(display) / 100).toString());
  }
  function chooseOperator(nextOperator: Operator) {
    const inputValue = Number(display);
    if (stored !== null && operator && !awaitingOperand) {
      const result = compute(stored, inputValue, operator);
      setDisplay(String(result));
      setStored(result);
    } else {
      setStored(inputValue);
    }
    setOperator(nextOperator);
    setAwaitingOperand(true);
  }
  function equals() {
    if (stored === null || !operator) return;
    const result = compute(stored, Number(display), operator);
    setDisplay(String(result));
    setStored(null);
    setOperator(null);
    setAwaitingOperand(true);
  }

  // Real scientific functions — each genuinely computes from the current
  // display value, honoring the Degrees/Radians toggle for trig, rather
  // than decorative buttons.
  function applyUnary(fn: (x: number) => number) {
    const x = Number(display);
    const result = fn(x);
    setDisplay(String(result));
    setAwaitingOperand(true);
  }
  const toRad = (deg: number) => (degrees ? (deg * Math.PI) / 180 : deg);
  const scientificOps: { label: string; fn: () => void }[] = [
    { label: "sin", fn: () => applyUnary((x) => Math.sin(toRad(x))) },
    { label: "cos", fn: () => applyUnary((x) => Math.cos(toRad(x))) },
    { label: "tan", fn: () => applyUnary((x) => Math.tan(toRad(x))) },
    { label: "√x", fn: () => applyUnary((x) => Math.sqrt(x)) },
    { label: "x²", fn: () => applyUnary((x) => x * x) },
    { label: "xʸ", fn: () => chooseOperator("^") },
    { label: "ln", fn: () => applyUnary((x) => Math.log(x)) },
    { label: "log", fn: () => applyUnary((x) => Math.log10(x)) },
    { label: "1/x", fn: () => applyUnary((x) => 1 / x) },
    { label: "π", fn: () => setDisplay(String(Math.PI)) },
    { label: "e", fn: () => setDisplay(String(Math.E)) },
    { label: "n!", fn: () => applyUnary((x) => { let r = 1; for (let i = 2; i <= Math.floor(x); i++) r *= i; return r; }) },
  ];

  const digitButton = "flex h-11 items-center justify-center rounded-xl bg-ensena-surface text-base font-semibold text-ensena-ink hover:bg-ensena-bg-soft active:bg-ensena-border";
  const opButton = "flex h-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-base font-semibold text-ensena-primary hover:bg-ensena-border";
  const sciButton = "flex h-9 items-center justify-center rounded-lg bg-ensena-bg-soft text-xs font-semibold text-ensena-ink hover:bg-ensena-border";

  return (
    <div className={cn("absolute right-4 top-16 z-20 rounded-2xl border border-ensena-border bg-ensena-surface p-3 shadow-lg", scientific ? "w-80" : "w-64")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full bg-ensena-bg-soft p-0.5 text-[10px] font-semibold">
          <button type="button" onClick={() => setScientific(false)} className={cn("rounded-full px-2 py-1", !scientific ? "bg-white text-ensena-ink shadow-sm" : "text-ensena-muted")}>
            Normal
          </button>
          <button type="button" onClick={() => setScientific(true)} className={cn("rounded-full px-2 py-1", scientific ? "bg-white text-ensena-ink shadow-sm" : "text-ensena-muted")}>
            Scientific
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close calculator" className="text-ensena-muted hover:text-ensena-ink">
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2 overflow-x-auto whitespace-nowrap rounded-lg bg-ensena-bg-soft px-3 py-2 text-right font-mono text-2xl font-bold text-ensena-ink">{display}</p>

      {scientific && (
        <>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {scientificOps.map((op) => (
              <button key={op.label} type="button" onClick={op.fn} className={sciButton}>
                {op.label}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button type="button" onClick={() => setDegrees((v) => !v)} className={cn(sciButton, "flex-1")}>
              {degrees ? "DEG" : "RAD"}
            </button>
            <button type="button" onClick={() => setMemory(Number(display))} className={cn(sciButton, "flex-1")}>
              M+
            </button>
            <button type="button" onClick={() => setDisplay(String(memory))} className={cn(sciButton, "flex-1")}>
              MR
            </button>
            <button type="button" onClick={() => setMemory(0)} className={cn(sciButton, "flex-1")}>
              MC
            </button>
          </div>
        </>
      )}

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <button type="button" onClick={clearAll} className={cn(opButton, "text-rose-600")}>
          AC
        </button>
        <button type="button" onClick={toggleSign} className={opButton}>
          ±
        </button>
        <button type="button" onClick={inputPercent} className={opButton}>
          %
        </button>
        <button type="button" onClick={() => chooseOperator("÷")} className={opButton}>
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitButton}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => chooseOperator("×")} className={opButton}>
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitButton}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => chooseOperator("−")} className={opButton}>
          −
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={digitButton}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => chooseOperator("+")} className={opButton}>
          +
        </button>

        <button type="button" onClick={backspace} className={digitButton}>
          ⌫
        </button>
        <button type="button" onClick={() => inputDigit("0")} className={digitButton}>
          0
        </button>
        <button type="button" onClick={inputDecimal} className={digitButton}>
          .
        </button>
        <button type="button" onClick={equals} className="flex h-11 items-center justify-center rounded-xl bg-ensena-primary text-base font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
          =
        </button>
      </div>
    </div>
  );
}
