// The Ensena Classroom's Teaching Tools registry — one place that knows
// every tool's identity, category, and capabilities, so adding a future
// tool is a new registry entry (plus a body component), never a rewrite of
// the classroom itself. Two genuinely different kinds of "tool" live here:
//
//  - A real, positioned ToolInstance placed on the Excalidraw board
//    (Timer, Number Line, Coordinate Plane, ...) — movable, resizable,
//    duplicable, deletable, and — when `collaborative` — synchronized to
//    every other participant in real time via use-classroom-tools.ts, and
//    persisted via classroom-tool-instances-store.ts.
//  - A personal floating utility (Calculator) that is never shared —
//    correct on purpose: nobody wants their scratch arithmetic broadcast
//    to the rest of the room.
//  - A one-shot insert onto the Excalidraw scene itself (Sticky Note) —
//    ordinary Excalidraw content from that point on, riding the whiteboard's
//    own sync/persistence rather than the tool-instance system.
//
// Tools not yet built are listed with status "soon" so the library is
// honest about what it can't do yet, rather than omitting them (which
// would look like an oversight) or wiring a button that does nothing.
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// A sticky note: a filled rectangle with bound text, positioned near the
// current viewport center. Uses Excalidraw's own container+label skeleton
// so the text stays bound to (and wraps within) the note if it's resized.
export function buildStickyNoteElements(x: number, y: number): ExcalidrawElement[] {
  const skeleton: ExcalidrawElementSkeleton[] = [
    {
      type: "rectangle",
      x,
      y,
      width: 220,
      height: 160,
      backgroundColor: "#fff3b0",
      strokeColor: "#e0b400",
      fillStyle: "solid",
      roundness: { type: 3 },
      label: { text: "New note", fontSize: 20, textAlign: "left", verticalAlign: "top" },
    },
  ];
  return convertToExcalidrawElements(skeleton);
}

export type TeachingToolCategory = "Classroom" | "Math" | "Charts" | "Activities" | "Science" | "Language" | "Studio";

export type TeachingToolId =
  // Classroom
  | "sticky-note"
  | "timer"
  | "stopwatch"
  | "clock"
  | "random-picker"
  // Math
  | "number-line"
  | "coordinate-plane"
  | "fraction-circle"
  | "calculator"
  | "graph"
  | "ruler"
  | "protractor"
  | "compass"
  | "fraction-bar"
  | "geometry-shapes"
  // Charts
  | "bar-chart"
  | "line-chart"
  | "pie-chart"
  | "number-chart"
  | "coordinate-grid"
  // Activities
  | "flashcards"
  | "question-cards"
  | "quiz"
  | "matching"
  | "sorting"
  | "drag-and-drop"
  // Science
  | "periodic-table"
  | "measurement-tools"
  | "scientific-calculator"
  | "diagrams"
  // Language
  | "word-cards"
  | "text-tools"
  | "language-questions"
  // Studio
  | "coding-workspace"
  | "graphic-design-workspace";

export interface TeachingToolDef {
  id: TeachingToolId;
  label: string;
  category: TeachingToolCategory;
  description: string;
  status: "available" | "soon";
  /** Rendered as a real positioned ToolInstance on the Excalidraw board (movable/resizable/duplicable/deletable) rather than a one-off scene insert or a personal panel. */
  placedOnWhiteboard: boolean;
  /** State is synchronized to every other classroom participant in real time. */
  collaborative: boolean;
  /** Survives a refresh/reconnect and reopening the lesson later. */
  persistent: boolean;
  /** A student can interact with it (subject to Student Can Draw), not just view it. */
  studentInteraction: boolean;
  /** Extra search terms beyond the label/description — e.g. "graph" should also surface Coordinate Plane. */
  keywords?: string[];
}

