"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClassroomSyncTransport, type ClassroomParticipantRole, type ClassroomSyncTransport, type ToolEvent, type ToolInstance } from "@/lib/classroom-sync";
import { getToolInstances, saveToolInstances } from "@/lib/classroom-tool-instances-store";
import { findTeachingTool, type TeachingToolId } from "@/lib/classroom-teaching-tools";

const PERSIST_DEBOUNCE_MS = 400;
const MOVE_BROADCAST_DEBOUNCE_MS = 80;

export interface UseClassroomToolsResult {
  instances: ToolInstance[];
  /** Places a brand-new tool instance on the board — denied (via onDenied) if the caller can't currently edit. */
  createInstance: (toolId: string, init: { x: number; y: number; width: number; height: number; state: Record<string, unknown> }) => void;
  /** Merges a partial update (position, size, or tool-specific state) into an existing instance. `live` marks a high-frequency update (dragging/resizing) that should be debounced rather than broadcast on every pixel. */
  updateInstance: (id: string, patch: Partial<Omit<ToolInstance, "id">>, opts?: { live?: boolean }) => void;
  deleteInstance: (id: string) => void;
  duplicateInstance: (id: string) => void;
}

// Owns the set of Teaching Tool instances (Timer, Number Line, Coordinate
// Plane, ...) placed on one whiteboard — the tool-equivalent of
// use-classroom-whiteboard.ts's role for Excalidraw's own scene. Shares the
// SAME ref-counted transport (createClassroomSyncTransport already returns
// the one live channel for this classroomId, whichever hook asks first),
// so this adds zero extra connections beyond what the whiteboard/video
// hooks already opened.
export function useClassroomTools({
  classroomId,
  boardKey,
  role,
  canEdit,
  onDenied,
}: {
  classroomId: string;
  boardKey: string;
  role: ClassroomParticipantRole;
  /** Whether the tutor currently has Student Can Draw on — the same flag the whiteboard itself uses. Only relevant to a student's ability to interact with an EXISTING tool's own content (e.g. plotting a point); creating, moving, resizing and deleting a tool instance is a host action, full stop, regardless of this flag — see the Ensena Classroom host/participant permission model. */
  canEdit: boolean;
  onDenied?: () => void;
}): UseClassroomToolsResult {
  const [instances, setInstances] = useState<ToolInstance[]>([]);
  const transportRef = useRef<ClassroomSyncTransport | null>(null);
  const persistTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const broadcastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const instancesRef = useRef<ToolInstance[]>([]);
  // The transport-subscription effect below only re-runs when classroomId
  // changes (switching boards must NOT tear down/recreate the shared
  // channel) — this ref is what lets its onToolEvent closure always see
  // the CURRENT board rather than the one that was active when the effect
  // last ran. Written in a bare (no-deps) effect rather than during render
  // itself, per React's ref-purity rule — same pattern already used for
  // use-classroom-whiteboard.ts's onRemoteSceneRef.
  const boardKeyRef = useRef(boardKey);
  useEffect(() => {
    instancesRef.current = instances;
    boardKeyRef.current = boardKey;
  });

  // Load whatever was already on this board (survives refresh/reconnect,
  // and is there again if the lesson is reopened later) — see the doc
  // comment on classroom-tool-instances-store.ts for what this does and
  // does not persist to yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading persisted state from localStorage on board change is a genuine external-system read, not derivable from props
    setInstances(getToolInstances(classroomId, boardKey));
  }, [classroomId, boardKey]);

  useEffect(() => {
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    const unsub = transport.onToolEvent((event: ToolEvent) => {
      // A classroom can have multiple whiteboard pages ("Board 1", "Board
      // 2", ...) sharing one transport — a create meant for a different
      // page than the one currently open here must not leak into this
      // page's rendered instances. Updates/deletes need no extra check:
      // if the matching create was correctly filtered out, `id` simply
      // won't exist locally and the map/filter below is a no-op.
      if (event.kind === "created") {
        if (event.instance.boardKey !== boardKeyRef.current) return;
        setInstances((prev) => (prev.some((i) => i.id === event.instance.id) ? prev : [...prev, event.instance]));
      } else if (event.kind === "updated") {
        setInstances((prev) => prev.map((i) => (i.id === event.id ? { ...i, ...event.patch } : i)));
      } else if (event.kind === "deleted") {
        setInstances((prev) => prev.filter((i) => i.id !== event.id));
      }
    });

    return () => {
      unsub();
      transport.disconnect();
      transportRef.current = null;
    };
  }, [classroomId]);

  const persist = useCallback(() => {
    saveToolInstances(classroomId, boardKey, instancesRef.current);
  }, [classroomId, boardKey]);

  // Tutor = host, always allowed. A student's own board-management
  // capability (create/move/resize/delete a tool instance) does not exist
  // at all — turning on "Student Can Draw" only ever grants interacting
  // with an existing tool's own content, per the Classroom's host/
  // participant role model.
  const isHost = role === "tutor";

  const createInstance = useCallback(
    (toolId: string, init: { x: number; y: number; width: number; height: number; state: Record<string, unknown> }) => {
      if (!isHost) {
        onDenied?.();
        return;
      }
      const maxZ = instancesRef.current.reduce((max, i) => Math.max(max, i.z), 0);
      const instance: ToolInstance = {
        id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        toolId,
        boardKey,
        x: init.x,
        y: init.y,
        width: init.width,
        height: init.height,
        z: maxZ + 1,
        state: init.state,
        createdBy: role,
        updatedAtISO: new Date().toISOString(),
      };
      setInstances((prev) => [...prev, instance]);
      transportRef.current?.sendToolEvent({ kind: "created", instance });
      window.setTimeout(persist, 0);
    },
    [isHost, onDenied, role, boardKey, persist]
  );

  const updateInstance = useCallback(
    (id: string, patch: Partial<Omit<ToolInstance, "id">>, opts?: { live?: boolean }) => {
      // Moving/resizing/reordering the instance itself is host-only board
      // management; only a change to the tool's own `state` can ever be a
      // student's doing, and only when that specific tool declares
      // studentInteraction and the tutor has Student Can Draw on.
      const isStructural = "x" in patch || "y" in patch || "width" in patch || "height" in patch || "z" in patch;
      if (!isHost) {
        if (isStructural) {
          onDenied?.();
          return;
        }
        const instance = instancesRef.current.find((i) => i.id === id);
        const toolDef = instance ? findTeachingTool(instance.toolId as TeachingToolId) : undefined;
        if (!canEdit || !toolDef?.studentInteraction) {
          onDenied?.();
          return;
        }
      }
      const fullPatch = { ...patch, updatedAtISO: new Date().toISOString() };
      setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, ...fullPatch } : i)));

      const existingBroadcast = broadcastTimers.current.get(id);
      if (existingBroadcast) clearTimeout(existingBroadcast);
      broadcastTimers.current.set(
        id,
        setTimeout(
          () => {
            transportRef.current?.sendToolEvent({ kind: "updated", id, patch: fullPatch });
          },
          opts?.live ? MOVE_BROADCAST_DEBOUNCE_MS : 0
        )
      );

      const existingPersist = persistTimers.current.get(id);
      if (existingPersist) clearTimeout(existingPersist);
      persistTimers.current.set(id, setTimeout(persist, PERSIST_DEBOUNCE_MS));
    },
    [isHost, canEdit, onDenied, persist]
  );

  const deleteInstance = useCallback(
    (id: string) => {
      if (!isHost) {
        onDenied?.();
        return;
      }
      setInstances((prev) => prev.filter((i) => i.id !== id));
      transportRef.current?.sendToolEvent({ kind: "deleted", id });
      window.setTimeout(persist, 0);
    },
    [isHost, onDenied, persist]
  );

  const duplicateInstance = useCallback(
    (id: string) => {
      const source = instancesRef.current.find((i) => i.id === id);
      if (!source) return;
      createInstance(source.toolId, { x: source.x + 24, y: source.y + 24, width: source.width, height: source.height, state: { ...source.state } });
    },
    [createInstance]
  );

  // Flush any pending debounced persistence on unmount, same reasoning as
  // the whiteboard's own equivalent cleanup — otherwise the last drag
  // before quickly leaving the room never actually gets saved.
  useEffect(() => {
    return () => {
      persistTimers.current.forEach((t) => clearTimeout(t));
      broadcastTimers.current.forEach((t) => clearTimeout(t));
      saveToolInstances(classroomId, boardKey, instancesRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classroomId/boardKey read via closure are the same values this hook instance was created with
  }, []);

  return { instances, createInstance, updateInstance, deleteInstance, duplicateInstance };
}
