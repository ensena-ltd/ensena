"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createClassroomSyncTransport,
  type ClassroomParticipantRole,
  type ClassroomPresenceUser,
  type ClassroomSyncTransport,
  type ScenePayload,
  type WhiteboardPermissionEvent,
} from "@/lib/classroom-sync";
import {
  addWhiteboardBoard,
  DEFAULT_BOARD_KEY,
  getOrCreateRemoteClassroomSession,
  getWhiteboardBoard,
  getWhiteboardBoardOrder,
  getWhiteboardPermission,
  loadRemoteWhiteboardBoard,
  saveWhiteboardBoard,
  setRemoteStudentEditingEnabled,
  setWhiteboardPermission,
  type WhiteboardFile,
  type WhiteboardPermissionMode,
  type WhiteboardSceneData,
} from "@/lib/classroom-whiteboard-store";
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import { recordViolation } from "@/lib/moderation-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SaveStatus = "saved" | "saving";

// Real typed text on the whiteboard is exactly as much a prose channel as a
// chat message — and cheaper and more reliable to inspect than OCR, since
// Excalidraw already hands over the actual string rather than pixels (see
// the classroom contact-protection spec's own "if the whiteboard supports
// typed text, inspect that text directly" guidance). Only `type: "text"`
// elements carry prose; shapes/arrows/freehand strokes have no `.text` to
// extract, which keeps this cheap even on a busy board.
function extractWhiteboardText(elements: readonly unknown[]): string {
  return elements
    .filter((el): el is { type?: string; text?: string; isDeleted?: boolean } => typeof el === "object" && el !== null)
    .filter((el) => el.type === "text" && !el.isDeleted && typeof el.text === "string")
    .map((el) => el.text as string)
    .join(" \n ");
}

interface UseClassroomWhiteboardParams {
  classroomId: string;
  /** Seeds the FIRST board shown on mount only — once mounted, this hook owns which board is active (see `boardKey`/`switchBoard`/`addBoard` below) rather than reacting to this prop again, so a caller re-rendering with the same initial value never fights the hook's own page navigation. */
  boardKey?: string;
  role: ClassroomParticipantRole;
  selfName: string;
  subject: string;
  title: string;
  /** Called whenever a remote participant's change arrives — apply it to the local Excalidraw instance (e.g. excalidrawAPI.updateScene). */
  onRemoteScene: (scene: WhiteboardSceneData) => void;
  /** Called when a local text edit is blocked for containing prohibited contact information — show the same generic BLOCKED_MESSAGE_COPY the caller already shows elsewhere. The offending change is neither saved nor broadcast to the other participant; the local canvas is left as-is (the typist already knows what they wrote — nothing new is exposed by not force-erasing it). */
  /** See use-classroom-vision-safety.ts's doc on `highConfidence` — true only for a same-scan direct match. */
  onViolation?: (message: string, highConfidence: boolean) => void;
}

export interface UseClassroomWhiteboardResult {
  /** True until the initial scene has been resolved (local and, if configured, remote) — mount Excalidraw's initialData only once this is false. */
  loading: boolean;
  initialScene: WhiteboardSceneData;
  /** The currently active Page — a real, independent Excalidraw scene, distinct from every other boardKey in `boardOrder`. Give the rendered Excalidraw element `key={boardKey}` so switching pages forces a genuine remount with the new page's own `initialScene`, rather than Excalidraw silently ignoring a changed `initialData` prop on an already-mounted instance (Excalidraw only reads it once, at mount). */
  boardKey: string;
  /** Every Page that exists for this classroom, in creation order. */
  boardOrder: string[];
  /** Switches the active Page — flushes any pending debounced save for the page being left (so quick switching never drops the last few strokes), then loads the target page's own saved scene synchronously, updating `boardKey` and `initialScene` together in one render so the remount above never briefly shows stale content from the previous page. */
  switchBoard: (key: string) => void;
  /** Creates a brand-new, genuinely blank Page (never a clone of the current one — see addWhiteboardBoard in classroom-whiteboard-store.ts) and switches to it. */
  addBoard: () => void;
  /** Feed every local Excalidraw onChange through this — it debounces the broadcast + the autosave. `files` is Excalidraw's own onChange third argument (or api.getFiles()); omit only when nothing on the board could reference one (e.g. a Timer/Sticky Note insert). */
  handleLocalChange: (elements: readonly unknown[], appState: Record<string, unknown>, files?: WhiteboardFile[]) => void;
  saveStatus: SaveStatus;
  /** True once the sync transport itself is live (always true for BroadcastChannel; reflects real Supabase channel SUBSCRIBED state otherwise). */
  connected: boolean;
  /** Other participants currently present — never includes self. */
  presence: ClassroomPresenceUser[];
  /** The tutor's current whiteboard permission choice — Tutor Only / Everyone / Selected Students / Activity Mode. Real, synced state (see classroom-sync.ts's WhiteboardPermissionEvent), not a local-only toggle. */
  permissionMode: WhiteboardPermissionMode;
  selectedStudentNames: string[];
  setWhiteboardPermission: (mode: WhiteboardPermissionMode, selectedStudentNames: string[]) => void;
  /** Whether the CURRENT viewer may draw freely on the canvas — tutors always can; a student only per the current permission mode ("activity" mode deliberately excludes free drawing — see canInteractWithTools for that). */
  canDraw: boolean;
  /** Whether the CURRENT viewer may interact with a permitted Teaching Tool's own content (answer a Quiz, plot a point, etc.) — broader than canDraw, since "Activity Mode" allows this while blocking free drawing. */
  canInteractWithTools: boolean;
  /** Whether a real backend is actually persisting this board, vs. this-browser-only localStorage. */
  isBackendConnected: boolean;
}