export const TEACHING_TOOLS: TeachingToolDef[] = [
  // ---- Classroom ----
  { id: "timer", label: "Timer", category: "Classroom", description: "Shared countdown for an exercise", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "stopwatch", label: "Stopwatch", category: "Classroom", description: "Shared elapsed-time counter", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false, keywords: ["timer"] },
  { id: "random-picker", label: "Random Picker", category: "Classroom", description: "Randomly pick a name, question or item", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "clock", label: "Clock", category: "Classroom", description: "Analog/digital clock face", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "sticky-note", label: "Sticky Note", category: "Classroom", description: "A movable note on the board", status: "available", placedOnWhiteboard: false, collaborative: true, persistent: true, studentInteraction: true },

  // ---- Math ----
  { id: "number-line", label: "Number Line", category: "Math", description: "Adjustable range with tappable markers", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "coordinate-plane", label: "Coordinate Plane", category: "Math", description: "Plot points on an x/y grid", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true, keywords: ["graph"] },
  { id: "fraction-circle", label: "Fraction Circle", category: "Math", description: "Shade slices to represent a fraction", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "calculator", label: "Calculator", category: "Math", description: "Personal four-function calculator", status: "available", placedOnWhiteboard: false, collaborative: false, persistent: false, studentInteraction: true },
  { id: "graph", label: "Graph", category: "Math", description: "Plot functions and data points", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "ruler", label: "Ruler", category: "Math", description: "Measure and align on the board", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "protractor", label: "Protractor", category: "Math", description: "Measure angles", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "compass", label: "Compass", category: "Math", description: "Draw circles at a set radius", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "fraction-bar", label: "Fraction Bar", category: "Math", description: "Compare fractions as bars", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "geometry-shapes", label: "Geometry Shapes", category: "Math", description: "Draggable geometric shapes", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },

  // ---- Charts ----
  { id: "bar-chart", label: "Bar Chart", category: "Charts", description: "Configurable bar chart", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "line-chart", label: "Line Chart", category: "Charts", description: "Configurable line chart", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "pie-chart", label: "Pie Chart", category: "Charts", description: "Configurable pie chart", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "number-chart", label: "Number Chart", category: "Charts", description: "100s / skip-counting chart", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "coordinate-grid", label: "Coordinate Grid", category: "Charts", description: "Blank labelled grid", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false, keywords: ["graph"] },

  // ---- Activities ----
  { id: "flashcards", label: "Flashcards", category: "Activities", description: "Front/back cards tutor can flip through", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "question-cards", label: "Question Cards", category: "Activities", description: "Tutor asks, student answers", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "quiz", label: "Quiz", category: "Activities", description: "Multiple-choice with per-student results", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "matching", label: "Matching", category: "Activities", description: "Match pairs of items", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "sorting", label: "Sorting", category: "Activities", description: "Sort items into categories", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "drag-and-drop", label: "Drag and Drop", category: "Activities", description: "Tutor-built drag/drop activity", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },

  // ---- Science ----
  { id: "periodic-table", label: "Periodic Table", category: "Science", description: "Interactive element reference", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: false, studentInteraction: true },
  { id: "measurement-tools", label: "Measurement Tools", category: "Science", description: "Common measurement conversions", status: "available", placedOnWhiteboard: false, collaborative: false, persistent: false, studentInteraction: true },
  { id: "scientific-calculator", label: "Scientific Calculator", category: "Science", description: "Trig, powers, logs", status: "available", placedOnWhiteboard: false, collaborative: false, persistent: false, studentInteraction: true },
  { id: "diagrams", label: "Diagrams", category: "Science", description: "Reusable labelled-diagram framework", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },

  // ---- Language ----
  { id: "word-cards", label: "Word Cards", category: "Language", description: "Word, definition and example", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: false },
  { id: "text-tools", label: "Text Tools", category: "Language", description: "Rich text on the board", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },
  { id: "language-questions", label: "Question Cards", category: "Language", description: "Tutor asks, student answers", status: "available", placedOnWhiteboard: true, collaborative: true, persistent: true, studentInteraction: true },

  // ---- Studio ----
  {
    id: "coding-workspace",
    label: "Coding Workspace",
    category: "Studio",
    description: "HTML/CSS/JS editor with a live sandboxed preview",
    status: "available",
    placedOnWhiteboard: true,
    collaborative: true,
    persistent: true,
    studentInteraction: true,
    keywords: ["code", "html", "css", "javascript", "sandbox", "editor"],
  },
  {
    id: "graphic-design-workspace",
    label: "Graphic Design",
    category: "Studio",
    description: "Shape-based design canvas with export",
    status: "available",
    placedOnWhiteboard: true,
    collaborative: true,
    persistent: true,
    studentInteraction: true,
    keywords: ["design", "canvas", "poster", "shapes"],
  },
];

