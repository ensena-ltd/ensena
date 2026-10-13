"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI, BinaryFileData, BinaryFiles, DataURL } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import { Check, ChevronDown, Cloud, FileText, Lock, Maximize2, MessageSquare, NotebookPen, Plus, Search, Unlock, Users, Wifi, WifiOff } from "lucide-react";

import { ClassroomCalculatorTool } from "@/components/classroom/classroom-calculator-tool";
import { MeasurementToolsPanel } from "@/components/classroom/measurement-tools-panel";
import { WhiteboardLeftRail, WhiteboardMobileToolbar, WhiteboardTopPill } from "@/components/tutor-dashboard/classroom/whiteboard-rail";
import { ToolInstanceLayer } from "@/components/classroom/tools/tool-instance-layer";
import { useClassroomWhiteboard } from "@/hooks/use-classroom-whiteboard";
import { useClassroomTools } from "@/hooks/use-classroom-tools";
import type { WhiteboardFile, WhiteboardPermissionMode } from "@/lib/classroom-whiteboard-store";
import { buildStickyNoteElements, defaultToolInstance, TEACHING_TOOLS, type TeachingToolCategory, type TeachingToolId } from "@/lib/classroom-teaching-tools";
import { cn } from "@/lib/utils";

const PERMISSION_MODES: { mode: WhiteboardPermissionMode; label: string; description: string }[] = [
  { mode: "tutor-only", label: "Tutor Only", description: "Students can watch, not draw" },
  { mode: "everyone", label: "Everyone", description: "Every student can draw" },
  { mode: "selected", label: "Selected Students", description: "Only the students you pick" },
  { mode: "activity", label: "Activity Mode", description: "Students can answer activities, not free-draw" },
];

