"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  Circle,
  Diamond,
  Eraser,
  Hand,
  Highlighter,
  ImageUp,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
  ChevronDown,
  MousePointerClick,
} from "lucide-react";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ToolType } from "@excalidraw/excalidraw/types";

// A partial AppState update (e.g. { currentItemStrokeColor }) is the
// textbook, well-documented way to call ExcalidrawImperativeAPI.updateScene
// — but this package's own generated types require every AppState key at
// that call site (a known type-definition gap, not a real runtime
// constraint), so partial updates are asserted through `unknown` here
// rather than fighting an impossible-to-satisfy generic.
type PartialAppState = Record<string, unknown>;

import { cn } from "@/lib/utils";

// Dispatched at the document level — Excalidraw's own undo/redo keyboard
// shortcuts are wired globally (not scoped to a focused element), so this
// is the one reliable way to trigger its REAL undo/redo stack from a
// custom external button without a direct imperative API for it (Excalidraw
// exposes history.clear() only, not history.undo()/redo()).
function dispatchUndoRedo(redo: boolean) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, shiftKey: redo, bubbles: true }));
}

function RailButton({ active, onClick, label, icon: Icon }: { active?: boolean; onClick: () => void; label: string; icon: typeof Pencil }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
        active ? "bg-rose-50 text-rose-600" : "text-ensena-ink hover:bg-ensena-bg-soft"
      )}
    >
      <Icon className="size-4.5" />
    </button>
  );
}

// The custom left-edge drawing rail from the reference screens — replaces
// Excalidraw's own default toolbar (hidden via CSS, see whiteboard.tsx),
// driving the exact same real ExcalidrawImperativeAPI.setActiveTool() the
// native toolbar would have called. Same component serves desktop (wider,
// with text isn't shown — icons only, matching the reference) and mobile
// (narrower).
export function WhiteboardLeftRail({
  api,
  activeToolType,
  onOpenTools,
  onImageClick,
  onStickyNote,
  canEdit,
}: {
  api: ExcalidrawImperativeAPI | null;
  activeToolType: string | undefined;
  onOpenTools: () => void;
  /** Opens Ensena's own Upload Worksheet flow (real file input, camera-capture-friendly on mobile) rather than Excalidraw's native image tool. */
  onImageClick: () => void;
  /** Inserts a real Excalidraw sticky-note element — same action as picking "Sticky note" from the Tools search, just one tap closer per the reference screens. */
  onStickyNote?: () => void;
  canEdit: boolean;
}) {
  const [shapesOpen, setShapesOpen] = useState(false);

  function select(type: ToolType, extra?: PartialAppState) {
    if (!api) return;
    if (extra) api.updateScene({ appState: extra as unknown as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]["appState"] });
    api.setActiveTool({ type } as Parameters<ExcalidrawImperativeAPI["setActiveTool"]>[0]);
  }

  return (
    <div className="relative flex w-14 shrink-0 flex-col items-center gap-1 border-r border-ensena-border bg-ensena-surface py-2">
      <RailButton active={activeToolType === "selection"} onClick={() => select("selection")} label="Select" icon={MousePointer2} />
      {canEdit && (
        <>
          <RailButton active={activeToolType === "freedraw"} onClick={() => select("freedraw", { currentItemStrokeColor: "#1f2937", currentItemOpacity: 100, currentItemStrokeWidth: 2 })} label="Pen" icon={Pencil} />
          <RailButton
            active={activeToolType === "freedraw"}
            onClick={() => select("freedraw", { currentItemStrokeColor: "#fbbf24", currentItemOpacity: 50, currentItemStrokeWidth: 18 })}
            label="Highlighter"
            icon={Highlighter}
          />
          <RailButton active={activeToolType === "eraser"} onClick={() => select("eraser")} label="Eraser" icon={Eraser} />
          <RailButton active={activeToolType === "text"} onClick={() => select("text")} label="Text" icon={Type} />
          <div className="relative">
            <RailButton
              active={activeToolType === "rectangle" || activeToolType === "ellipse" || activeToolType === "diamond"}
              onClick={() => setShapesOpen((v) => !v)}
              label="Shapes"
              icon={Circle}
            />
            {shapesOpen && (
              <div className="absolute left-full top-0 z-30 ml-1 flex gap-1 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                <RailButton
                  active={activeToolType === "rectangle"}
                  onClick={() => {
                    select("rectangle");
                    setShapesOpen(false);
                  }}
                  label="Rectangle"
                  icon={Square}
                />
                <RailButton
                  active={activeToolType === "ellipse"}
                  onClick={() => {
                    select("ellipse");
                    setShapesOpen(false);
                  }}
                  label="Ellipse"
                  icon={Circle}
                />
                <RailButton
                  active={activeToolType === "diamond"}
                  onClick={() => {
                    select("diamond");
                    setShapesOpen(false);
                  }}
                  label="Diamond"
                  icon={Diamond}
                />
              </div>
            )}
          </div>
          {onStickyNote && <RailButton onClick={onStickyNote} label="Sticky note" icon={StickyNote} />}
          <RailButton onClick={onImageClick} label="Image" icon={ImageUp} />
          <RailButton active={activeToolType === "line"} onClick={() => select("line")} label="Line" icon={Minus} />
          <RailButton active={activeToolType === "arrow"} onClick={() => select("arrow")} label="Arrow" icon={ArrowUpRight} />
          <span className="my-1 h-px w-8 bg-ensena-border" />
          <RailButton onClick={() => dispatchUndoRedo(false)} label="Undo" icon={Undo2} />
          <RailButton onClick={() => dispatchUndoRedo(true)} label="Redo" icon={Redo2} />
          <span className="my-1 h-px w-8 bg-ensena-border" />
        </>
      )}
      <RailButton onClick={onOpenTools} label="Tools" icon={Briefcase} />
    </div>
  );
}

