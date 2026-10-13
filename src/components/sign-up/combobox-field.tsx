"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, PenLine } from "lucide-react";

// Searchable dropdown for long lists (institutions, fields of study). Type
// to filter; pick an option; or choose "Other" to type a value that isn't
// listed. The stored value is always plain text, so a typed "Other" value
// is saved exactly like a listed one.
export function ComboboxField({
  value,
  onChange,
  options,
  placeholder,
  loading,
  disabled,
  emptyHint,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [otherMode, setOtherMode] = useState(() => value !== "" && !options.includes(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return list.slice(0, 80);
  }, [options, query]);

  if (otherMode) {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type it here"
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setOtherMode(false);
              onChange("");
            }}
            className="self-start text-xs font-medium text-ensena-primary hover:underline"
          >
            Choose from the list instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? query : value}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder={value || placeholder}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-ensena-border pl-3 pr-9 text-sm outline-none placeholder:text-ensena-muted focus-visible:border-ensena-primary disabled:cursor-not-allowed disabled:bg-ensena-bg-soft"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ensena-muted" />
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <span>{o}</span>
              {o === value && <Check className="size-4 shrink-0 text-ensena-primary" />}
            </button>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="px-2.5 py-2 text-sm text-ensena-muted">{options.length === 0 ? (emptyHint ?? "No options for this selection.") : "No matches."}</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOtherMode(true);
              setOpen(false);
              onChange(query.trim());
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-ensena-border px-2.5 py-2 text-left text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
          >
            <PenLine className="size-3.5" /> Other{query.trim() ? ` — use “${query.trim()}”` : " — type your own"}
          </button>
        </div>
      )}
    </div>
  );
}
