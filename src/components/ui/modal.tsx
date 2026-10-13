"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// The one shared Modal every dialog in the app (58 call sites) is built on —
// used to hard-mount/unmount with zero transition. Now does a real
// transform/opacity fade+scale on both open AND close, driven by a small
// mounted/visible state machine rather than the `open` prop alone: `open`
// flips to false immediately (so a caller's own state is simple), but the
// DOM node stays mounted for one motion-duration-base tick so the exit
// transition is actually visible, matching the same enter/exit quality
// select.tsx already gets for free from Base UI's data-open/data-closed
// primitives (this component predates that dependency and isn't Base-UI
// based, so it earns the same result explicitly instead). Every transition
// here is opacity/transform only — no layout-triggering properties — and
// respects prefers-reduced-motion globally (see globals.css), which
// collapses these same duration classes to ~0ms without any extra code here.
export function Modal({
  open,
  onClose,
  title,
  children,
  widthClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Synchronizing local animation state with the `open` prop changing —
      // a real "respond to an external signal with a timed transition" case
      // (same justification as classroom-shell.tsx's own screen-share
      // effect), never a value derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ensena-ink/40 backdrop-blur-sm transition-opacity duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl transition-[opacity,transform] duration-200 ease-out",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
          widthClassName ?? "max-w-lg"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
