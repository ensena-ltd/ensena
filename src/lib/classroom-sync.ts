"use client";

// The one real-time transport behind the Ensena Classroom — whiteboard sync
// AND WebRTC video signaling both ride this same channel per classroomId,
// rather than opening a second connection. Picks its implementation once,
// at creation, based on whether a real Supabase project is connected
// (isSupabaseConfigured(), the exact same gate
// src/lib/supabase/require-role.ts already uses for auth):
//
//  - Supabase configured: Supabase Realtime (a channel per classroom,
//    Broadcast for scene updates, Presence for who's in the room). This is
//    genuine cross-device sync — a tutor's laptop and a student's laptop,
//    two different browsers entirely.
//
//  - Not configured: BroadcastChannel, a real browser API for same-origin
//    cross-tab messaging. This is genuinely real (not a mock/simulation) —
//    open the tutor's classroom in one tab and the student's in another tab
//    of the SAME browser and they collaborate live right now, with zero
//    backend. It just can't reach a second, different device, which
//    requires a server relay of some kind (Supabase Realtime, once
//    connected) — there is no way around that with browser storage alone.
//
// Both implementations satisfy the exact same ClassroomSyncTransport shape,
// so nothing above this file (use-classroom-whiteboard.ts) needs to know
// or care which one is active.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type ClassroomParticipantRole = "tutor" | "student";

export interface ClassroomPresenceUser {
  /** The transport's own per-tab id (same value as `selfId` below, from whichever tab tracked this presence entry) — lets a caller correlate a live presence/signaling participant with a specific WebRTC peer connection, which a name string alone can't do reliably (two people could share a display name; the id never collides). */
  id: string;
  role: ClassroomParticipantRole;
  name: string;
  /** Real mic/camera on/off, re-broadcast on every toggle (see
   * useGroupWebRTCMesh) — needed because a locally-disabled MediaStreamTrack
   * does NOT signal that state to the remote peer over WebRTC; the remote
   * side just keeps receiving (or stops receiving) frames with no flag to
   * read. Presence is the one existing broadcast this can piggyback on
   * rather than inventing a whole new signaling event for it. Optional
   * since a caller that never toggles either (private/counselling) has no
   * reason to supply them. */
  micOn?: boolean;
  camOn?: boolean;
}

// A minimal, transport-agnostic stand-in for Excalidraw's own BinaryFileData
// — this file deliberately doesn't depend on the Excalidraw package, so an
// uploaded worksheet's image data can ride the exact same scene broadcast/
// persistence path as everything else instead of needing a parallel channel.
export interface SceneFile {
  id: string;
  dataURL: string;
  mimeType: string;
  created: number;
}

export interface ScenePayload {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  /** Any images (e.g. an uploaded worksheet) referenced by `elements` — without this, a remote peer would receive an image element pointing at a fileId their own Excalidraw instance never registered, and render nothing. */
  files?: SceneFile[];
  senderId: string;
  /** Which whiteboard Page this scene change belongs to — a classroom can have several independent Pages sharing this one transport (see classroom-whiteboard-store.ts), and a receiver must only apply this to their live canvas when they're currently viewing the SAME page; otherwise it's exactly the cross-page content bleed the Pages system exists to prevent (mirrors ToolInstance.boardKey's own filtering, already used this same way for Teaching Tool events). */
  boardKey: string;
}

// WebRTC signaling messages (SDP offers/answers, ICE candidates) — opaque
// to this file, just relayed to whoever's listening. `targetId` lets a
// signal be addressed to one specific peer (needed once a room has more
// than two participants, e.g. a group class); undefined means "whoever
// receives this, it's for you" (the private-lesson / 1:1 case).
export interface WebRTCSignal {
  kind: "offer" | "answer" | "ice-candidate";
  data: unknown;
  targetId?: string;
}

// A real, positioned, stateful Teaching Tool placed on a whiteboard (a
// Timer, Number Line, Coordinate Plane, etc.) — see
// classroom-tool-instances-store.ts for persistence and
// use-classroom-tools.ts for the hook that owns this over its lifetime.
// Declared here (rather than only in the store) for the same reason
// SceneFile is: this file is the wire protocol every classroom participant
// agrees on, independent of Excalidraw or any particular tool's own logic.
export interface ToolInstance {
  id: string;
  toolId: string;
  boardKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Stacking order — the most recently touched instance renders on top. */
  z: number;
  /** Tool-specific data (e.g. a Timer's durationSec/startedAtMs, a Coordinate Plane's plotted points) — opaque to everything except that tool's own body component. */
  state: Record<string, unknown>;
  createdBy: ClassroomParticipantRole;
  updatedAtISO: string;
}

