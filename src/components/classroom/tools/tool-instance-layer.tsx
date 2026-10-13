"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { AppState } from "@excalidraw/excalidraw/types";

import type { ToolInstance } from "@/lib/classroom-sync";
import { findTeachingTool, type TeachingToolId } from "@/lib/classroom-teaching-tools";
import { ToolCard } from "@/components/classroom/tools/tool-card";
import { TimerToolBody } from "@/components/classroom/tools/timer-tool-body";
import { StopwatchToolBody } from "@/components/classroom/tools/stopwatch-tool-body";
import { RandomPickerToolBody } from "@/components/classroom/tools/random-picker-tool-body";
import { NumberLineToolBody } from "@/components/classroom/tools/number-line-tool-body";
import { CoordinatePlaneToolBody } from "@/components/classroom/tools/coordinate-plane-tool-body";
import { FractionCircleToolBody } from "@/components/classroom/tools/fraction-circle-tool-body";
import { ClockToolBody } from "@/components/classroom/tools/clock-tool-body";
import { FlashcardsToolBody } from "@/components/classroom/tools/flashcards-tool-body";
import { GraphToolBody } from "@/components/classroom/tools/graph-tool-body";
import { RulerToolBody } from "@/components/classroom/tools/ruler-tool-body";
import { ProtractorToolBody } from "@/components/classroom/tools/protractor-tool-body";
import { CompassToolBody } from "@/components/classroom/tools/compass-tool-body";
import { FractionBarToolBody } from "@/components/classroom/tools/fraction-bar-tool-body";
import { GeometryShapesToolBody } from "@/components/classroom/tools/geometry-shapes-tool-body";
import { BarChartToolBody, LineChartToolBody, PieChartToolBody } from "@/components/classroom/tools/chart-tool-bodies";
import { NumberChartToolBody } from "@/components/classroom/tools/number-chart-tool-body";
import { CoordinateGridToolBody } from "@/components/classroom/tools/coordinate-grid-tool-body";
import { QuizToolBody } from "@/components/classroom/tools/quiz-tool-body";
import { QuestionCardToolBody } from "@/components/classroom/tools/question-card-tool-body";
import { MatchingToolBody } from "@/components/classroom/tools/matching-tool-body";
import { SortingToolBody } from "@/components/classroom/tools/sorting-tool-body";
import { DragAndDropToolBody } from "@/components/classroom/tools/drag-and-drop-tool-body";
import { PeriodicTableToolBody } from "@/components/classroom/tools/periodic-table-tool-body";
import { DiagramsToolBody } from "@/components/classroom/tools/diagrams-tool-body";
import { WordCardsToolBody } from "@/components/classroom/tools/word-cards-tool-body";
import { TextToolsToolBody } from "@/components/classroom/tools/text-tools-tool-body";
import { CodingWorkspaceToolBody } from "@/components/classroom/tools/coding-workspace-tool-body";
import { GraphicDesignWorkspaceToolBody } from "@/components/classroom/tools/graphic-design-workspace-tool-body";

// A few tool bodies additionally need to know whether THIS viewer is the
// host (to split "tutor authors the activity" from "student responds to
// it" — a single `canEdit` boolean can't tell those apart, since a
// permitted student and the host both resolve to canEdit === true) and a
// stable per-viewer identity (to keep each student's own response separate
// in the shared state, per the Ensena Classroom group-permission model —
// see each tool body's own doc comment for its exact response shape).
function ToolBody({
  toolId,
  state,
  canEdit,
  isHost,
  selfName,
  onChange,
}: {
  toolId: TeachingToolId;
  state: Record<string, unknown>;
  canEdit: boolean;
  isHost: boolean;
  selfName: string;
  onChange: (state: Record<string, unknown>) => void;
}) {
  switch (toolId) {
    case "timer":
      return <TimerToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "stopwatch":
      return <StopwatchToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "random-picker":
      return <RandomPickerToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "number-line":
      return <NumberLineToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "coordinate-plane":
      return <CoordinatePlaneToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "fraction-circle":
      return <FractionCircleToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "clock":
      return <ClockToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "flashcards":
      return <FlashcardsToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "graph":
      return <GraphToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "ruler":
      return <RulerToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "protractor":
      return <ProtractorToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "compass":
      return <CompassToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "fraction-bar":
      return <FractionBarToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "geometry-shapes":
      return <GeometryShapesToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "bar-chart":
      return <BarChartToolBody state={state} canEdit={isHost} onChange={onChange} />;
    case "line-chart":
      return <LineChartToolBody state={state} canEdit={isHost} onChange={onChange} />;
    case "pie-chart":
      return <PieChartToolBody state={state} canEdit={isHost} onChange={onChange} />;
    case "number-chart":
      return <NumberChartToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "coordinate-grid":
      return <CoordinateGridToolBody state={state} canEdit={isHost} onChange={onChange} />;
    case "quiz":
      return <QuizToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "question-cards":
    case "language-questions":
      return <QuestionCardToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "matching":
      return <MatchingToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "sorting":
      return <SortingToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "drag-and-drop":
      return <DragAndDropToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "periodic-table":
      return <PeriodicTableToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "diagrams":
      return <DiagramsToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "word-cards":
      return <WordCardsToolBody state={state} isHost={isHost} canEdit={canEdit} onChange={onChange} />;
    case "text-tools":
      return <TextToolsToolBody state={state} canEdit={canEdit} onChange={onChange} />;
    case "coding-workspace":
      return <CodingWorkspaceToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    case "graphic-design-workspace":
      return <GraphicDesignWorkspaceToolBody state={state} isHost={isHost} canEdit={canEdit} selfName={selfName} onChange={onChange} />;
    default:
      return null;
  }
}