function PillButton({ active, onClick, label, icon: Icon }: { active?: boolean; onClick: () => void; label: string; icon: typeof Pencil }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", active ? "bg-rose-50 text-rose-600" : "text-ensena-ink hover:bg-ensena-bg-soft")}
    >
      <Icon className="size-4.5" />
    </button>
  );
}

// Mobile Private-Class reference screen's floating horizontal pill —
// distinct from the vertical rail above, which desktop and mobile Group
// Class both keep (see whiteboard.tsx for which one renders where). The
// less-frequently-used actions (Highlighter/Line/Arrow/Image/Redo/Select/
// Hand) live behind "More" so the primary pill stays compact on a phone
// screen rather than trying to cram the full desktop tool list in one row.
export function WhiteboardMobileToolbar({
  api,
  activeToolType,
  onOpenTools,
  onImageClick,
  canEdit,
}: {
  api: ExcalidrawImperativeAPI | null;
  activeToolType: string | undefined;
  onOpenTools: () => void;
  onImageClick: () => void;
  canEdit: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  function select(type: ToolType, extra?: PartialAppState) {
    if (!api) return;
    if (extra) api.updateScene({ appState: extra as unknown as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]["appState"] });
    api.setActiveTool({ type } as Parameters<ExcalidrawImperativeAPI["setActiveTool"]>[0]);
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-0.5 rounded-full border border-ensena-border bg-ensena-surface px-1.5 py-1.5 shadow-lg">
      <PillButton active={activeToolType === "selection"} onClick={() => select("selection")} label="Select" icon={MousePointer2} />
      {canEdit && (
        <>
          <PillButton active={activeToolType === "freedraw"} onClick={() => select("freedraw", { currentItemStrokeColor: "#1f2937", currentItemOpacity: 100, currentItemStrokeWidth: 2 })} label="Pen" icon={Pencil} />
          <PillButton active={activeToolType === "eraser"} onClick={() => select("eraser")} label="Eraser" icon={Eraser} />
          <PillButton active={activeToolType === "text"} onClick={() => select("text")} label="Text" icon={Type} />
          <PillButton active={activeToolType === "ellipse"} onClick={() => select("ellipse")} label="Shape" icon={Circle} />
          <PillButton onClick={() => dispatchUndoRedo(false)} label="Undo" icon={Undo2} />
        </>
      )}
      <PillButton onClick={onOpenTools} label="Tools" icon={Briefcase} />
      <div className="relative">
        <PillButton onClick={() => setMoreOpen((v) => !v)} label="More" icon={MoreHorizontal} />
        {moreOpen && canEdit && (
          <div className="absolute bottom-full right-0 z-30 mb-2 grid w-48 grid-cols-4 gap-1 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
            <PillButton
              active={activeToolType === "freedraw"}
              onClick={() => {
                select("freedraw", { currentItemStrokeColor: "#fbbf24", currentItemOpacity: 50, currentItemStrokeWidth: 18 });
                setMoreOpen(false);
              }}
              label="Highlighter"
              icon={Highlighter}
            />
            <PillButton
              active={activeToolType === "rectangle"}
              onClick={() => {
                select("rectangle");
                setMoreOpen(false);
              }}
              label="Rectangle"
              icon={Square}
            />
            <PillButton
              active={activeToolType === "line"}
              onClick={() => {
                select("line");
                setMoreOpen(false);
              }}
              label="Line"
              icon={Minus}
            />
            <PillButton
              active={activeToolType === "arrow"}
              onClick={() => {
                select("arrow");
                setMoreOpen(false);
              }}
              label="Arrow"
              icon={ArrowUpRight}
            />
            <PillButton
              active={activeToolType === "hand"}
              onClick={() => {
                select("hand");
                setMoreOpen(false);
              }}
              label="Pan"
              icon={Hand}
            />
            <PillButton
              onClick={() => {
                onImageClick();
                setMoreOpen(false);
              }}
              label="Image"
              icon={ImageUp}
            />
            <PillButton
              onClick={() => {
                dispatchUndoRedo(true);
                setMoreOpen(false);
              }}
              label="Redo"
              icon={Redo2}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const STROKE_COLORS = ["#1e1e1e", "#e03131", "#1971c2", "#2f9e44"];

// The floating undo/redo + select/hand + zoom pill docked near the top of
// the canvas — mirrors a subset of the left rail plus real zoom control
// (reads/writes the actual ExcalidrawImperativeAPI appState.zoom, and the
// real scrollToContent() fit-to-screen call), matching the reference
// screens' single pill. Stroke-color swatches (writes the actual
// currentItemStrokeColor appState, same mechanism the left rail's Pen
// button already uses) live behind "…" rather than crowding the pill.
export function WhiteboardTopPill({ api, zoomPercent, activeToolType, canEdit }: { api: ExcalidrawImperativeAPI | null; zoomPercent: number; activeToolType: string | undefined; canEdit: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false);

  function setZoom(nextPercent: number) {
    if (!api) return;
    const clamped = Math.min(400, Math.max(10, nextPercent));
    const appState: PartialAppState = { zoom: { value: clamped / 100 } as AppState["zoom"] };
    api.updateScene({ appState: appState as unknown as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]["appState"] });
  }

  function setStrokeColor(color: string) {
    if (!api) return;
    const appState: PartialAppState = { currentItemStrokeColor: color };
    api.updateScene({ appState: appState as unknown as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]["appState"] });
    setMoreOpen(false);
  }

  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-ensena-border bg-ensena-surface px-1.5 py-1 shadow-md">
      {canEdit && (
        <>
          <button type="button" aria-label="Undo" onClick={() => dispatchUndoRedo(false)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <Undo2 className="size-4" />
          </button>
          <button type="button" aria-label="Redo" onClick={() => dispatchUndoRedo(true)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <Redo2 className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-ensena-border" />
        </>
      )}
      <button
        type="button"
        aria-label="Select"
        onClick={() => api?.setActiveTool({ type: "selection" })}
        className={cn("flex size-8 items-center justify-center rounded-full", activeToolType === "selection" ? "bg-rose-50 text-rose-600" : "text-ensena-muted hover:bg-ensena-bg-soft")}
      >
        <MousePointerClick className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Pan"
        onClick={() => api?.setActiveTool({ type: "hand" })}
        className={cn("flex size-8 items-center justify-center rounded-full", activeToolType === "hand" ? "bg-rose-50 text-rose-600" : "text-ensena-muted hover:bg-ensena-bg-soft")}
      >
        <Hand className="size-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-ensena-border" />
      <button type="button" aria-label="Zoom out" onClick={() => setZoom(zoomPercent - 10)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
        <Minus className="size-3.5" />
      </button>
      <button type="button" onClick={() => setZoom(100)} className="flex h-8 items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
        {zoomPercent}% <ChevronDown className="size-3 text-ensena-muted" />
      </button>
      <button type="button" aria-label="Zoom in" onClick={() => setZoom(zoomPercent + 10)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
        <Plus className="size-3.5" />
      </button>
      {canEdit && (
        <div className="relative">
          <button type="button" aria-label="More" onClick={() => setMoreOpen((v) => !v)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <MoreHorizontal className="size-4" />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 flex items-center gap-1.5 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
              <button
                type="button"
                aria-label="Fit to screen"
                onClick={() => {
                  api?.scrollToContent(api.getSceneElements(), { fitToContent: true, animate: true });
                  setMoreOpen(false);
                }}
                className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <span className="h-5 w-px bg-ensena-border" />
              {STROKE_COLORS.map((color) => (
                <button key={color} type="button" aria-label={`Stroke color ${color}`} onClick={() => setStrokeColor(color)} className="flex size-8 items-center justify-center rounded-full hover:bg-ensena-bg-soft">
                  <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