export type ToolEvent =
  | { kind: "created"; instance: ToolInstance }
  | { kind: "updated"; id: string; patch: Partial<Omit<ToolInstance, "id">> }
  | { kind: "deleted"; id: string };

// A student's screen share never starts on its own — see the Ensena
// Classroom host/participant model: the tutor is always the one who
// decides. This is the real, synced request/response, not local-only UI
// state — every participant's client (tutor's, in particular) hears the
// same event at the same time over the same shared transport everything
// else in this file already rides.
export interface ScreenShareRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  createdAtISO: string;
}

export type ScreenShareEvent =
  | { kind: "requested"; request: ScreenShareRequest }
  | { kind: "approved"; id: string }
  | { kind: "declined"; id: string }
  | { kind: "stopped"; id: string };

// A student's raised hand — real, synced presence rather than local-only
// UI state, so the tutor genuinely sees it the moment it happens (and every
// other student sees it lower again once the tutor acknowledges it), matching
// the Ensena Classroom host/participant model's own real-time requirements.
export type HandRaiseEvent =
  | { kind: "raised"; participantId: string; participantName: string }
  | { kind: "lowered"; participantId: string };

// The tutor's whiteboard permission choice — "Tutor Only" / "Everyone" /
// "Selected Students" / "Activity Mode" (see classroom-whiteboard-store.ts's
// own doc comment for what each means and what's persisted where). Real,
// synced state so every student's board immediately reflects the tutor's
// current choice, not just whoever refreshes next.
export interface WhiteboardPermissionEvent {
  mode: "tutor-only" | "everyone" | "selected" | "activity";
  selectedStudentNames: string[];
}

// A confirmed, high-confidence contact-sharing violation ends the session
// for BOTH participants, not just the violator's own client — the other
// participant's tab has no other way to learn this happened (moderation
// only ever inspects the LOCAL/outgoing camera, mic, and chat of whoever
// triggered it — see use-classroom-vision-safety.ts et al.), so this is a
// real, synced event over the same transport everything else here rides,
// not a local-only redirect. `message` is always the same generic,
// non-detection-revealing copy shown to both sides — never which pattern
// matched or which channel (camera/audio/chat/whiteboard) caught it.
export interface TerminationEvent {
  message: string;
}

// A chat message — real, synced delivery over the same shared transport as
// everything else here, so the other participant actually receives it the
// moment it's sent instead of only ever seeing their own decorative local
// copy (see classroom-chat-store.ts for the persisted-history half of this
// — that store is what survives a refresh; this event is what makes a
// message arrive on the OTHER participant's tab in the first place).
export interface ChatMessageEvent {
  id: string;
  sender: string;
  senderRole: "tutor" | "student";
  text: string;
  time: string;
}

export interface ClassroomSyncTransport {
  /** True once the underlying channel is actually connected (always true immediately for BroadcastChannel; awaits SUBSCRIBED for Supabase). */
  isConnected(): boolean;
  onConnectionChange(cb: (connected: boolean) => void): () => void;
  broadcastSceneUpdate(payload: ScenePayload): void;
  onRemoteSceneUpdate(cb: (payload: ScenePayload) => void): () => void;
  /** Callers never supply their own `id` — the transport attaches its own stable `selfId` before storing/broadcasting, so every existing caller (which only ever knew role/name) keeps working unchanged. */
  trackPresence(user: Omit<ClassroomPresenceUser, "id">): void;
  onPresenceChange(cb: (users: ClassroomPresenceUser[]) => void): () => void;
  /** Self's stable per-tab/session id — a WebRTC peer connection is keyed by this, so reconnects (a page refresh) are recognized as a new peer rather than confused with the old one. */
  selfId: string;
  sendSignal(signal: WebRTCSignal): void;
  onSignal(cb: (signal: WebRTCSignal, senderId: string) => void): () => void;
  sendToolEvent(event: ToolEvent): void;
  onToolEvent(cb: (event: ToolEvent) => void): () => void;
  sendScreenShareEvent(event: ScreenShareEvent): void;
  onScreenShareEvent(cb: (event: ScreenShareEvent) => void): () => void;
  sendHandRaiseEvent(event: HandRaiseEvent): void;
  onHandRaiseEvent(cb: (event: HandRaiseEvent) => void): () => void;
  broadcastWhiteboardPermission(event: WhiteboardPermissionEvent): void;
  onRemoteWhiteboardPermission(cb: (event: WhiteboardPermissionEvent) => void): () => void;
  sendTerminationEvent(event: TerminationEvent): void;
  onTerminationEvent(cb: (event: TerminationEvent) => void): () => void;
  sendChatEvent(event: ChatMessageEvent): void;
  onChatEvent(cb: (event: ChatMessageEvent) => void): () => void;
  disconnect(): void;
}

