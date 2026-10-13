"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

interface GraphPoint {
  x: number;
  y: number;
}

interface GraphState {
  range: number;
  points: GraphPoint[];
  expression: string;
}

function isGraphState(s: Record<string, unknown>): s is GraphState & Record<string, unknown> {
  return typeof s.range === "number" && Array.isArray(s.points);
}

// A tiny, safe recursive-descent parser/evaluator for "y = ..." in terms of
// x — supports + - * / ^, unary minus, parentheses and a handful of real
// functions. No eval()/Function() anywhere, since this runs on untrusted
// tutor-authored (and potentially student-broadcast) text. A fresh parser
// state is built per call, so nothing here needs to be reset between calls.
function evaluateExpression(expr: string, x: number): number | null {
  const src = expr.replace(/\s+/g, "").replace(/^y=/, "");
  let i = 0;

  const peek = () => src[i];
  const consume = (ch?: string) => {
    if (ch && src[i] !== ch) throw new Error("parse");
    i++;
  };
  function parseNumber(): number {
    const start = i;
    while (i < src.length && /[0-9.]/.test(src[i])) i++;
    if (i === start) throw new Error("parse");
    return parseFloat(src.slice(start, i));
  }
  function parseAtom(): number {
    if (peek() === "(") {
      consume("(");
      const v = parseExpr();
      consume(")");
      return v;
    }
    if (peek() === "-") {
      consume("-");
      return -parseAtom();
    }
    const funcMatch = /^(sin|cos|tan|sqrt|abs|log)/.exec(src.slice(i));
    if (funcMatch) {
      const name = funcMatch[1];
      i += name.length;
      consume("(");
      const arg = parseExpr();
      consume(")");
      if (name === "sin") return Math.sin(arg);
      if (name === "cos") return Math.cos(arg);
      if (name === "tan") return Math.tan(arg);
      if (name === "sqrt") return Math.sqrt(arg);
      if (name === "abs") return Math.abs(arg);
      return Math.log10(arg);
    }
    if (src.slice(i, i + 2) === "pi") {
      i += 2;
      return Math.PI;
    }
    if (peek() === "x") {
      consume("x");
      return x;
    }
    return parseNumber();
  }
  function parsePow(): number {
    const base = parseAtom();
    if (peek() === "^") {
      consume("^");
      return Math.pow(base, parsePow());
    }
    return base;
  }
  function parseTerm(): number {
    let value = parsePow();
    while (peek() === "*" || peek() === "/") {
      const op = peek();
      consume(op);
      const rhs = parsePow();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = peek();
      consume(op);
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  try {
    const result = parseExpr();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// A real graphing tool — plots data points the tutor (or a permitted
// student) taps onto the grid, and optionally overlays a function curve
// parsed from a real (if small) expression grammar rather than a canned
// image. Both live in the synced `state`, so everyone sees the same axes,
// points and curve.
export function GraphToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: GraphState = isGraphState(rawState) ? (rawState as unknown as GraphState) : { range: 10, points: [], expression: "" };
  const [draftExpr, setDraftExpr] = useState(state.expression);
  const size = 220;
  const range = state.range;

  function toScreen(v: number, axisSize: number) {
    return (v / range) * (axisSize / 2) + axisSize / 2;
  }
  function fromScreenX(px: number) {
    return ((px - size / 2) / (size / 2)) * range;
  }
  function fromScreenY(py: number) {
    return -((py - size / 2) / (size / 2)) * range;
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const x = Math.round(fromScreenX(px) * 2) / 2;
    const y = Math.round(fromScreenY(py) * 2) / 2;
    onChange({ ...state, points: [...state.points, { x, y }] });
  }

  function clearPoints() {
    if (!canEdit) return;
    onChange({ ...state, points: [] });
  }

  function applyExpression() {
    if (!canEdit) return;
    onChange({ ...state, expression: draftExpr });
  }

  function zoom(delta: number) {
    if (!canEdit) return;
    onChange({ ...state, range: Math.max(2, range + delta) });
  }

  const curvePath = (() => {
    if (!state.expression.trim()) return null;
    const samples: string[] = [];
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const x = -range + (2 * range * s) / steps;
      const y = evaluateExpression(state.expression, x);
      if (y === null || Math.abs(y) > range * 3) continue;
      const px = toScreen(x, size);
      const py = size - toScreen(y, size);
      samples.push(`${samples.length === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return samples.length > 1 ? samples.join(" ") : null;
  })();

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <svg viewBox={`0 0 ${size} ${size}`} onClick={handleClick} className="w-full flex-1 cursor-crosshair rounded-lg bg-white">
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="#d8d2c9" strokeWidth={1} />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="#d8d2c9" strokeWidth={1} />
        {curvePath && <path d={curvePath} fill="none" stroke="#f80248" strokeWidth={1.5} />}
        {state.points.map((p, idx) => (
          <circle key={idx} cx={toScreen(p.x, size)} cy={size - toScreen(p.y, size)} r={3} fill="#1971c2" />
        ))}
      </svg>
      <p className="text-center text-[10px] text-ensena-muted">Range ±{range} · tap to plot a point</p>
      {canEdit && (
        <>
          <div className="flex items-center gap-1">
            <input
              value={draftExpr}
              onChange={(e) => setDraftExpr(e.target.value)}
              placeholder="y = x^2"
              className="h-7 flex-1 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
            />
            <button type="button" onClick={applyExpression} className="rounded-lg bg-ensena-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Plot
            </button>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <button type="button" onClick={() => zoom(-2)} aria-label="Zoom in" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <Plus className="size-3" />
            </button>
            <button type="button" onClick={() => zoom(2)} aria-label="Zoom out" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <Minus className="size-3" />
            </button>
            <button type="button" onClick={clearPoints} aria-label="Clear points" className="flex size-6 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <Trash2 className="size-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
