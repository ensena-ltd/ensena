"use client";

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from "react";
import { Copy, GripVertical, X } from "lucide-react";

import { cn } from "@/lib/utils";

// The one generic "floating window on the board" chrome every Teaching
// Tool instance uses — drag by the header, resize from the corner handle,
// duplicate/remove. Deltas are converted from screen pixels back into
// scene units (divided by the board's current zoom) before being handed
// to the caller, since ToolInstance.x/y/width/height are stored in scene
// space (see tool-instance-layer.tsx for the coordinate conversion).
export function ToolCard({
  label,
  screenX,
  screenY,
  screenWidth,
  screenHeight,
  zoom,
  canEdit,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
  onFocus,
  children,
}: {
  label: string;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  zoom: number;
  canEdit: boolean;
  onMove: (dxScene: number, dyScene: number) => void;
  onResize: (dwScene: number, dhScene: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const resizeRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canEdit) return;
    onFocus();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  }
  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = (e.clientX - d.lastX) / zoom;
    const dy = (e.clientY - d.lastY) / zoom;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    onMove(dx, dy);
  }
  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canEdit) return;
    e.stopPropagation();
    onFocus();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  }
  function moveResize(e: ReactPointerEvent<HTMLDivElement>) {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    const dw = (e.clientX - r.lastX) / zoom;
    const dh = (e.clientY - r.lastY) / zoom;
    r.lastX = e.clientX;
    r.lastY = e.clientY;
    onResize(dw, dh);
  }
  function endResize(e: ReactPointerEvent<HTMLDivElement>) {
    if (resizeRef.current?.pointerId === e.pointerId) resizeRef.current = null;
  }

  return (
    <div
      // Excalidraw draws its own scene onto <canvas> elements with an
      // explicit z-index (2) — without an explicit z-index of our own here
      // (the default "auto" resolves below any explicit value), every tool
      // instance would render underneath that canvas: present in the DOM,
      // fully real, but invisible and unclickable. z-20 clears it with
      // room under the tools-search dropdown/menus (z-30) that can open
      // above an instance.
      className="absolute z-20 flex flex-col overflow-hidden rounded-xl border border-ensena-border bg-ensena-surface shadow-lg"
      style={{ left: `${screenX}px`, top: `${screenY}px`, width: `${screenWidth}px`, height: `${screenHeight}px` }}
      onPointerDownCapture={onFocus}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-1 border-b border-ensena-border bg-ensena-bg-soft px-2 py-1.5",
          canEdit && "touch-none cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold text-ensena-ink">
          <GripVertical className="size-3 shrink-0 text-ensena-muted" /> <span className="truncate">{label}</span>
        </span>
        {canEdit && (
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDuplicate}
              aria-label="Duplicate"
              className="flex size-6 items-center justify-center rounded text-ensena-muted hover:bg-white hover:text-ensena-ink"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              aria-label="Remove"
              className="flex size-6 items-center justify-center rounded text-ensena-muted hover:bg-white hover:text-rose-600"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {canEdit && (
        <div
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          aria-hidden
          className="absolute bottom-0.5 right-0.5 size-5 touch-none cursor-nwse-resize rounded-tl bg-ensena-border/70"
        />
      )}
    </div>
  );
}