// A per-tab id so a sender never "receives" and re-applies its own
// broadcast — both transports include this on every message.
const SELF_ID = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);

type Message =
  | { type: "scene"; senderId: string; elements: readonly unknown[]; appState: Record<string, unknown>; files?: SceneFile[]; boardKey: string }
  | { type: "presence-join"; senderId: string; user: ClassroomPresenceUser }
  | { type: "presence-leave"; senderId: string }
  | { type: "signal"; senderId: string; signal: WebRTCSignal }
  | { type: "tool-event"; senderId: string; event: ToolEvent }
  | { type: "screen-share-event"; senderId: string; event: ScreenShareEvent }
  | { type: "hand-raise-event"; senderId: string; event: HandRaiseEvent }
  | { type: "whiteboard-permission"; senderId: string; event: WhiteboardPermissionEvent }
  | { type: "termination-event"; senderId: string; event: TerminationEvent }
  | { type: "chat-event"; senderId: string; event: ChatMessageEvent };

function createBroadcastChannelTransport(classroomId: string): ClassroomSyncTransport {
  const channel = new BroadcastChannel(`ensena-classroom:${classroomId}`);
  // Guards every send below against firing after disconnect() has already
  // closed the channel — a real, previously-unhandled race: several hooks
  // in ClassroomShellInner (whiteboard, WebRTC signaling, hand-raise,
  // screen-share, chat) all share this one transport via
  // createClassroomSyncTransport's refcounting, and a stray late send
  // (e.g. the beforeunload handler below, which used to stay registered
  // even after this exact channel closed) threw an uncaught
  // "Channel is closed" DOMException instead of silently no-op'ing, which
  // is what closing a channel should mean to everything still holding a
  // reference to it.
  let closed = false;
  function safePostMessage(message: Message): void {
    if (closed) return;
    try {
      channel.postMessage(message);
    } catch {
      // The channel can close between the `closed` check above and this
      // call in a genuine race (e.g. another tab/consumer's cleanup running
      // concurrently) — never let a best-effort presence/signal message
      // crash the caller.
    }
  }
  const sceneCallbacks = new Set<(payload: ScenePayload) => void>();
  const presenceCallbacks = new Set<(users: ClassroomPresenceUser[]) => void>();
  const signalCallbacks = new Set<(signal: WebRTCSignal, senderId: string) => void>();
  const toolEventCallbacks = new Set<(event: ToolEvent) => void>();
  const screenShareCallbacks = new Set<(event: ScreenShareEvent) => void>();
  const handRaiseCallbacks = new Set<(event: HandRaiseEvent) => void>();
  const whiteboardPermissionCallbacks = new Set<(event: WhiteboardPermissionEvent) => void>();
  const terminationCallbacks = new Set<(event: TerminationEvent) => void>();
  const chatCallbacks = new Set<(event: ChatMessageEvent) => void>();
  const presentById = new Map<string, ClassroomPresenceUser>();
  let selfUser: ClassroomPresenceUser | null = null;

  function emitPresence() {
    const users = Array.from(presentById.values());
    presenceCallbacks.forEach((cb) => cb(users));
  }

  channel.onmessage = (event: MessageEvent<Message>) => {
    const msg = event.data;
    if (msg.senderId === SELF_ID) return;
    if (msg.type === "scene") sceneCallbacks.forEach((cb) => cb({ elements: msg.elements, appState: msg.appState, files: msg.files, senderId: msg.senderId, boardKey: msg.boardKey }));
    else if (msg.type === "presence-join") {
      // Only a genuinely NEW sender gets the "let me tell you I'm here too"
      // reply below — re-announcing on every presence-join (including one
      // that's just an existing peer re-broadcasting an updated mic/camera
      // state, which trackPresence() now does on every toggle) would make
      // every tab's reply retrigger every OTHER tab's own reply forever: an
      // infinite presence ping-pong that never settles. This was silently
      // dormant before anything actually subscribed to presence changes on
      // an ongoing basis (see use-group-webrtc-mesh.ts, the first caller
      // that does) — nothing was there to notice the storm.
      const isNewSender = !presentById.has(msg.senderId);
      presentById.set(msg.senderId, msg.user);
      emitPresence();
      // Late joiners need to hear about tabs that were already here.
      if (isNewSender && selfUser) safePostMessage({ type: "presence-join", senderId: SELF_ID, user: selfUser });
    } else if (msg.type === "presence-leave") {
      presentById.delete(msg.senderId);
      emitPresence();
    } else if (msg.type === "signal") {
      if (!msg.signal.targetId || msg.signal.targetId === SELF_ID) signalCallbacks.forEach((cb) => cb(msg.signal, msg.senderId));
    } else if (msg.type === "tool-event") {
      toolEventCallbacks.forEach((cb) => cb(msg.event));
    } else if (msg.type === "screen-share-event") {
      screenShareCallbacks.forEach((cb) => cb(msg.event));
    } else if (msg.type === "hand-raise-event") {
      handRaiseCallbacks.forEach((cb) => cb(msg.event));
    } else if (msg.type === "whiteboard-permission") {
      whiteboardPermissionCallbacks.forEach((cb) => cb(msg.event));
    } else if (msg.type === "termination-event") {
      terminationCallbacks.forEach((cb) => cb(msg.event));
    } else if (msg.type === "chat-event") {
      chatCallbacks.forEach((cb) => cb(msg.event));
    }
  };

  // Removed on disconnect() below — previously registered once and left on
  // `window` forever, so a LATER page's beforeunload (or a delayed browser
  // navigation event) could still fire this closure and try to postMessage
  // on a channel this same transport had already closed.
  function handleBeforeUnload() {
    safePostMessage({ type: "presence-leave", senderId: SELF_ID });
  }
  window.addEventListener("beforeunload", handleBeforeUnload);

  return {
    isConnected: () => true,
    onConnectionChange: () => () => {},
    broadcastSceneUpdate: (payload) => safePostMessage({ type: "scene", senderId: SELF_ID, elements: payload.elements, appState: payload.appState, files: payload.files, boardKey: payload.boardKey }),
    onRemoteSceneUpdate: (cb) => {
      sceneCallbacks.add(cb);
      return () => sceneCallbacks.delete(cb);
    },
    trackPresence: (user) => {
      selfUser = { ...user, id: SELF_ID };
      safePostMessage({ type: "presence-join", senderId: SELF_ID, user: selfUser });
    },
    onPresenceChange: (cb) => {
      presenceCallbacks.add(cb);
      cb(Array.from(presentById.values()));
      return () => presenceCallbacks.delete(cb);
    },
    selfId: SELF_ID,
    sendSignal: (signal) => safePostMessage({ type: "signal", senderId: SELF_ID, signal }),
    onSignal: (cb) => {
      signalCallbacks.add(cb);
      return () => signalCallbacks.delete(cb);
    },
    sendToolEvent: (event) => safePostMessage({ type: "tool-event", senderId: SELF_ID, event }),
    onToolEvent: (cb) => {
      toolEventCallbacks.add(cb);
      return () => toolEventCallbacks.delete(cb);
    },
    sendScreenShareEvent: (event) => safePostMessage({ type: "screen-share-event", senderId: SELF_ID, event }),
    onScreenShareEvent: (cb) => {
      screenShareCallbacks.add(cb);
      return () => screenShareCallbacks.delete(cb);
    },
    sendHandRaiseEvent: (event) => safePostMessage({ type: "hand-raise-event", senderId: SELF_ID, event }),
    onHandRaiseEvent: (cb) => {
      handRaiseCallbacks.add(cb);
      return () => handRaiseCallbacks.delete(cb);
    },
    broadcastWhiteboardPermission: (event) => safePostMessage({ type: "whiteboard-permission", senderId: SELF_ID, event }),
    onRemoteWhiteboardPermission: (cb) => {
      whiteboardPermissionCallbacks.add(cb);
      return () => whiteboardPermissionCallbacks.delete(cb);
    },
    sendTerminationEvent: (event) => safePostMessage({ type: "termination-event", senderId: SELF_ID, event }),
    onTerminationEvent: (cb) => {
      terminationCallbacks.add(cb);
      return () => terminationCallbacks.delete(cb);
    },
    sendChatEvent: (event) => safePostMessage({ type: "chat-event", senderId: SELF_ID, event }),
    onChatEvent: (cb) => {
      chatCallbacks.add(cb);
      return () => chatCallbacks.delete(cb);
    },
    disconnect: () => {
      safePostMessage({ type: "presence-leave", senderId: SELF_ID });
      window.removeEventListener("beforeunload", handleBeforeUnload);
      closed = true;
      channel.close();
    },
  };
}

