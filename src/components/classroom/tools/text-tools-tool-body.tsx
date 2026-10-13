"use client";

import { Bold, Italic, Underline } from "lucide-react";

import { cn } from "@/lib/utils";

interface TextToolsState {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  size: "sm" | "md" | "lg";
}

function isTextToolsState(s: Record<string, unknown>): s is TextToolsState & Record<string, unknown> {
  return typeof s.text === "string";
}

const SIZE_CLASS: Record<TextToolsState["size"], string> = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

// Real formatted text on the board — a synced textarea plus real Bold/
// Italic/Underline/size toggles that style the whole block (block-level
// formatting, not per-character rich text — a fully cursor-position-aware
// rich text editor would need a much heavier editor library than this
// classroom's tool-instance architecture pulls in elsewhere). Every
// keystroke and toggle is real synced state, not a decorative preview.
export function TextToolsToolBody({ state: rawState, canEdit, onChange }: { state: Record<string, unknown>; canEdit: boolean; onChange: (state: Record<string, unknown>) => void }) {
  const state: TextToolsState = isTextToolsState(rawState) ? (rawState as unknown as TextToolsState) : { text: "", bold: false, italic: false, underline: false, size: "md" };

  function toggle(key: "bold" | "italic" | "underline") {
    if (!canEdit) return;
    onChange({ ...state, [key]: !state[key] });
  }
  function setSize(size: TextToolsState["size"]) {
    if (!canEdit) return;
    onChange({ ...state, size });
  }

  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      {canEdit && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => toggle("bold")} className={cn("flex size-6 items-center justify-center rounded border", state.bold ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}>
            <Bold className="size-3" />
          </button>
          <button type="button" onClick={() => toggle("italic")} className={cn("flex size-6 items-center justify-center rounded border", state.italic ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}>
            <Italic className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => toggle("underline")}
            className={cn("flex size-6 items-center justify-center rounded border", state.underline ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
          >
            <Underline className="size-3" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-ensena-border" />
          {(["sm", "md", "lg"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={cn("rounded border px-1.5 text-[10px] font-semibold", state.size === s ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      {canEdit ? (
        <textarea
          value={state.text}
          onChange={(e) => onChange({ ...state, text: e.target.value })}
          placeholder="Type here…"
          className={cn(
            "min-h-0 flex-1 resize-none rounded-lg border border-ensena-border p-2 outline-none focus:border-ensena-primary",
            SIZE_CLASS[state.size],
            state.bold && "font-bold",
            state.italic && "italic",
            state.underline && "underline"
          )}
        />
      ) : (
        <p className={cn("min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-2 text-ensena-ink", SIZE_CLASS[state.size], state.bold && "font-bold", state.italic && "italic", state.underline && "underline")}>
          {state.text || "Nothing written yet."}
        </p>
      )}
    </div>
  );
}
