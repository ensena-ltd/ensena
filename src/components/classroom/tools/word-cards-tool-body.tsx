"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Palette, Plus, Shuffle, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface WordCard {
  id: string;
  word: string;
  definition: string;
  example: string;
  pronunciation: string;
  category: string;
}

type StylePreset = "classic" | "minimal" | "colorful" | "vocabulary" | "definition-first";

interface WordCardsStyle {
  preset: StylePreset;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

interface WordCardsState {
  cards: WordCard[];
  style: WordCardsStyle;
}

function isWordCardsState(s: Record<string, unknown>): s is WordCardsState & Record<string, unknown> {
  return Array.isArray(s.cards);
}

const PRESETS: Record<StylePreset, { label: string; style: Omit<WordCardsStyle, "preset"> }> = {
  classic: { label: "Classic", style: { backgroundColor: "#ffffff", textColor: "#1f2937", accentColor: "#f80248", borderColor: "#e5e0da" } },
  minimal: { label: "Minimal", style: { backgroundColor: "#ffffff", textColor: "#1f2937", accentColor: "#6b7280", borderColor: "#e5e0da" } },
  colorful: { label: "Colorful", style: { backgroundColor: "#fef3c7", textColor: "#78350f", accentColor: "#7c3aed", borderColor: "#fbbf24" } },
  vocabulary: { label: "Vocabulary", style: { backgroundColor: "#eff6ff", textColor: "#1e3a8a", accentColor: "#1971c2", borderColor: "#93c5fd" } },
  "definition-first": { label: "Definition-first", style: { backgroundColor: "#ecfdf5", textColor: "#064e3b", accentColor: "#2f9e44", borderColor: "#6ee7b7" } },
};

const BRAND_SWATCHES = ["#f80248", "#1f2937", "#1971c2", "#2f9e44", "#f59e0b", "#7c3aed", "#ffffff"];

function defaultState(): WordCardsState {
  return { cards: [], style: { preset: "classic", ...PRESETS.classic.style } };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Real, customizable word cards — the tutor authors the set (host-only,
// regardless of the current whiteboard permission mode, since authoring is
// board management) with a real color/preset picker (including the Ensena
// brand red as one swatch, never forced), and any permitted VIEWER
// (including a student who can't author) can flip through the deck on
// their own — card position is deliberately per-viewer local state, not
// shared, so one student browsing never yanks the deck out from under
// another's or the tutor's own view.
export function WordCardsToolBody({
  state: rawState,
  isHost,
  canEdit,
  onChange,
}: {
  state: Record<string, unknown>;
  isHost: boolean;
  canEdit: boolean;
  onChange: (state: Record<string, unknown>) => void;
}) {
  const state: WordCardsState = isWordCardsState(rawState) ? (rawState as unknown as WordCardsState) : defaultState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [draft, setDraft] = useState({ word: "", definition: "", example: "", pronunciation: "", category: "" });

  const cards = state.cards;
  const card = cards[Math.min(currentIndex, cards.length - 1)];
  const style = state.style;

  function go(delta: number) {
    if (cards.length === 0) return;
    setCurrentIndex((i) => (i + delta + cards.length) % cards.length);
  }
  function doShuffle() {
    if (!isHost) return;
    onChange({ ...state, cards: shuffle(cards) });
    setCurrentIndex(0);
  }
  function addCard() {
    if (!isHost || !draft.word.trim()) return;
    const newCard: WordCard = { id: `wc-${Date.now()}`, ...draft };
    onChange({ ...state, cards: [...cards, newCard] });
    setCurrentIndex(cards.length);
    setDraft({ word: "", definition: "", example: "", pronunciation: "", category: "" });
    setEditing(false);
  }
  function removeCurrent() {
    if (!isHost || !card) return;
    const nextCards = cards.filter((c) => c.id !== card.id);
    onChange({ ...state, cards: nextCards });
    setCurrentIndex((i) => Math.min(i, Math.max(0, nextCards.length - 1)));
  }
  function applyPreset(preset: StylePreset) {
    if (!isHost) return;
    onChange({ ...state, style: { preset, ...PRESETS[preset].style } });
  }
  function setColor(key: keyof Omit<WordCardsStyle, "preset">, value: string) {
    if (!isHost) return;
    onChange({ ...state, style: { ...style, [key]: value } });
  }

  const definitionFirst = style.preset === "definition-first";

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {card ? (
        <div
          className="flex min-h-24 flex-1 flex-col justify-center gap-1 rounded-xl border p-3 text-center"
          style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor }}
        >
          {definitionFirst ? (
            <>
              <p className="text-xs font-medium" style={{ color: style.textColor }}>
                {card.definition}
              </p>
              <p className="text-base font-bold" style={{ color: style.accentColor }}>
                {card.word}
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-bold" style={{ color: style.accentColor }}>
                {card.word}
              </p>
              {card.pronunciation && <p className="text-[11px] italic opacity-70" style={{ color: style.textColor }}>/{card.pronunciation}/</p>}
              <p className="text-xs font-medium" style={{ color: style.textColor }}>
                {card.definition}
              </p>
            </>
          )}
          {card.example && (
            <p className="text-[11px] italic opacity-80" style={{ color: style.textColor }}>
              &quot;{card.example}&quot;
            </p>
          )}
          {card.category && (
            <span className="mx-auto mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: style.accentColor, color: "#fff" }}>
              {card.category}
            </span>
          )}
        </div>
      ) : (
        <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-ensena-border text-xs text-ensena-muted">
          {isHost ? "Add a card below to get started." : "Your tutor hasn't added any cards yet."}
        </div>
      )}

      {cards.length > 0 && (
        <p className="text-center text-[10px] text-ensena-muted">
          {currentIndex + 1} / {cards.length}
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5">
        <button type="button" onClick={() => go(-1)} disabled={cards.length === 0} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
          <ChevronLeft className="size-3.5" />
        </button>
        {isHost && (
          <button type="button" onClick={doShuffle} disabled={cards.length < 2} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
            <Shuffle className="size-3.5" />
          </button>
        )}
        {isHost && card && (
          <button type="button" onClick={removeCurrent} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-rose-500 hover:bg-rose-50">
            <Trash2 className="size-3.5" />
          </button>
        )}
        {isHost && (
          <button type="button" onClick={() => setShowStyle((v) => !v)} aria-label="Card style" className={cn("flex size-7 items-center justify-center rounded-full border", showStyle ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft")}>
            <Palette className="size-3.5" />
          </button>
        )}
        <button type="button" onClick={() => go(1)} disabled={cards.length === 0} className="flex size-7 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-40">
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {isHost && showStyle && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-ensena-border p-2">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PRESETS) as StylePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", style.preset === p ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
              >
                {PRESETS[p].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-ensena-muted">
            Accent:
            {BRAND_SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Accent ${c}`} onClick={() => setColor("accentColor", c)} className="size-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={style.accentColor} onChange={(e) => setColor("accentColor", e.target.value)} className="size-5 rounded" aria-label="Custom accent color" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-ensena-muted">
            Background: <input type="color" value={style.backgroundColor} onChange={(e) => setColor("backgroundColor", e.target.value)} className="size-5 rounded" aria-label="Background color" />
            Text: <input type="color" value={style.textColor} onChange={(e) => setColor("textColor", e.target.value)} className="size-5 rounded" aria-label="Text color" />
            Border: <input type="color" value={style.borderColor} onChange={(e) => setColor("borderColor", e.target.value)} className="size-5 rounded" aria-label="Border color" />
          </div>
        </div>
      )}

      {isHost && (
        <div className="flex flex-col gap-1 border-t border-ensena-border pt-2">
          {editing ? (
            <>
              <input value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} placeholder="Word" className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary" />
              <input
                value={draft.pronunciation}
                onChange={(e) => setDraft({ ...draft, pronunciation: e.target.value })}
                placeholder="Pronunciation (optional)"
                className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
              />
              <input
                value={draft.definition}
                onChange={(e) => setDraft({ ...draft, definition: e.target.value })}
                placeholder="Definition"
                className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
              />
              <input
                value={draft.example}
                onChange={(e) => setDraft({ ...draft, example: e.target.value })}
                placeholder="Example sentence"
                className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
              />
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Category (optional)"
                className="h-7 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary"
              />
              <button type="button" onClick={addCard} className="flex h-7 items-center justify-center rounded-lg bg-ensena-primary text-[11px] font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
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
      {!isHost && !canEdit && cards.length > 0 && <p className="text-center text-[10px] text-ensena-muted">Viewing only. Swipe with the arrows above.</p>}
    </div>
  );
}
