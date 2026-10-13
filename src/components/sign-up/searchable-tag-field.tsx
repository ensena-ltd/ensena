"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// Search + suggestions + free-text custom entry, reused for every kind of
// tutor expertise (subjects, courses, specializations, research areas,
// languages, exam expertise) — the field never restricts the tutor to the
// suggestion list, and typing a value that case-insensitively matches an
// existing suggestion snaps to that suggestion's canonical spelling instead
// of creating a near-duplicate (e.g. "mathematics" -> "Mathematics").
export function SearchableTagField({
  values,
  suggestions,
  placeholder,
  onChange,
}: {
  values: string[];
  suggestions: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const taken = new Set(values.map(normalize));
  const matches = suggestions.filter((s) => !taken.has(normalize(s)) && normalize(s).includes(normalize(query)));
  const exactExisting = suggestions.find((s) => normalize(s) === normalize(query));
  const trimmedQuery = query.trim();
  const canAddCustom = trimmedQuery !== "" && !taken.has(normalize(trimmedQuery)) && !exactExisting;

  function add(value: string) {
    onChange([...values, value]);
    setQuery("");
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
        {query && (matches.length > 0 || canAddCustom) && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
            {matches.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
              >
                {s}
                <span className="text-[10px] font-medium uppercase tracking-wide text-ensena-muted">Suggested</span>
              </button>
            ))}
            {canAddCustom && (
              <button
                type="button"
                onClick={() => add(trimmedQuery)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
              >
                <Plus className="size-3.5" /> Add &ldquo;{trimmedQuery}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="flex items-center gap-1 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
