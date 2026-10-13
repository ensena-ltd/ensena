"use client";

import { useEffect, useRef } from "react";

// A small, dependency-free emoji picker — no emoji package is installed in
// this app, and a curated grid across a handful of common categories covers
// real usage without pulling in a data-file dependency for it.
const EMOJI_CATEGORIES: { label: string; emoji: string[] }[] = [
  {
    label: "Smileys",
    emoji: ["😀", "😁", "😂", "🙂", "😊", "😍", "😅", "😉", "😐", "😢", "😮", "😴", "🤔", "😎", "🙁", "😭"],
  },
  {
    label: "Gestures",
    emoji: ["👍", "👎", "👏", "🙏", "🤝", "👋", "✌️", "🤞", "💪", "🙌", "👌", "🤙"],
  },
  {
    label: "Hearts",
    emoji: ["❤️", "💙", "💚", "💛", "💜", "🧡", "🖤", "💔", "💯", "✨"],
  },
  {
    label: "School & Objects",
    emoji: ["📚", "✏️", "📝", "🎓", "💡", "⏰", "📅", "✅", "❌", "🔥", "🎯", "📌"],
  },
];

export function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose an emoji"
      className="absolute bottom-full left-0 z-50 mb-2 max-h-72 w-72 overflow-y-auto rounded-2xl border border-ensena-border bg-ensena-surface p-3 shadow-lg"
    >
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} className="mb-2 last:mb-0">
          <p className="mb-1 text-[11px] font-semibold text-ensena-muted">{cat.label}</p>
          <div className="grid grid-cols-8 gap-1">
            {cat.emoji.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onSelect(e)}
                aria-label={`Insert ${e}`}
                className="flex size-7 items-center justify-center rounded-lg text-lg hover:bg-ensena-bg-soft"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