function createSupabaseRealtimeTransport(classroomId: string): ClassroomSyncTransport {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`classroom:${classroomId}`, { config: { broadcast: { self: false }, presence: { key: SELF_ID } } });
  const sceneCallbacks = new Set<(payload: ScenePayload) => void>();
  const presenceCallbacks = new Set<(users: ClassroomPresenceUser[]) => void>();
  const connectionCallbacks = new Set<(connected: boolean) => void>();
  const signalCallbacks = new Set<(signal: WebRTCSignal, senderId: string) => void>();
  const toolEventCallbacks = new Set<(event: ToolEvent) => void>();
  const screenShareCallbacks = new Set<(event: ScreenShareEvent) => void>();
  const handRaiseCallbacks = new Set<(event: HandRaiseEvent) => void>();
  const whiteboardPermissionCallbacks = new Set<(event: WhiteboardPermissionEvent) => void>();
  const terminationCallbacks = new Set<(event: TerminationEvent) => void>();
  const chatCallbacks = new Set<(event: ChatMessageEvent) => void>();
  let connected = false;
  let selfUser: ClassroomPresenceUser | null = null;

  function setConnected(next: boolean) {
    if (connected === next) return;
    connected = next;
    connectionCallbacks.forEach((cb) => cb(connected));
  }

  channel
    .on("broadcast", { event: "scene" }, ({ payload }) => {
      sceneCallbacks.forEach((cb) => cb(payload as ScenePayload));
    })
    .on("broadcast", { event: "signal" }, ({ payload }) => {
      const { signal, senderId } = payload as { signal: WebRTCSignal; senderId: string };
      if (!signal.targetId || signal.targetId === SELF_ID) signalCallbacks.forEach((cb) => cb(signal, senderId));
    })
    .on("broadcast", { event: "tool-event" }, ({ payload }) => {
      toolEventCallbacks.forEach((cb) => cb((payload as { event: ToolEvent }).event));
    })
    .on("broadcast", { event: "screen-share-event" }, ({ payload }) => {
      screenShareCallbacks.forEach((cb) => cb((payload as { event: ScreenShareEvent }).event));
    })
    .on("broadcast", { event: "hand-raise-event" }, ({ payload }) => {
      handRaiseCallbacks.forEach((cb) => cb((payload as { event: HandRaiseEvent }).event));
    })
    .on("broadcast", { event: "whiteboard-permission" }, ({ payload }) => {
      whiteboardPermissionCallbacks.forEach((cb) => cb((payload as { event: WhiteboardPermissionEvent }).event));
    })
    .on("broadcast", { event: "termination-event" }, ({ payload }) => {
      terminationCallbacks.forEach((cb) => cb((payload as { event: TerminationEvent }).event));
    })
    .on("broadcast", { event: "chat-event" }, ({ payload }) => {
      chatCallbacks.forEach((cb) => cb((payload as { event: ChatMessageEvent }).event));
    })
    .on("presence", { event: "sync" }, () => {
      // The presence state's own outer key IS each tracked client's id
      // (config: { presence: { key: SELF_ID } } below) — more authoritative
      // than trusting an `id` field inside the tracked payload itself.
      const state = channel.presenceState<ClassroomPresenceUser>();
      const users = Object.entries(state).flatMap(([id, entries]) => entries.map((e) => ({ id, role: e.role, name: e.name })));
      presenceCallbacks.forEach((cb) => cb(users));
    })
    .subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED" && selfUser) channel.track(selfUser);
    });

  return {
    isConnected: () => connected,
    onConnectionChange: (cb) => {
      connectionCallbacks.add(cb);
      return () => connectionCallbacks.delete(cb);
    },
    broadcastSceneUpdate: (payload) => {
      channel.send({ type: "broadcast", event: "scene", payload });
    },
    onRemoteSceneUpdate: (cb) => {
      sceneCallbacks.add(cb);
      return () => sceneCallbacks.delete(cb);
    },
    trackPresence: (user) => {
      selfUser = { ...user, id: SELF_ID };
      if (connected) channel.track(selfUser);
    },
    onPresenceChange: (cb) => {
      presenceCallbacks.add(cb);
      return () => presenceCallbacks.delete(cb);
    },
    selfId: SELF_ID,
    sendSignal: (signal) => {
      channel.send({ type: "broadcast", event: "signal", payload: { signal, senderId: SELF_ID } });
    },
    onSignal: (cb) => {
      signalCallbacks.add(cb);
      return () => signalCallbacks.delete(cb);
    },
    sendToolEvent: (event) => {
      channel.send({ type: "broadcast", event: "tool-event", payload: { event, senderId: SELF_ID } });
    },
    onToolEvent: (cb) => {
      toolEventCallbacks.add(cb);
      return () => toolEventCallbacks.delete(cb);
    },
    sendScreenShareEvent: (event) => {
      channel.send({ type: "broadcast", event: "screen-share-event", payload: { event, senderId: SELF_ID } });
    },
    onScreenShareEvent: (cb) => {
      screenShareCallbacks.add(cb);
      return () => screenShareCallbacks.delete(cb);
    },
    sendHandRaiseEvent: (event) => {
      channel.send({ type: "broadcast", event: "hand-raise-event", payload: { event, senderId: SELF_ID } });
    },
    onHandRaiseEvent: (cb) => {
      handRaiseCallbacks.add(cb);
      return () => handRaiseCallbacks.delete(cb);
    },
    broadcastWhiteboardPermission: (event) => {
      channel.send({ type: "broadcast", event: "whiteboard-permission", payload: { event, senderId: SELF_ID } });
    },
    onRemoteWhiteboardPermission: (cb) => {
      whiteboardPermissionCallbacks.add(cb);
      return () => whiteboardPermissionCallbacks.delete(cb);
    },
    sendTerminationEvent: (event) => {
      channel.send({ type: "broadcast", event: "termination-event", payload: { event, senderId: SELF_ID } });
    },
    onTerminationEvent: (cb) => {
      terminationCallbacks.add(cb);
      return () => terminationCallbacks.delete(cb);
    },
    sendChatEvent: (event) => {
      channel.send({ type: "broadcast", event: "chat-event", payload: { event, senderId: SELF_ID } });
    },
    onChatEvent: (cb) => {
      chatCallbacks.add(cb);
      return () => chatCallbacks.delete(cb);
    },
    disconnect: () => {
      supabase.removeChannel(channel);
    },
  };
}

