"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Shuffle, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardsState {
  cards: Flashcard[];
  currentIndex: number;
  flipped: boolean;
}

function isFlashcardsState(s: Record<string, unknown>): s is FlashcardsState & Record<string, unknown> {
  return Array.isArray(s.cards);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Real flashcards — the tutor authors front/back text, the deck's order,
// current position and flip state all live in the synced `state`, so a
// student (when permitted) sees the exact same card the tutor is on,
// flips it the same way, and a shuffle reorders the deck for everyone
// rather than just the person who clicked it.
export function FlashcardsToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: FlashcardsState = isFlashcardsState(rawState) ? (rawState as unknown as FlashcardsState) : { cards: [], currentIndex: 0, flipped: false };
  const [editing, setEditing] = useState(false);
  const [draftFront, setDraftFront] = useState("");
  const [draftBack, setDraftBack] = useState("");

  const card = state.cards[state.currentIndex];

  function flip() {
    if (!canEdit) return;
    onChange({ ...state, flipped: !state.flipped });
  }

  function go(delta: number) {
    if (!canEdit || state.cards.length === 0) return;
    const next = (state.currentIndex + delta + state.cards.length) % state.cards.length;
    onChange({ ...state, currentIndex: next, flipped: false });
  }

  function doShuffle() {
    if (!canEdit) return;
    onChange({ cards: shuffle(state.cards), currentIndex: 0, flipped: false });
  }

  function addCard() {
    if (!canEdit || !draftFront.trim() || !draftBack.trim()) return;
    const newCard: Flashcard = { id: `fc-${Date.now()}`, front: draftFront.trim(), back: draftBack.trim() };
    onChange({ ...state, cards: [...state.cards, newCard], currentIndex: state.cards.length });
    setDraftFront("");
    setDraftBack("");
  }

  function removeCurrent() {
    if (!canEdit || !card) return;
    const nextCards = state.cards.filter((c) => c.id !== card.id);
    onChange({ cards: nextCards, currentIndex: Math.min(state.currentIndex, Math.max(0, nextCards.length - 1)), flipped: false });
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {card ? (
        <button
          type="button"
          onClick={flip}
          className={cn(
            "flex min-h-24 flex-1 items-center justify-center rounded-xl border-2 p-3 text-center text-sm font-semibold",
            state.flipped ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border bg-ensena-bg-soft text-ensena-ink"
          )}
        >
          {state.flipped ? card.back : card.front}
        </button>
      ) : (
        <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-ensena-border text-xs text-ensena-muted">
          {canEdit ? "Add a card below to get started." : "Your tutor hasn't added any cards yet."}
        </div>
      )}

      {canEdit && state.cards.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-ensena-muted">
          <span>
            Card {state.currentIndex + 1} of {state.cards.length}
          </span>
          <span>Tap card to flip</span>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" onClick={() => go(-1)} aria-label="Previous card" disabled={state.cards.length === 0} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={doShuffle} aria-label="Shuffle" disabled={state.cards.length < 2} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
            <Shuffle className="size-3.5" />
          </button>
          {card && (
            <button type="button" onClick={removeCurrent} aria-label="Delete card" className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-rose-500 hover:bg-rose-50">
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button type="button" onClick={() => go(1)} aria-label="Next card" disabled={state.cards.length === 0} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-1 border-t border-ensena-border pt-2">
          {editing ? (
            <>
              <input value={draftFront} onChange={(e) => setDraftFront(e.target.value)} placeholder="Front" className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary" />
              <input value={draftBack} onChange={(e) => setDraftBack(e.target.value)} placeholder="Back" className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary" />
              <button
                type="button"
                onClick={() => {
                  addCard();
                  setEditing(false);
                }}
                className="flex h-7 items-center justify-center rounded-lg bg-ensena-primary text-[11px] font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Add card
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="flex h-7 items-center justify-center gap-1 rounded-lg border border-dashed border-ensena-border text-[11px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
              <Plus className="size-3" /> Add card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
