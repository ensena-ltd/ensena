"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface MatchPair {
  id: string;
  left: string;
  right: string;
}

interface MatchingState {
  pairs: MatchPair[];
  /** The shuffled display order of the right column's pair ids — set once by the host so every participant sees the same shuffle. */
  rightOrder: string[];
  /** Each student's own matched-so-far map (leftPairId -> the right pairId they matched it to), keyed by their real display name. */
  responses: Record<string, Record<string, string>>;
}

function isMatchingState(s: Record<string, unknown>): s is MatchingState & Record<string, unknown> {
  return Array.isArray(s.pairs) && Array.isArray(s.rightOrder);
}

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function defaultMatching(): MatchingState {
  const pairs: MatchPair[] = [
    { id: "m1", left: "Capital of Nigeria", right: "Abuja" },
    { id: "m2", left: "Capital of France", right: "Paris" },
    { id: "m3", left: "Capital of Japan", right: "Tokyo" },
  ];
  return { pairs, rightOrder: shuffleIds(pairs.map((p) => p.id)), responses: {} };
}

// A real matching activity — the tutor authors left/right pairs (host-
// only), and a permitted student clicks a left item then a right item to
// attempt a match; each student's own progress lands under their own name
// in the shared `responses` map, never overwriting a classmate's (per the
// Ensena Classroom group-permission model).
export function MatchingToolBody({
  state: rawState,
  isHost,
  canEdit,
  selfName,
  onChange,
}: {
  state: Record<string, unknown>;
  isHost: boolean;
  canEdit: boolean;
  selfName: string;
  onChange: (state: Record<string, unknown>) => void;
}) {
  const state: MatchingState = isMatchingState(rawState) ? (rawState as unknown as MatchingState) : defaultMatching();
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  function setPair(id: string, field: "left" | "right", value: string) {
    onChange({ ...state, pairs: state.pairs.map((p) => (p.id === id ? { ...p, [field]: value } : p)) });
  }
  function addPair() {
    const id = `m${Date.now()}`;
    const pairs = [...state.pairs, { id, left: "New item", right: "New match" }];
    onChange({ ...state, pairs, rightOrder: shuffleIds(pairs.map((p) => p.id)) });
  }
  function removePair(id: string) {
    const pairs = state.pairs.filter((p) => p.id !== id);
    onChange({ pairs, rightOrder: shuffleIds(pairs.map((p) => p.id)), responses: {} });
  }
  function reshuffle() {
    onChange({ ...state, rightOrder: shuffleIds(state.pairs.map((p) => p.id)), responses: {} });
  }

  if (isHost) {
    return (
      <div className="flex h-full flex-col gap-1.5 overflow-y-auto p-2.5">
        {state.pairs.map((p) => (
          <div key={p.id} className="flex items-center gap-1">
            <input value={p.left} onChange={(e) => setPair(p.id, "left", e.target.value)} className="h-7 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
            <span className="text-ensena-muted">→</span>
            <input value={p.right} onChange={(e) => setPair(p.id, "right", e.target.value)} className="h-7 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary" />
            <button type="button" onClick={() => removePair(p.id)} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button type="button" onClick={addPair} className="flex h-6 flex-1 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3" /> Add pair
          </button>
          <button type="button" onClick={reshuffle} className="flex h-6 items-center gap-1 rounded border border-ensena-border px-2 text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
            <RotateCcw className="size-3" /> Reshuffle
          </button>
        </div>
      </div>
    );
  }

  const myMatches = state.responses[selfName] ?? {};
  const rightPairs = state.rightOrder.map((id) => state.pairs.find((p) => p.id === id)).filter((p): p is MatchPair => !!p);
  const matchedRightIds = new Set(Object.values(myMatches));

  function pickRight(rightId: string) {
    if (!canEdit || !selectedLeft) return;
    onChange({ ...state, responses: { ...state.responses, [selfName]: { ...myMatches, [selectedLeft]: rightId } } });
    setSelectedLeft(null);
  }

  return (
    <div className="flex h-full gap-2 p-2.5">
      <div className="flex flex-1 flex-col gap-1">
        {state.pairs.map((p) => {
          const matched = myMatches[p.id];
          const correct = matched === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!canEdit || !!matched}
              onClick={() => setSelectedLeft(p.id)}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium",
                matched ? (correct ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-600") : selectedLeft === p.id ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink"
              )}
            >
              {p.left}
            </button>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {rightPairs.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!canEdit || matchedRightIds.has(p.id)}
            onClick={() => pickRight(p.id)}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium",
              matchedRightIds.has(p.id) ? "border-ensena-border bg-ensena-bg-soft text-ensena-muted" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {p.right}
          </button>
        ))}
      </div>
    </div>
  );
}