// Reference-counted per classroomId: the whiteboard hook and the WebRTC
// video hook both need signaling/presence on the SAME logical connection,
// not two independent BroadcastChannel/Supabase-channel instances racing
// each other. First caller for a given classroomId actually creates the
// transport; later callers (for the same id) get the identical instance
// back with the refcount bumped. The underlying connection only tears down
// once every caller has disconnected.
const sharedTransports = new Map<string, { transport: ClassroomSyncTransport; refCount: number }>();

export function createClassroomSyncTransport(classroomId: string): ClassroomSyncTransport {
  const existing = sharedTransports.get(classroomId);
  if (existing) {
    existing.refCount += 1;
    return wrapWithRefcountedDisconnect(classroomId, existing.transport);
  }

  const real = isSupabaseConfigured() ? createSupabaseRealtimeTransport(classroomId) : createBroadcastChannelTransport(classroomId);
  sharedTransports.set(classroomId, { transport: real, refCount: 1 });
  return wrapWithRefcountedDisconnect(classroomId, real);
}

// Each caller gets its own disconnect() so calling it doesn't tear down the
// connection out from under a sibling hook still using it — only the last
// one out actually closes the channel.
function wrapWithRefcountedDisconnect(classroomId: string, real: ClassroomSyncTransport): ClassroomSyncTransport {
  let released = false;
  return {
    ...real,
    disconnect: () => {
      if (released) return;
      released = true;
      const entry = sharedTransports.get(classroomId);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        sharedTransports.delete(classroomId);
        real.disconnect();
      }
    },
  };
}