export function findTeachingTool(id: TeachingToolId): TeachingToolDef | undefined {
  return TEACHING_TOOLS.find((t) => t.id === id);
}

// Starting size/state for a brand-new instance of a placed-on-whiteboard
// tool — kept together so use-classroom-tools.ts's createInstance() caller
// (whiteboard.tsx) has one place to look up "what does a fresh one of
// these look like."
export function defaultToolInstance(id: TeachingToolId): { width: number; height: number; state: Record<string, unknown> } {
  switch (id) {
    case "timer":
      return { width: 220, height: 190, state: { durationSec: 300, remainingAtLastChangeSec: 300, startedAtMs: null, status: "idle" } };
    case "stopwatch":
      return { width: 220, height: 160, state: { accumulatedSec: 0, startedAtMs: null, status: "idle" } };
    case "random-picker":
      return { width: 260, height: 220, state: { items: [], result: null } };
    case "number-line":
      return { width: 420, height: 160, state: { min: -10, max: 10, markers: [] } };
    case "coordinate-plane":
      return { width: 320, height: 320, state: { range: 10, points: [] } };
    case "fraction-circle":
      return { width: 220, height: 260, state: { denominator: 4, filled: [] } };
    case "clock": {
      const now = new Date();
      return { width: 200, height: 230, state: { hours: now.getHours(), minutes: now.getMinutes() } };
    }
    case "flashcards":
      return { width: 260, height: 280, state: { cards: [], currentIndex: 0, flipped: false } };
    case "graph":
      return { width: 300, height: 340, state: {} };
    case "ruler":
      return { width: 300, height: 260, state: {} };
    case "protractor":
      return { width: 260, height: 220, state: {} };
    case "compass":
      return { width: 240, height: 260, state: {} };
    case "fraction-bar":
      return { width: 260, height: 220, state: {} };
    case "geometry-shapes":
      return { width: 300, height: 280, state: {} };
    case "bar-chart":
    case "line-chart":
    case "pie-chart":
      return { width: 300, height: 260, state: {} };
    case "number-chart":
      return { width: 300, height: 300, state: {} };
    case "coordinate-grid":
      return { width: 300, height: 300, state: {} };
    case "quiz":
      return { width: 300, height: 320, state: {} };
    case "question-cards":
    case "language-questions":
      return { width: 280, height: 260, state: {} };
    case "matching":
      return { width: 320, height: 280, state: {} };
    case "sorting":
      return { width: 320, height: 300, state: {} };
    case "drag-and-drop":
      return { width: 320, height: 300, state: {} };
    case "periodic-table":
      return { width: 460, height: 320, state: {} };
    case "diagrams":
      return { width: 300, height: 320, state: {} };
    case "word-cards":
      return { width: 280, height: 280, state: {} };
    case "text-tools":
      return { width: 300, height: 260, state: {} };
    case "coding-workspace":
      return { width: 480, height: 440, state: {} };
    case "graphic-design-workspace":
      return { width: 460, height: 440, state: {} };
    default:
      return { width: 260, height: 200, state: {} };
  }
}