// Renders every active Teaching Tool instance as a real floating window
// positioned in the same scene space as the Excalidraw content beneath it
// — using Excalidraw's own public sceneCoordsToViewportCoords utility
// (rather than re-deriving the pan/zoom formula) so a tool visually stays
// "on the board" exactly like the rest of the drawing when the tutor pans
// or zooms.
export function ToolInstanceLayer({
  instances,
  appState,
  isHost,
  canEdit,
  selfName,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  instances: ToolInstance[];
  appState: Pick<AppState, "scrollX" | "scrollY" | "zoom">;
  /** Moving, resizing, duplicating and deleting an instance is host (tutor) board management, regardless of Student Can Draw — see use-classroom-tools.ts. */
  isHost: boolean;
  /** Whether the tutor currently has Student Can Draw on — combined per-instance with that tool's own `studentInteraction` flag to decide if THIS viewer can interact with THIS tool's content. */
  canEdit: boolean;
  /** This viewer's real display name — the stable per-viewer key a few activity tools (Quiz, Matching, Sorting, Drag and Drop, Question Cards) use to keep each student's own response separate in the shared state, since this app has no separate numeric user id to key by. */
  selfName: string;
  onUpdate: (id: string, patch: Partial<Omit<ToolInstance, "id">>, opts?: { live?: boolean }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const zoom = appState.zoom.value;
  const maxZ = instances.reduce((max, i) => Math.max(max, i.z), 0);

  return (
    <>
      {instances
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((instance) => {
          const { x: screenX, y: screenY } = sceneCoordsToViewportCoords(
            { sceneX: instance.x, sceneY: instance.y },
            { zoom: appState.zoom, offsetLeft: 0, offsetTop: 0, scrollX: appState.scrollX, scrollY: appState.scrollY }
          );
          const tool = findTeachingTool(instance.toolId as TeachingToolId);
          const canInteract = isHost || (canEdit && !!tool?.studentInteraction);

          return (
            <ToolCard
              key={instance.id}
              label={tool?.label ?? instance.toolId}
              screenX={screenX}
              screenY={screenY}
              screenWidth={instance.width * zoom}
              screenHeight={instance.height * zoom}
              zoom={zoom}
              canEdit={isHost}
              // Bringing a tool to front is a harmless per-viewer visual
              // convenience, not a content change — skipped rather than
              // denied for a student, so tapping to interact with a
              // permitted tool's content never surfaces a spurious "ask
              // your tutor" notice for something they were about to be
              // allowed to do anyway.
              onFocus={() => isHost && instance.z !== maxZ && onUpdate(instance.id, { z: maxZ + 1 })}
              onMove={(dx, dy) => onUpdate(instance.id, { x: instance.x + dx, y: instance.y + dy }, { live: true })}
              onResize={(dw, dh) => onUpdate(instance.id, { width: Math.max(140, instance.width + dw), height: Math.max(100, instance.height + dh) }, { live: true })}
              onDelete={() => onDelete(instance.id)}
              onDuplicate={() => onDuplicate(instance.id)}
            >
              <ToolBody
                toolId={instance.toolId as TeachingToolId}
                state={instance.state}
                canEdit={canInteract}
                isHost={isHost}
                selfName={selfName}
                onChange={(state) => onUpdate(instance.id, { state })}
              />
            </ToolCard>
          );
        })}
    </>
  );
}
