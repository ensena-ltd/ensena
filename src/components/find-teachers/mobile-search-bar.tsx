"use client";

import { Search, X } from "lucide-react";

// Large, touch-friendly search field for mobile — the level/mode selects
// that sit beside the equivalent desktop hero input move into the filter
// chips/sheet instead, so this is just the query text.
export function MobileSearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="px-4 pt-3 lg:hidden">
      <div className="relative flex items-center rounded-2xl border border-ensena-border bg-ensena-surface shadow-[0_10px_30px_-20px_rgba(17,24,39,0.25)]">
        <Search className="pointer-events-none absolute left-4 size-5 text-ensena-muted" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="What do you want to learn?"
          aria-label="What do you want to learn?"
          className="h-14 flex-1 rounded-2xl border-0 bg-transparent pl-12 pr-11 text-base text-ensena-ink outline-none placeholder:text-ensena-muted"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
            className="absolute right-3 flex size-8 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