const BROADCAST_DEBOUNCE_MS = 120;
const SAVE_DEBOUNCE_MS = 800;

export function useClassroomWhiteboard({
  classroomId,
  boardKey: initialBoardKey = DEFAULT_BOARD_KEY,
  role,
  selfName,
  subject,
  title,
  onRemoteScene,
  onViolation,
}: UseClassroomWhiteboardParams): UseClassroomWhiteboardResult {
  const [loading, setLoading] = useState(true);
  const [initialScene, setInitialScene] = useState<WhiteboardSceneData>({ elements: [], appState: {} });
  const [boardKey, setBoardKeyState] = useState(initialBoardKey);
  const [boardOrder, setBoardOrderState] = useState<string[]>(() => getWhiteboardBoardOrder(classroomId));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<ClassroomPresenceUser[]>([]);
  const [permissionMode, setPermissionModeState] = useState<WhiteboardPermissionMode>("everyone");
  const [selectedStudentNames, setSelectedStudentNamesState] = useState<string[]>([]);
  const [remoteSessionId, setRemoteSessionId] = useState<string | null>(null);

  const transportRef = useRef<ClassroomSyncTransport | null>(null);
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSceneRef = useRef<WhiteboardSceneData | null>(null);
  // The scene-broadcast subscription and the final-unmount save flush (both
  // below) are set up in effects that only re-run when classroomId changes
  // — not on every page switch — so they need a way to see the CURRENT
  // boardKey rather than whatever it was when they were created. Same
  // pattern use-classroom-tools.ts already uses for its own boardKeyRef.
  const boardKeyRef = useRef(boardKey);
  useEffect(() => {
    boardKeyRef.current = boardKey;
  });
  const onRemoteSceneRef = useRef(onRemoteScene);
  // A ref can't be written during render itself under React's stricter
  // purity rules — this keeps the "always call the latest onRemoteScene"
  // behavior of the old inline assignment, just deferred to after commit.
  useEffect(() => {
    onRemoteSceneRef.current = onRemoteScene;
  });
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  });
  // The last text content that already passed the safety check — avoids
  // re-running analyzeCommunication on every onChange when nothing about
  // the board's actual TEXT changed (a shape being dragged, a color
  // tweak), which is the overwhelming majority of onChange calls on a busy
  // board.
  const lastScannedTextRef = useRef<string>("");
  const actorRole = role === "tutor" ? "Tutor" : "Student";

  // Load the FIRST board shown once, on mount: local storage first (instant,
  // always available), then — if a real backend is connected — the remote
  // copy, which wins if present. Deliberately depends only on `classroomId`
  // — switching pages afterward goes through `switchBoard`/`addBoard` below,
  // which update `boardKey` and `initialScene` together in one synchronous
  // call instead of relying on this effect to react to a boardKey change
  // (that round-trip — commit with the new key first, load the real scene
  // one render later — is exactly what let a page-switch briefly/permanently
  // show the previous page's stale content, since Excalidraw's `initialData`
  // is a one-time-read prop and only remounting with the CORRECT data
  // already in hand actually fixes it).
  useEffect(() => {
    let cancelled = false;
    // Textbook "load from an external system on mount/dependency change" —
    // the react-hooks/set-state-in-effect rule flags any direct setState
    // here on principle, but there's no prop/state this can be derived
    // from instead: localStorage and (if configured) Supabase are external
    // systems this effect is genuinely synchronizing with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const localScene = getWhiteboardBoard(classroomId, boardKeyRef.current);
    setInitialScene(localScene);
    const localPermission = getWhiteboardPermission(classroomId);
    setPermissionModeState(localPermission.mode);
    setSelectedStudentNamesState(localPermission.selectedStudentNames);

    async function loadRemote() {
      const remote = await getOrCreateRemoteClassroomSession({ classroomId, subject, title, role });
      if (cancelled) return;
      if (remote) {
        setRemoteSessionId(remote.sessionId);
        // The remote schema only ever stored the old boolean — it's not
        // schema-aware of "selected"/"activity" yet (see this hook's own
        // permissionMode doc comment), so it's just written back to below,
        // never read back over the richer local/realtime value already set.
        const remoteScene = await loadRemoteWhiteboardBoard(remote.sessionId, boardKeyRef.current);
        if (!cancelled && remoteScene) setInitialScene(remoteScene);
      }
      if (!cancelled) setLoading(false);
    }

    if (isSupabaseConfigured()) {
      void loadRemote();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs when the classroom identity itself changes, not on every page switch (see comment above)
  }, [classroomId]);

  // Wire the sync transport (BroadcastChannel or Supabase Realtime,
  // decided once inside createClassroomSyncTransport) — separate effect
  // from the load above so a transient remote-load failure never tears
  // down an already-connected transport.
  useEffect(() => {
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    // Reads the transport's already-known connection state right after
    // creating it (synchronous for BroadcastChannel, and Supabase's own
    // channel starts unsubscribed until onConnectionChange fires) — genuine
    // synchronization with an external system, not derivable from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConnected(transport.isConnected());
    const unsubConnection = transport.onConnectionChange(setConnected);
    const unsubPresence = transport.onPresenceChange(setPresence);
    const unsubScene = transport.onRemoteSceneUpdate((payload: ScenePayload) => {
      // A classroom can have several whiteboard Pages sharing one transport
      // — a change made on a page the sender was viewing must never bleed
      // onto a DIFFERENT page a peer happens to be viewing right now (the
      // exact cross-page content bleed the Pages system exists to prevent).
      // Content for a page you're not currently on is still correctly
      // waiting for you in shared storage the moment you actually switch to
      // it (see switchBoard) — this only guards the live, in-memory canvas.
      if (payload.boardKey !== boardKeyRef.current) return;
      onRemoteSceneRef.current({ elements: payload.elements, appState: payload.appState, files: payload.files });
    });
    const unsubPermission = transport.onRemoteWhiteboardPermission((event: WhiteboardPermissionEvent) => {
      setPermissionModeState(event.mode);
      setSelectedStudentNamesState(event.selectedStudentNames);
      setWhiteboardPermission(classroomId, event.mode, event.selectedStudentNames);
    });

    transport.trackPresence({ role, name: selfName });

    return () => {
      unsubConnection();
      unsubPresence();
      unsubScene();
      unsubPermission();
      transport.disconnect();
      transportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- role/selfName are stable for the lifetime of one classroom visit
  }, [classroomId]);

  const handleLocalChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files?: WhiteboardFile[]) => {
      const currentText = extractWhiteboardText(elements);
      if (currentText !== lastScannedTextRef.current) {
        lastScannedTextRef.current = currentText;
        if (currentText.trim()) {
          const analysis = analyzeCommunication(currentText);
          if (analysis.verdict === "block" && analysis.primary) {
            recordViolation(selfName, actorRole, analysis.primary.category, analysis.primary.confidence, "Message", { evidence: currentText });
            onViolationRef.current?.(BLOCKED_MESSAGE_COPY, analysis.primary.confidence === "high");
            // Neither saved nor broadcast — the other participant never
            // sees it, and the board's persisted state doesn't advance past
            // the last safe version. The typist's own local canvas is left
            // alone (see the onViolation doc comment on why).
            return;
          }
        }
      }

      const scene: WhiteboardSceneData = { elements, appState, files };
      latestSceneRef.current = scene;

      if (broadcastTimer.current) clearTimeout(broadcastTimer.current);
      broadcastTimer.current = setTimeout(() => {
        transportRef.current?.broadcastSceneUpdate({ elements, appState, files, senderId: "", boardKey });
      }, BROADCAST_DEBOUNCE_MS);

      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveWhiteboardBoard(classroomId, boardKey, scene);
        setSaveStatus("saved");
      }, SAVE_DEBOUNCE_MS);
    },
    [classroomId, boardKey, selfName, actorRole]
  );

  const setWhiteboardPermissionMode = useCallback(
    (mode: WhiteboardPermissionMode, nextSelectedStudentNames: string[]) => {
      setPermissionModeState(mode);
      setSelectedStudentNamesState(nextSelectedStudentNames);
      setWhiteboardPermission(classroomId, mode, nextSelectedStudentNames);
      transportRef.current?.broadcastWhiteboardPermission({ mode, selectedStudentNames: nextSelectedStudentNames });
      // The remote schema only ever understood a plain boolean — "everyone"/
      // "activity" both map to "students can generally interact", matching
      // the closest legacy meaning; "selected"/"tutor-only" both map to
      // false, since the remote column has no concept of a specific allowlist.
      if (remoteSessionId) void setRemoteStudentEditingEnabled(remoteSessionId, mode === "everyone" || mode === "activity");
    },
    [classroomId, remoteSessionId]
  );

  // Flush any pending debounced save on unmount (leaving the classroom, or
  // navigating away) — otherwise the last few strokes before a quick exit
  // would sit only in the cleared timeout and never actually get saved.
  // Reads boardKeyRef (not the closed-over `boardKey`) since this effect's
  // own deps are intentionally empty — it must still save under whichever
  // page was ACTUALLY active at the moment of unmount, not whichever page
  // was active back when the hook first mounted.
  useEffect(() => {
    return () => {
      if (broadcastTimer.current) clearTimeout(broadcastTimer.current);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (latestSceneRef.current) saveWhiteboardBoard(classroomId, boardKeyRef.current, latestSceneRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classroomId read via closure is the same value this hook instance was created with; boardKey goes through the ref instead, see comment above
  }, []);

  // Flushes any pending debounced save for the page being left, so a quick
  // switch never drops the last few strokes — then loads the target page's
  // OWN saved scene and commits it together with the new boardKey in one
  // synchronous call. React batches both into a single render, so by the
  // time `<ExcalidrawCanvas key={boardKey}>` remounts (because its key just
  // changed), `initialScene` in that SAME render already holds the correct
  // page's content — never a stale flash of the page just left, and never
  // permanently stuck on it (Excalidraw ignores a changed `initialData` on
  // an already-mounted instance, so getting this right in one commit is
  // what actually makes a page switch behave like a genuinely independent
  // canvas rather than a shared one with a label on it).
  const switchBoard = useCallback(
    (key: string) => {
      if (key === boardKey) return;
      if (broadcastTimer.current) {
        clearTimeout(broadcastTimer.current);
        broadcastTimer.current = null;
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (latestSceneRef.current) saveWhiteboardBoard(classroomId, boardKey, latestSceneRef.current);
      }
      latestSceneRef.current = null;
      setInitialScene(getWhiteboardBoard(classroomId, key));
      setBoardKeyState(key);
      setSaveStatus("saved");
    },
    [classroomId, boardKey]
  );

  // A brand-new Page is always genuinely blank — never a clone of whichever
  // page was active when `+` was clicked (see addWhiteboardBoard's own doc
  // comment: that's what a future "Duplicate Page" feature would do
  // instead, not the default `+` action).
  const addBoard = useCallback(() => {
    if (broadcastTimer.current) {
      clearTimeout(broadcastTimer.current);
      broadcastTimer.current = null;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (latestSceneRef.current) saveWhiteboardBoard(classroomId, boardKey, latestSceneRef.current);
    }
    latestSceneRef.current = null;
    const newKey = addWhiteboardBoard(classroomId);
    setBoardOrderState(getWhiteboardBoardOrder(classroomId));
    setInitialScene({ elements: [], appState: {} });
    setBoardKeyState(newKey);
    setSaveStatus("saved");
  }, [classroomId, boardKey]);

  const isPermitted = role === "tutor" || permissionMode === "everyone" || (permissionMode === "selected" && selectedStudentNames.includes(selfName));

  return {
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
    setWhiteboardPermission: setWhiteboardPermissionMode,
    canDraw: isPermitted,
    // "Activity Mode" is the one case where these two diverge for a
    // student: free drawing is blocked, but interacting with a permitted
    // Teaching Tool's own content (answering a Quiz, plotting a point) still
    // works, since that's the entire point of the mode.
    canInteractWithTools: isPermitted || (role === "student" && permissionMode === "activity"),
    isBackendConnected: remoteSessionId !== null,
  };
}
