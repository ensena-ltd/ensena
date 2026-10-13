import { cn } from "@/lib/utils";

// The one shared content-loading placeholder — before this, no skeleton
// existed anywhere in the app (every "loading" state was either a spinner
// swapped in for an icon, or nothing at all). `animate-pulse` is a pure
// opacity animation (GPU-cheap, no layout work) and is neutralized globally
// under prefers-reduced-motion (see globals.css). Pass a real shape via
// className (width/height/rounding) — this component only supplies the
// pulse + base color, never a guessed size.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-ensena-border/60", className)} />;
}