// The tutor's real whiteboard-permission control — Tutor Only / Everyone /
// Selected Students / Activity Mode, each one genuinely enforced (see
// use-classroom-whiteboard.ts's canDraw/canInteractWithTools), not just a
// label on an otherwise-unchanged on/off switch.
function PermissionMenu({
  mode,
  selectedStudentNames,
  studentNames,
  onChange,
  iconSize,
}: {
  mode: WhiteboardPermissionMode;
  selectedStudentNames: string[];
  studentNames: string[];
  onChange: (mode: WhiteboardPermissionMode, selectedStudentNames: string[]) => void;
  iconSize: string;
}) {
  const [open, setOpen] = useState(false);
  const current = PERMISSION_MODES.find((m) => m.mode === mode) ?? PERMISSION_MODES[1];

  function toggleStudent(name: string) {
    const next = selectedStudentNames.includes(name) ? selectedStudentNames.filter((n) => n !== name) : [...selectedStudentNames, name];
    onChange("selected", next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          mode === "everyone" ? "bg-emerald-100 text-emerald-700" : mode === "tutor-only" ? "bg-ensena-bg-soft text-ensena-ink" : "bg-ensena-primary/10 text-ensena-primary"
        )}
      >
        {mode === "tutor-only" ? <Lock className={iconSize} /> : <Unlock className={iconSize} />}
        {current.label}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
          {PERMISSION_MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => {
                onChange(m.mode, selectedStudentNames);
                if (m.mode !== "selected") setOpen(false);
              }}
              className={cn("flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left", mode === m.mode ? "bg-ensena-primary/10" : "hover:bg-ensena-bg-soft")}
            >
              <span className={cn("flex items-center gap-1.5 text-xs font-semibold", mode === m.mode ? "text-ensena-primary" : "text-ensena-ink")}>
                {mode === m.mode && <Check className="size-3" />} {m.label}
              </span>
              <span className="text-[11px] text-ensena-muted">{m.description}</span>
            </button>
          ))}
          {mode === "selected" && (
            <div className="mt-1 border-t border-ensena-border pt-1.5">
              {studentNames.length === 0 && <p className="px-2.5 py-1 text-[11px] text-ensena-muted">No enrolled students to choose from.</p>}
              {studentNames.map((name) => (
                <label key={name} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ensena-ink hover:bg-ensena-bg-soft">
                  <input type="checkbox" checked={selectedStudentNames.includes(name)} onChange={() => toggleStudent(name)} className="size-3.5 accent-ensena-primary" />
                  {name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TOOL_CATEGORIES: TeachingToolCategory[] = ["Classroom", "Math", "Charts", "Activities", "Science", "Language", "Studio"];

// Excalidraw touches the DOM/canvas directly and has no meaningful SSR
// output — loaded client-only, same pattern Next.js recommends for any
// canvas/editor library.
const ExcalidrawCanvas = dynamic(() => import("@excalidraw/excalidraw").then((m) => m.Excalidraw), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-ensena-bg-soft text-sm text-ensena-muted">Loading whiteboard…</div>
  ),
});

interface WhiteboardProps {
  /** Stable identity shared by the tutor's and student's own renders of the same lesson (ClassroomSession.classroomId). Omit only for a standalone/demo mount with no real lesson behind it. */
  classroomId?: string;
  role?: "tutor" | "student";
  selfName?: string;
  subject?: string;
  title?: string;
  /** Forces view-only regardless of role/student-editing state — used by Admin's classroom observation view. */
  readOnly?: boolean;
  compact?: boolean;
  /** Group Class's mobile reference screen keeps the vertical rail (plus a participant strip); Private Class's mobile reference screen uses a floating horizontal pill instead — see WhiteboardMobileToolbar. */
  isGroup?: boolean;
  /** Real enrolled students' display names — populates the "Selected Students" permission mode's checklist. Never fabricated; omitted (rather than guessed) when the caller has none to offer. */
  studentNames?: string[];
  /** @deprecated Excalidraw sizes itself to its container; kept only so older call sites still compile. */
  width?: number;
  /** @deprecated see width. */
  height?: number;
  onNotice?: (message: string) => void;
  /** A confirmed high-confidence contact-sharing finding on the board ends the live session for both participants — see classroom-shell.tsx's terminateForViolation. Omitted for standalone/demo/read-only mounts, where a violation just falls back to the ordinary onNotice toast. */
  onHighConfidenceViolation?: () => void;
  /** Opens the shared classroom drawer to that panel — Whiteboard mode has its own bottom bar (no separate outer toolbar in this mode, see classroom-toolbar.tsx), so these are how Files/Notes/Chat stay reachable. */
  onOpenChat?: () => void;
  onOpenFiles?: () => void;
  onOpenNotes?: () => void;
}

function toolLabel(id: TeachingToolId): string {
  return TEACHING_TOOLS.find((t) => t.id === id)?.label ?? id;
}

export function Whiteboard({
  classroomId,
  role = "tutor",
  selfName,
  subject = "Whiteboard",
  title,
  readOnly = false,
  compact = false,
  isGroup = false,
  studentNames = [],
  onNotice,
  onHighConfidenceViolation,
  onOpenChat,
  onOpenFiles,
  onOpenNotes,
}: WhiteboardProps) {
  // Lazy useState initializer (runs exactly once, not on every render) —
  // a ref can't be read or written during render itself under React's
  // stricter purity rules, so this replaces what would otherwise be a
  // "compute once into a ref" pattern.
  const [fallbackId] = useState(() => `standalone:${Math.random().toString(36).slice(2, 10)}`);
  const resolvedClassroomId = classroomId ?? fallbackId;
  const resolvedSelfName = selfName ?? (role === "tutor" ? "Tutor" : "Student");
  const resolvedTitle = title ?? subject;

  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Mirrors excalidrawApiRef purely so the left rail / top pill (rendered
  // below) can receive it as a prop — a ref's .current can't be read
  // during render itself, only from effects/handlers, so anything the
  // render output actually needs goes through this instead.
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const applyingRemoteRef = useRef(false);
  // Excalidraw's onChange fires on essentially every animation frame, not
  // just real edits (its own internal ResizeObserver alone was enough to
  // fire it dozens of times a second on a completely untouched, blank
  // board — see sanitizeAppState's doc comment for how that was confirmed
  // live). Stripping the volatile fields there fixes WHAT gets saved/
  // broadcast, but onChange still fires just as often — this is the second
  // half of the fix: skip calling handleLocalChange (and therefore
  // resetting its save/broadcast debounce) entirely unless the sanitized
  // elements+appState actually differ from last time. Without this, the
  // debounce could be reset every ~100ms forever and never actually fire,
  // meaning drawn content could go unsaved and unbroadcast indefinitely.
  const lastMeaningfulSignatureRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [calculatorOpen, setCalculatorOpen] = useState<{ open: boolean; scientific: boolean }>({ open: false, scientific: false });
  const [measurementToolsOpen, setMeasurementToolsOpen] = useState(false);
  // Tracks pan/zoom only — kept separate from the scene's own onChange
  // handling below so panning the board doesn't need to go anywhere near
  // scene-broadcast/save logic to keep floating tool instances positioned
  // correctly (see ToolInstanceLayer, which maps each instance's stored
  // scene-space x/y into current screen-space using this).
  const [viewport, setViewport] = useState<Pick<AppState, "scrollX" | "scrollY" | "zoom">>({ scrollX: 0, scrollY: 0, zoom: { value: 1 as AppState["zoom"]["value"] } });
  // Drives the custom left rail/top pill's active-tool highlight — real
  // Excalidraw appState, not a locally-tracked guess.
  const [activeToolType, setActiveToolType] = useState<string>("selection");

  function notify(message: string, highConfidence = false) {
    if (highConfidence && onHighConfidenceViolation) {
      onHighConfidenceViolation();
      return;
    }
    if (onNotice) onNotice(message);
    else window.alert(message);
  }

  const handleRemoteScene = useCallback((scene: { elements: readonly unknown[]; appState: Record<string, unknown>; files?: WhiteboardFile[] }) => {
    applyingRemoteRef.current = true;
    // Register any incoming images BEFORE applying the elements that
    // reference them — an image element pointing at a fileId Excalidraw
    // hasn't seen yet renders as nothing.
    if (scene.files?.length) {
      excalidrawApiRef.current?.addFiles(
        scene.files.map((f): BinaryFileData => ({ id: f.id as FileId, dataURL: f.dataURL as DataURL, mimeType: f.mimeType as BinaryFileData["mimeType"], created: f.created }))
      );
    }
    excalidrawApiRef.current?.updateScene({ elements: scene.elements as ExcalidrawElement[] });
    // Excalidraw's onChange fires as part of applying this same update —
    // release the guard right after so the NEXT genuinely-local edit still
    // broadcasts normally.
    requestAnimationFrame(() => {
      applyingRemoteRef.current = false;
    });
  }, []);

  const {
    loading,
    initialScene,
    boardKey,
    boardOrder,
    switchBoard,
    addBoard,
    handleLocalChange,
    saveStatus,
    connected,
    presence,
    permissionMode,
    selectedStudentNames,
    setWhiteboardPermission,
    canDraw: hookCanDraw,
    canInteractWithTools: hookCanInteractWithTools,
  } = useClassroomWhiteboard({
    classroomId: resolvedClassroomId,
    role,
    selfName: resolvedSelfName,
    subject,
    title: resolvedTitle,
    onRemoteScene: handleRemoteScene,
    onViolation: notify,
  });

  const canEdit = readOnly ? false : hookCanDraw;
  const canInteractWithTools = readOnly ? false : hookCanInteractWithTools;

  // A freshly-mounted <ExcalidrawCanvas key={boardKey}> (see below) starts
  // reporting the NEW page's own content — the "did anything meaningful
  // change" signature from whichever page was active before must not carry
  // over, or it's comparing against the wrong page's history entirely.
  useEffect(() => {
    lastMeaningfulSignatureRef.current = null;
  }, [boardKey]);

  const { instances: toolInstances, createInstance, updateInstance, deleteInstance, duplicateInstance } = useClassroomTools({
    classroomId: resolvedClassroomId,
    boardKey,
    role,
    canEdit: canInteractWithTools,
    onDenied: () => notify("Only your tutor can do that with this tool."),
  });

  function toWhiteboardFiles(files: BinaryFiles): WhiteboardFile[] {
    return Object.values(files).map((f) => ({ id: f.id, dataURL: f.dataURL, mimeType: f.mimeType, created: f.created }));
  }

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function readImageDimensions(dataURL: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Couldn't read image dimensions"));
      img.src = dataURL;
    });
  }

  // `collaborators` is live, in-memory-only Excalidraw state (a real Map) —
  // it can never survive a JSON round-trip (Map serializes to "{}"), so it
  // must never be written to storage/broadcast in the first place. See the
  // matching note on ExcalidrawCanvas's initialData below.
  //
  // `offsetLeft`/`offsetTop`/`width`/`height` are this VIEWER's own canvas
  // container measurements, re-reported by Excalidraw's internal
  // ResizeObserver on essentially every animation frame due to sub-pixel
  // floating-point jitter in the browser's own layout measurements — not a
  // real scene edit. Confirmed live: with a completely blank board and zero
  // user interaction, onChange fired dozens of times within a few seconds
  // with only these four fields "changing" — which kept resetting the save/
  // broadcast debounce forever, so drawn content could go unsaved and
  // unbroadcast indefinitely. They're also meaningless to persist or send
  // to a remote peer in the first place: that's THIS viewer's own container
  // size, not scene content — applying it to a different participant's
  // differently-sized container would be actively wrong, not just noise.
  // `scrollX`/`scrollY`/`zoom` are excluded for the same "not real scene
  // content" reason — this app already tracks pan/zoom separately via
  // onScrollChange (see its own doc comment) precisely because it doesn't
  // belong in the saved/broadcast scene state.
  function sanitizeAppState(appState: ReturnType<ExcalidrawImperativeAPI["getAppState"]>): Record<string, unknown> {
    const { collaborators: _collaborators, offsetLeft: _offsetLeft, offsetTop: _offsetTop, width: _width, height: _height, scrollX: _scrollX, scrollY: _scrollY, zoom: _zoom, ...rest } = appState;
    return rest as unknown as Record<string, unknown>;
  }

  // Real "Upload Worksheet" flow — a photo (from disk, or straight from a
  // phone's camera via the native file picker's own "Take Photo" option;
  // there is no separate mobile-only code path here) becomes a genuine
  // Excalidraw image element, registered via addFiles so it's actually
  // annotatable (draw on top of it) rather than a static background.
  async function insertImageFile(file: File) {
    if (!canEdit) {
      notify("Ask your tutor for drawing permission to add files to the board.");
      return;
    }
    const api = excalidrawApiRef.current;
    if (!api) return;
    try {
      const dataURL = await readFileAsDataURL(file);
      const { width, height } = await readImageDimensions(dataURL);
      const maxWidth = 480;
      const scale = width > maxWidth ? maxWidth / width : 1;
      const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as FileId;
      api.addFiles([{ id: fileId, dataURL: dataURL as DataURL, mimeType: (file.type || "image/png") as BinaryFileData["mimeType"], created: Date.now() }]);

      const appState = api.getAppState();
      const [imageElement] = convertToExcalidrawElements([
        { type: "image", fileId, x: -appState.scrollX + 80, y: -appState.scrollY + 80, width: width * scale, height: height * scale },
      ]);
      const next = [...api.getSceneElementsIncludingDeleted(), imageElement];
      api.updateScene({ elements: next });
      handleLocalChange(next, sanitizeAppState(appState), toWhiteboardFiles(api.getFiles()));
      notify("Worksheet added to the board. Draw on it like anything else.");
    } catch {
      notify("Couldn't add that file to the board.");
    }
  }

  function insertToolElements(build: (x: number, y: number) => ExcalidrawElement[]) {
    const api = excalidrawApiRef.current;
    if (!api) return;
    const appState = api.getAppState();
    const centerX = -appState.scrollX + 160;
    const centerY = -appState.scrollY + 120;
    const current = api.getSceneElementsIncludingDeleted();
    const inserted = build(centerX, centerY);
    const next = [...current, ...inserted];
    api.updateScene({ elements: next });
    handleLocalChange(next, sanitizeAppState(appState));
  }

  // Instances shared/synced via useClassroomTools (a real positioned window
  // on the board, per TEACHING_TOOLS[id].placedOnWhiteboard) — everything
  // else this switch handles is either a one-off Excalidraw scene insert
  // (Sticky Note) or a personal, non-synced panel (Calculator/Scientific
  // Calculator/Measurement Tools).
  const INSTANCE_TOOL_IDS: TeachingToolId[] = [
    "timer",
    "stopwatch",
    "random-picker",
    "number-line",
    "coordinate-plane",
    "fraction-circle",
    "clock",
    "flashcards",
    "graph",
    "ruler",
    "protractor",
    "compass",
    "fraction-bar",
    "geometry-shapes",
    "bar-chart",
    "line-chart",
    "pie-chart",
    "number-chart",
    "coordinate-grid",
    "quiz",
    "question-cards",
    "language-questions",
    "matching",
    "sorting",
    "drag-and-drop",
    "periodic-table",
    "diagrams",
    "word-cards",
    "text-tools",
    "coding-workspace",
    "graphic-design-workspace",
  ];

  function handleToolClick(id: TeachingToolId) {
    setToolsOpen(false);
    // Personal panels are usable regardless of draw permission — they
    // never touch the shared board, so "can this student draw" doesn't
    // apply to them any more than it would to a clock on the wall.
    if (id === "calculator") {
      setCalculatorOpen({ open: true, scientific: false });
      return;
    }
    if (id === "scientific-calculator") {
      setCalculatorOpen({ open: true, scientific: true });
      return;
    }
    if (id === "measurement-tools") {
      setMeasurementToolsOpen(true);
      return;
    }
    // Placing a new tool on the board is host (tutor) board management,
    // regardless of the current whiteboard permission mode — see useClassroomTools's own gate,
    // which enforces this same rule even if this check were bypassed.
    if (INSTANCE_TOOL_IDS.includes(id)) {
      if (role !== "tutor") {
        notify("Only your tutor can add tools to the board.");
        return;
      }
      const api = excalidrawApiRef.current;
      const appState = api?.getAppState();
      // Cascades each new instance a little further down/right than the
      // last (same idea as duplicateInstance's own +24/+24 offset) — every
      // tool spawning at the exact same fixed point would stack them
      // perfectly on top of each other as a tutor opens several in a row.
      const cascade = (toolInstances.length % 8) * 28;
      const centerX = (appState ? -appState.scrollX + 120 : 120) + cascade;
      const centerY = (appState ? -appState.scrollY + 100 : 100) + cascade;
      const { width, height, state } = defaultToolInstance(id);
      createInstance(id, { x: centerX, y: centerY, width, height, state });
      return;
    }
    if (!canEdit) {
      notify("Ask your tutor for drawing permission to add this to the board.");
      return;
    }
    if (id === "sticky-note") {
      insertToolElements(buildStickyNoteElements);
      return;
    }
    notify(`${toolLabel(id)} is coming soon.`);
  }

  const iconSize = compact ? "size-4" : "size-3.5";
  const presenceOther = presence.find((p) => p.role !== role);

  return (
    <div className="flex h-full flex-col">
      {/* Hides Excalidraw's own default toolbar/zoom chrome so the custom
          left rail + floating top pill below are the only visible controls
          — real ExcalidrawImperativeAPI calls drive them, this is purely a
          skin change, not a fork of Excalidraw's behavior. */}
      <style>{`.ensena-whiteboard-canvas .App-menu_top { display: none !important; }`}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void insertImageFile(file);
        }}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Group Class's mobile reference screen keeps the same vertical
            rail desktop uses (plus a participant strip elsewhere); Private
            Class's mobile reference screen floats a horizontal pill over
            the canvas instead — rendered as a sibling further down since it
            needs to be absolutely positioned within the canvas area. */}
        {!readOnly && (compact ? isGroup : true) && (
          <WhiteboardLeftRail
            api={excalidrawApi}
            activeToolType={activeToolType}
            canEdit={canEdit}
            onOpenTools={() => setToolsOpen((v) => !v)}
            onImageClick={() => (canEdit ? fileInputRef.current?.click() : notify("Ask your tutor for drawing permission to add files to the board."))}
            onStickyNote={canEdit ? () => insertToolElements(buildStickyNoteElements) : undefined}
          />
        )}

        <div className="ensena-whiteboard-canvas relative min-h-0 flex-1">
          {loading ? (
            <div className="flex size-full items-center justify-center bg-ensena-bg-soft text-sm text-ensena-muted">Loading whiteboard…</div>
          ) : (
            <ExcalidrawCanvas
              // A Page is a genuinely independent Excalidraw scene — but
              // `initialData` is a one-time-read prop; Excalidraw manages its
              // own internal scene state after mounting and simply ignores a
              // changed `initialData` on a later render (confirmed: without
              // this, switching pages updated `initialScene` in React state
              // correctly, but the on-screen canvas kept showing whichever
              // page was already mounted — the exact "Page 2 shows Page 1's
              // content" bug). Keying on `boardKey` forces a real unmount +
              // fresh mount on every page switch, which is the only reliable
              // way to hand Excalidraw a genuinely new `initialData` — no
              // element-reconciliation edge cases, no dependence on React's
              // batching of the loading-state effect above.
              key={boardKey}
              excalidrawAPI={(api) => {
                excalidrawApiRef.current = api;
                setExcalidrawApi(api);
              }}
              // `collaborators` must always be a real Map — Excalidraw calls
              // .forEach on it internally. It can never survive a JSON
              // round-trip intact (Map serializes to "{}"), so a scene loaded
              // from localStorage/Supabase that ever had one saved comes back
              // as a plain object and crashes the canvas on mount. Forcing a
              // fresh Map here fixes already-corrupted saved boards; stripping
              // it in onChange below stops new ones from being written.
              initialData={{ elements: initialScene.elements as ExcalidrawElement[], appState: { ...initialScene.appState, collaborators: new Map(), viewBackgroundColor: "#ffffff" } }}
              onChange={(elements, appState, files) => {
                setActiveToolType(appState.activeTool.type);
                if (applyingRemoteRef.current) return;
                const cleanAppState = sanitizeAppState(appState);
                const filesList = toWhiteboardFiles(files);
                // Cheap JSON signature, not a deep-equal library — this only
                // needs to reject the extremely common "nothing real
                // changed" case; a false-negative here just means one extra
                // (still correct) save/broadcast, not a correctness bug.
                const signature = JSON.stringify({ elements, appState: cleanAppState, files: filesList });
                if (signature === lastMeaningfulSignatureRef.current) return;
                lastMeaningfulSignatureRef.current = signature;
                handleLocalChange(elements, cleanAppState, filesList);
              }}
              // Dedicated pan/zoom callback (rather than piggybacking on
              // onChange) — panning/zooming never touches `elements`, so this
              // is the one Excalidraw actually guarantees fires for it. Feeds
              // ToolInstanceLayer's scene-to-screen coordinate conversion and
              // the floating top pill's real zoom-percent readout.
              onScrollChange={(scrollX, scrollY, zoom) => setViewport({ scrollX, scrollY, zoom })}
              viewModeEnabled={!canEdit}
              theme="light"
            />
          )}

          <WhiteboardTopPill api={excalidrawApi} zoomPercent={Math.round(viewport.zoom.value * 100)} activeToolType={activeToolType} canEdit={canEdit} />

          {compact && isGroup && (
            <button
              type="button"
              onClick={() => excalidrawApi?.scrollToContent(excalidrawApi.getSceneElements(), { fitToContent: true, animate: true })}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1.5 text-xs font-semibold text-ensena-ink shadow-md"
            >
              <Maximize2 className="size-3.5" /> Fit to screen
            </button>
          )}

          {!readOnly && compact && !isGroup && (
            <WhiteboardMobileToolbar
              api={excalidrawApi}
              activeToolType={activeToolType}
              canEdit={canEdit}
              onOpenTools={() => setToolsOpen((v) => !v)}
              onImageClick={() => (canEdit ? fileInputRef.current?.click() : notify("Ask your tutor for drawing permission to add files to the board."))}
            />
          )}

          {toolsOpen && (
            <div className="absolute bottom-2 left-2 z-30 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
              <div className="relative mb-1.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ensena-muted" />
                <input
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Search tools…"
                  className="h-8 w-full rounded-lg border border-ensena-border bg-ensena-bg-soft pl-8 pr-2 text-xs outline-none focus:border-ensena-primary"
                />
              </div>
              {TOOL_CATEGORIES.map((category) => {
                const query = toolSearch.trim().toLowerCase();
                const tools = TEACHING_TOOLS.filter((t) => {
                  if (t.category !== category) return false;
                  if (!query) return true;
                  return t.label.toLowerCase().includes(query) || t.description.toLowerCase().includes(query) || (t.keywords ?? []).some((k) => k.includes(query));
                });
                if (tools.length === 0) return null;
                return (
                  <div key={category} className="mb-1 last:mb-0">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">{category}</p>
                    {tools.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={t.status === "soon"}
                        onClick={() => handleToolClick(t.id)}
                        title={t.description}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm",
                          t.status === "soon" ? "cursor-not-allowed text-ensena-muted/60" : "text-ensena-ink hover:bg-ensena-bg-soft"
                        )}
                      >
                        {t.label}
                        {t.status === "soon" && <span className="rounded-full bg-ensena-bg-soft px-1.5 py-0.5 text-[10px] font-medium text-ensena-muted">Soon</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (
            <ToolInstanceLayer
              instances={toolInstances}
              appState={viewport}
              isHost={role === "tutor"}
              canEdit={canEdit}
              selfName={resolvedSelfName}
              onUpdate={updateInstance}
              onDelete={deleteInstance}
              onDuplicate={duplicateInstance}
            />
          )}

          {calculatorOpen.open && (
            <ClassroomCalculatorTool defaultScientific={calculatorOpen.scientific} onClose={() => setCalculatorOpen({ open: false, scientific: false })} />
          )}
          {measurementToolsOpen && <MeasurementToolsPanel onClose={() => setMeasurementToolsOpen(false)} />}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-ensena-border bg-ensena-surface p-2">
        <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ensena-muted sm:flex">Pages</span>
        {boardOrder.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => switchBoard(key)}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold",
              boardKey === key ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
            )}
          >
            {i + 1}
          </button>
        ))}
        {!readOnly && canEdit && (
          <button type="button" onClick={addBoard} aria-label="Add page" className="flex size-9 items-center justify-center rounded-lg border border-dashed border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <Plus className="size-3.5" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className={cn("hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium sm:flex", connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {connected ? (presenceOther ? `${presenceOther.name} is here` : "Waiting…") : "Reconnecting…"}
          </span>
          <span className="hidden items-center gap-1 text-[11px] text-ensena-muted sm:flex">
            {saveStatus === "saving" ? <Cloud className="size-3 animate-pulse" /> : <Cloud className="size-3 text-emerald-600" />}
            {saveStatus === "saving" ? "Saving…" : "Saved"}
          </span>
          {role === "tutor" && !readOnly && (
            <PermissionMenu mode={permissionMode} selectedStudentNames={selectedStudentNames} studentNames={studentNames} onChange={setWhiteboardPermission} iconSize={iconSize} />
          )}
          {role === "student" && !canEdit && (
            <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1 text-[11px] font-semibold text-ensena-ink">
              <Lock className={iconSize} /> {permissionMode === "activity" ? "Activity Mode" : "View Only"}
            </span>
          )}
          {readOnly && (
            <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1 text-[11px] font-semibold text-ensena-ink">
              <Users className={iconSize} /> Observing
            </span>
          )}
          {onOpenChat && (
            <button type="button" onClick={onOpenChat} className="hidden items-center gap-1 rounded-lg border border-ensena-border px-2.5 py-1.5 text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft sm:flex">
              <MessageSquare className="size-3.5" /> Chat
            </button>
          )}
          {onOpenFiles && (
            <button type="button" onClick={onOpenFiles} className="hidden items-center gap-1 rounded-lg border border-ensena-border px-2.5 py-1.5 text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft sm:flex">
              <FileText className="size-3.5" /> Files
            </button>
          )}
          {onOpenNotes && (
            <button type="button" onClick={onOpenNotes} className="hidden items-center gap-1 rounded-lg border border-ensena-border px-2.5 py-1.5 text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft sm:flex">
              <NotebookPen className="size-3.5" /> Notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
